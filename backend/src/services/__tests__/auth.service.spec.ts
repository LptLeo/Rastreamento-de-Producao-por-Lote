import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';

const mockUserRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn()
};

const mockQueryBuilder = {
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getOne: jest.fn()
};

mockUserRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

const mockBcrypt = {
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed_token' as never)
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mocked_token' as never),
  verify: jest.fn()
};

jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => mockUserRepo)
  }
}));

jest.unstable_mockModule('bcrypt', () => ({
  default: mockBcrypt
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: mockJwt
}));

const { AuthService } = await import('../auth.service.js');

describe('AuthService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService();
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_REFRESH_SECRET = 'refresh_secret';
  });

  describe('login', () => {
    it('deve lançar erro se o email não for encontrado', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.login({ email: 'teste@teste.com', senha: '123' })).rejects.toThrow(AppError);
      await expect(service.login({ email: 'teste@teste.com', senha: '123' })).rejects.toThrow('E-mail ou senha incorretos.');
    });

    it('deve lançar erro se o usuário estiver inativo', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ ativo: false });

      await expect(service.login({ email: 'teste@teste.com', senha: '123' })).rejects.toThrow(AppError);
      await expect(service.login({ email: 'teste@teste.com', senha: '123' })).rejects.toThrow('Este usuário está desativado.');
    });

    it('deve lançar erro se a senha for inválida', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ ativo: true, senha_hash: 'hash' });
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login({ email: 'teste@teste.com', senha: '123' })).rejects.toThrow(AppError);
      await expect(service.login({ email: 'teste@teste.com', senha: '123' })).rejects.toThrow('E-mail ou senha incorretos.');
    });

    it('deve retornar tokens se o login for bem-sucedido', async () => {
      const usuarioMock = { id: 1, nome: 'Teste', email: 'teste@teste.com', perfil: 'operador', ativo: true, senha_hash: 'hash' };
      mockQueryBuilder.getOne.mockResolvedValue(usuarioMock);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.login({ email: 'teste@teste.com', senha: '123' });

      expect(result.tokenAcesso).toBe('mocked_token');
      expect(result.tokenAtualizacao).toBe('mocked_token');
      expect(result.usuario.id).toBe(1);
    });
  });
});
