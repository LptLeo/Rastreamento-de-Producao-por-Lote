import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import { PerfilUsuario } from '../../entities/Usuario.js';

type JestMock = ReturnType<typeof jest.fn>;

const mockQueryBuilder = {
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getOne: jest.fn(() => Promise.resolve(null as unknown)),
};

const mockUserRepo = {
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
  findOne: jest.fn(() => Promise.resolve(null as unknown)),
  update: jest.fn(() => Promise.resolve({} as unknown)),
};

jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => mockUserRepo),
  },
}));

const mockBcrypt = {
  compare: jest.fn(() => Promise.resolve(true)),
  hash: jest.fn(() => Promise.resolve('hashed_value')),
};

jest.unstable_mockModule('bcrypt', () => ({
  default: mockBcrypt,
}));

const mockJwt = {
  sign: jest.fn(() => 'mock_token'),
  verify: jest.fn(() => ({ id: 1 })),
};

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: mockJwt,
}));

const { AuthService } = await import('../auth.service.js');

describe('AuthService', () => {
  let service: InstanceType<typeof AuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test_secret';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
    process.env.JWT_EXPIRATION = '15m';
    process.env.JWT_REFRESH_EXPIRATION = '7d';
    process.env.JWT_SALT = '10';
    service = new AuthService();
  });

  describe('login()', () => {
    const credenciais = { email: 'test@lotepim.com', senha: 'password123' };

    it('deve lançar AppError se o usuário não for encontrado', async () => {
      (mockQueryBuilder.getOne as JestMock).mockResolvedValue(null);

      await expect(service.login(credenciais)).rejects.toThrow(AppError);
      await expect(service.login(credenciais)).rejects.toThrow('E-mail ou senha incorretos.');
    });

    it('deve lançar AppError se o usuário estiver inativo', async () => {
      (mockQueryBuilder.getOne as JestMock).mockResolvedValue({ ativo: false });

      await expect(service.login(credenciais)).rejects.toThrow(AppError);
      await expect(service.login(credenciais)).rejects.toThrow('Este usuário está desativado.');
    });

    it('deve lançar AppError se a senha estiver incorreta', async () => {
      (mockQueryBuilder.getOne as JestMock).mockResolvedValue({
        id: 1,
        ativo: true,
        senha_hash: 'hash_real',
      });
      (mockBcrypt.compare as JestMock).mockResolvedValue(false);

      await expect(service.login(credenciais)).rejects.toThrow('E-mail ou senha incorretos.');
    });

    it('deve retornar tokens de acesso e atualização se credenciais forem válidas', async () => {
      const usuarioMock = {
        id: 1,
        nome: 'Admin',
        email: 'test@lotepim.com',
        perfil: PerfilUsuario.GESTOR,
        ativo: true,
        senha_hash: 'hash_real',
      };

      (mockQueryBuilder.getOne as JestMock).mockResolvedValue(usuarioMock);
      (mockBcrypt.compare as JestMock).mockResolvedValue(true);

      const resultado = await service.login(credenciais);

      expect(resultado).toEqual({
        tokenAcesso: 'mock_token',
        tokenAtualizacao: 'mock_token',
      });

      expect(mockUserRepo.update).toHaveBeenCalledWith(1, {
        refresh_token: 'hashed_value',
      });
    });
  });

  describe('refresh()', () => {
    it('deve lançar erro se o refresh token não for fornecido', async () => {
      await expect(service.refresh('')).rejects.toThrow('Refresh token não fornecido.');
    });

    it('deve renovar os tokens se o refresh token for válido e o usuário estiver ativo', async () => {
      (mockJwt.verify as JestMock).mockReturnValue({ id: 1 });
      (mockUserRepo.findOne as JestMock).mockResolvedValue({
        id: 1,
        ativo: true,
        refresh_token: 'hash_token_banco',
      });
      (mockBcrypt.compare as JestMock).mockResolvedValue(true);

      const resultado = await service.refresh('token_enviado');

      expect(resultado).toEqual({
        tokenAcesso: 'mock_token',
        tokenAtualizacao: 'mock_token',
      });
    });

    it('deve lançar erro se o token no banco não bater com o enviado', async () => {
      (mockJwt.verify as JestMock).mockReturnValue({ id: 1 });
      (mockUserRepo.findOne as JestMock).mockResolvedValue({
        id: 1,
        ativo: true,
        refresh_token: 'hash_diferente',
      });
      (mockBcrypt.compare as JestMock).mockResolvedValue(false);

      await expect(service.refresh('token_enviado')).rejects.toThrow(
        'Token de atualização inválido.',
      );
    });
  });

  describe('logout()', () => {
    it('deve invalidar o refresh token no banco de dados', async () => {
      await service.logout(1);
      expect(mockUserRepo.update).toHaveBeenCalledWith(1, { refresh_token: null });
    });
  });
});
