import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import { PerfilUsuario } from '../../entities/Usuario.js';

const mockUserRepo = { 
  findOne: jest.fn(), 
  findOneBy: jest.fn(), 
  create: jest.fn(), 
  save: jest.fn(), 
  createQueryBuilder: jest.fn() 
};
const mockLoteRepo = { count: jest.fn() };
const mockInspecaoRepo = { count: jest.fn() };
const mockProdutoRepo = { count: jest.fn() };

const mockAppDataSource = {
  getRepository: jest.fn((entity: any) => {
    if (entity.name === 'Usuario' || entity === 'Usuario') return mockUserRepo;
    if (entity.name === 'Lote' || entity === 'Lote') return mockLoteRepo;
    if (entity.name === 'Inspecao' || entity === 'Inspecao') return mockInspecaoRepo;
    if (entity.name === 'Produto' || entity === 'Produto') return mockProdutoRepo;
    return {} as any;
  })
};

const mockBcrypt = {
  hash: jest.fn().mockResolvedValue('hashed_pass' as never),
  compare: jest.fn()
};

jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: mockAppDataSource
}));

jest.unstable_mockModule('bcrypt', () => ({
  default: mockBcrypt
}));

const { UsuarioService } = await import('../usuario.service.js');

describe('UsuarioService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsuarioService();
  });

  describe('findById', () => {
    it('deve lançar erro se o usuário não for encontrado', async () => {
      mockUserRepo.findOne.mockResolvedValue(null as never);
      await expect(service.findById(1, { id: 1, perfil: PerfilUsuario.GESTOR })).rejects.toThrow('Usuário não encontrado');
    });

    it('deve retornar o usuário se encontrado e tiver permissão', async () => {
      const userMock = { id: 1, nome: 'Teste', email: 't@t.com', ativo: true };
      mockUserRepo.findOne.mockResolvedValue(userMock as never);
      const result = await service.findById(1, { id: 1, perfil: PerfilUsuario.GESTOR });
      expect(result.nome).toBe('Teste');
    });
  });

  describe('create', () => {
    const dto = { nome: 'Novo', email: 'novo@t.com', senha: '123', perfil: PerfilUsuario.OPERADOR, ativo: true };
    const req = { id: 1, perfil: PerfilUsuario.GESTOR };

    it('deve lançar erro se o e-mail já estiver em uso', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 2 } as never);
      await expect(service.create(dto as any, req)).rejects.toThrow(/já está em uso/);
    });

    it('deve criar e salvar o novo usuário', async () => {
      mockUserRepo.findOne.mockResolvedValue(null as never);
      mockUserRepo.findOneBy.mockResolvedValue({ id: 1, nome: 'Admin' } as never);
      mockUserRepo.create.mockReturnValue({ ...dto, id: 10 } as never);
      mockUserRepo.save.mockResolvedValue({ ...dto, id: 10 } as never);

      const result = await service.create(dto as any, req);
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
        getOne: jest.fn().mockResolvedValue({ id: 1, senha_hash: 'hash' })
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.updateSenha(1, dto, req)).rejects.toThrow('Senha atual incorreta');
    });

    it('deve atualizar a senha se a atual estiver correta', async () => {
      const userMock = { id: 1, senha_hash: 'old_hash' };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(userMock)
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockBcrypt.compare.mockResolvedValue(true as never);

      await service.updateSenha(1, dto, req);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('456', 12);
      expect(mockUserRepo.save).toHaveBeenCalled();
    });
  });
});
