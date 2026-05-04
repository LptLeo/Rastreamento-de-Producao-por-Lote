import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import { PerfilUsuario } from '../../entities/Usuario.js';

const mockProdutoRepo = { findOneBy: jest.fn(), findOne: jest.fn(), save: jest.fn() };
const mockReceitaRepo = { delete: jest.fn(), save: jest.fn() };
const mockMpRepo = { findOneBy: jest.fn() };
const mockUserRepo = { findOneBy: jest.fn() };
const mockManager = { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), delete: jest.fn() };

const mockAppDataSource = {
  getRepository: jest.fn((entity: any) => {
    if (entity.name === 'Produto' || entity === 'Produto') return mockProdutoRepo;
    if (entity.name === 'ReceitaItem' || entity === 'ReceitaItem') return mockReceitaRepo;
    if (entity.name === 'MateriaPrima' || entity === 'MateriaPrima') return mockMpRepo;
    if (entity.name === 'Usuario' || entity === 'Usuario') return mockUserRepo;
    return {} as any;
  }),
  transaction: jest.fn(async (cb: any) => await cb(mockManager))
};

jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: mockAppDataSource
}));

jest.unstable_mockModule('../notificacao.service.js', () => ({
  NotificacaoService: jest.fn().mockImplementation(() => ({
    criarNotificacaoParaPerfis: jest.fn()
  }))
}));

const { ProdutoService } = await import('../produto.service.js');

describe('ProdutoService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepo.findOneBy.mockResolvedValue({ id: 1 } as never);
    service = new ProdutoService();
  });

  describe('criar', () => {
    const requisitanteMock = { id: 1, perfil: PerfilUsuario.GESTOR };
    const dtoMock = {
      nome: 'Produto Teste',
      categoria: 'Categoria 1',
      linha_padrao: 'Linha A',
      percentual_ressalva: 10,
      ativo: true,
      receita: [
        { materia_prima_id: 100, quantidade: 2, unidade: 'UN' }
      ]
    };

    it('deve lançar erro se o criador não for encontrado', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null as never);

      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow(AppError);
      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow('Criador não encontrado.');
    });

    it('deve lançar erro se a matéria prima não for encontrada', async () => {
      mockMpRepo.findOneBy.mockResolvedValue(null as never);
      mockManager.save.mockResolvedValueOnce({ id: 10 } as never); // mock save do produto
      
      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow(AppError);
      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow('Matéria-prima ID 100 não encontrada.');
    });

    it('deve criar o produto e receita com sucesso', async () => {
      mockMpRepo.findOneBy.mockResolvedValue({ id: 100, nome: 'MP 1' } as never);
      
      const produtoSalvoMock = { id: 10, nome: 'Produto Teste' };
      mockManager.create.mockReturnValue(produtoSalvoMock as never);
      mockManager.save.mockResolvedValue(produtoSalvoMock as never);
      
      const produtoCompletoMock = { id: 10, nome: 'Produto Teste', sku: 'PRD-PRODUTOTESTE', receita: [] };
      mockManager.findOne.mockResolvedValue(produtoCompletoMock as never);

      const result = await service.criar(dtoMock as any, requisitanteMock);

      expect(result).toBeDefined();
      expect(result.id).toBe(10);
      expect(mockAppDataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('alternarStatus', () => {
    const requisitanteMock = { id: 1, perfil: PerfilUsuario.GESTOR };

    it('deve lançar erro se o produto não for encontrado', async () => {
      mockProdutoRepo.findOneBy.mockResolvedValue(null as never);
      await expect(service.alternarStatus(1, false, requisitanteMock)).rejects.toThrow(AppError);
      await expect(service.alternarStatus(1, false, requisitanteMock)).rejects.toThrow('Produto não encontrado.');
    });

    it('deve alterar o status e retornar o produto atualizado', async () => {
      const produtoMock = { id: 1, ativo: true };
      mockProdutoRepo.findOneBy.mockResolvedValue(produtoMock as never);
      
      const produtoAtualizadoMock = { id: 1, ativo: false };
      mockProdutoRepo.findOne.mockResolvedValue(produtoAtualizadoMock as never);

      const result = await service.alternarStatus(1, false, requisitanteMock);

      expect(mockProdutoRepo.save).toHaveBeenCalledWith({ id: 1, ativo: false });
      expect(result.ativo).toBe(false);
    });
  });
});
