import { jest } from '@jest/globals';
import { PerfilUsuario } from '../../entities/Usuario.js';

type JestMock = ReturnType<typeof jest.fn>;

const mockUserRepo = {
  findOne: jest.fn(() => Promise.resolve(null as unknown)),
  findOneBy: jest.fn(() => Promise.resolve(null as unknown)),
  create: jest.fn((d: unknown) => d),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
  createQueryBuilder: jest.fn(() => ({})),
};

const mockLoteRepo = { count: jest.fn(() => Promise.resolve(0)) };
const mockInspecaoRepo = { count: jest.fn(() => Promise.resolve(0)) };
const mockProdutoRepo = { count: jest.fn(() => Promise.resolve(0)) };

const mockAppDataSource = {
  getRepository: jest.fn((entity: { name: string }) => {
    if (entity.name === 'Usuario') return mockUserRepo;
    if (entity.name === 'Lote') return mockLoteRepo;
    if (entity.name === 'Inspecao') return mockInspecaoRepo;
    if (entity.name === 'Produto') return mockProdutoRepo;
    return {};
  }),
};

const mockBcrypt = {
  hash: jest.fn(() => Promise.resolve('hashed_pass')),
  compare: jest.fn(() => Promise.resolve(true)),
};

jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: mockAppDataSource,
}));

jest.unstable_mockModule('bcrypt', () => ({
  default: mockBcrypt,
}));

const { UsuarioService } = await import('../usuario.service.js');

describe('UsuarioService', () => {
  let service: InstanceType<typeof UsuarioService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsuarioService();
  });

  describe('findById', () => {
    it('deve lançar erro se o usuário não for encontrado', async () => {
      (mockUserRepo.findOne as JestMock).mockResolvedValue(null);
      await expect(service.findById(1, { id: 1, perfil: PerfilUsuario.GESTOR })).rejects.toThrow(
        'Usuário não encontrado',
      );
    });

    it('deve retornar o usuário se encontrado e tiver permissão', async () => {
      const userMock = { id: 1, nome: 'Teste', email: 't@t.com', ativo: true };
      (mockUserRepo.findOne as JestMock).mockResolvedValue(userMock);

      const result = await service.findById(1, { id: 1, perfil: PerfilUsuario.GESTOR });

      expect(result.nome).toBe('Teste');
    });
  });

  describe('create', () => {
    const dto = {
      nome: 'Novo',
      email: 'novo@t.com',
      senha: '123',
      perfil: PerfilUsuario.OPERADOR,
      ativo: true,
    };
    const req = { id: 1, perfil: PerfilUsuario.GESTOR };

    it('deve lançar erro se o e-mail já estiver em uso', async () => {
      (mockUserRepo.findOne as JestMock).mockResolvedValue({ id: 2 });

      await expect(service.create(dto, req)).rejects.toThrow(/já está em uso/);
    });

    it('deve criar e salvar o novo usuário', async () => {
      (mockUserRepo.findOne as JestMock).mockResolvedValue(null);
      (mockUserRepo.findOneBy as JestMock).mockResolvedValue({ id: 1, nome: 'Admin' });
      (mockUserRepo.create as JestMock).mockReturnValue({ ...dto, id: 10 });
      (mockUserRepo.save as JestMock).mockResolvedValue({ ...dto, id: 10 });

      const result = await service.create(dto, req);

      expect(result.id).toBe(10);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('123', 12);
      expect(mockUserRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateSenha', () => {
    const dto = { senha_atual: '123', nova_senha: '456' };
    const req = { id: 1, perfil: PerfilUsuario.OPERADOR };

    it('deve lançar erro se a senha atual estiver incorreta', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn(() => Promise.resolve({ id: 1, senha_hash: 'hash' })),
      };
      (mockUserRepo.createQueryBuilder as JestMock).mockReturnValue(mockQueryBuilder);
      (mockBcrypt.compare as JestMock).mockResolvedValue(false);

      await expect(service.updateSenha(1, dto, req)).rejects.toThrow('Senha atual incorreta');
    });

    it('deve atualizar a senha se a atual estiver correta', async () => {
      const userMock = { id: 1, senha_hash: 'old_hash' };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn(() => Promise.resolve(userMock)),
      };
      (mockUserRepo.createQueryBuilder as JestMock).mockReturnValue(mockQueryBuilder);
      (mockBcrypt.compare as JestMock).mockResolvedValue(true);

      await service.updateSenha(1, dto, req);

      expect(mockBcrypt.hash).toHaveBeenCalledWith('456', 12);
      expect(mockUserRepo.save).toHaveBeenCalled();
    });
  });
});
