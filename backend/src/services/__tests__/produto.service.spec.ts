import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import { PerfilUsuario } from '../../entities/Usuario.js';
import type { Requisitante } from '../../utils/auth.utils.js';

type JestMock = ReturnType<typeof jest.fn>;

const mockProdutoRepo = { findOneBy: jest.fn(), findOne: jest.fn(), save: jest.fn() };
const mockReceitaRepo = { delete: jest.fn(), save: jest.fn() };
const mockMpRepo = { findOneBy: jest.fn() };
const mockUserRepo = { findOneBy: jest.fn() };
const mockManager = { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), delete: jest.fn() };

const mockAppDataSource = {
  getRepository: jest.fn((entity: { name?: string } | string | unknown) => {
    const name = (entity as { name?: string }).name || (entity as string);
    if (name === 'Produto') return mockProdutoRepo;
    if (name === 'ReceitaItem') return mockReceitaRepo;
    if (name === 'MateriaPrima') return mockMpRepo;
    if (name === 'Usuario') return mockUserRepo;
    return {};
  }),
  transaction: jest.fn(async (cb: (em: typeof mockManager) => Promise<unknown>) => await cb(mockManager)),
};

jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: mockAppDataSource,
}));

jest.unstable_mockModule('../notificacao.service.js', () => ({
  NotificacaoService: jest.fn().mockImplementation(() => ({
    criarNotificacaoParaPerfis: jest.fn(),
  })),
}));

const { ProdutoService } = await import('../produto.service.js');

describe('ProdutoService', () => {
  let service: InstanceType<typeof ProdutoService>;

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
      receita: [{ materia_prima_id: 100, quantidade: 2, unidade: 'UN' }],
    };

    it('deve lançar erro se o criador não for encontrado', async () => {
      (mockUserRepo.findOneBy as JestMock).mockResolvedValue(null);

      await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(AppError);
      await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(
        'Criador não encontrado.',
      );
    });

    it('deve lançar erro se a matéria prima não for encontrada', async () => {
      (mockMpRepo.findOneBy as JestMock).mockResolvedValue(null);
      (mockManager.save as JestMock).mockResolvedValueOnce({ id: 10 });

      await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(AppError);
      await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(
        'Matéria-prima ID 100 não encontrada.',
      );
    });

    it('deve criar o produto e receita com sucesso', async () => {
      (mockMpRepo.findOneBy as JestMock).mockResolvedValue({ id: 100, nome: 'MP 1' });

      const produtoSalvoMock = { id: 10, nome: 'Produto Teste' };
      (mockManager.create as JestMock).mockReturnValue(produtoSalvoMock);
      (mockManager.save as JestMock).mockResolvedValue(produtoSalvoMock);

      const produtoCompletoMock = { id: 10, nome: 'Produto Teste', sku: 'PRD-PRODUTOTESTE', receita: [] };
      (mockManager.findOne as JestMock).mockResolvedValue(produtoCompletoMock);

      const result = await service.criar(dtoMock, requisitanteMock);

      expect(result).toBeDefined();
      expect(result.id).toBe(10);
      expect(mockAppDataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('alternarStatus', () => {
    const requisitanteMock: Requisitante = { id: 1, perfil: PerfilUsuario.GESTOR };

    it('deve lançar erro se o produto não for encontrado', async () => {
      (mockProdutoRepo.findOneBy as JestMock).mockResolvedValue(null);
      await expect(service.alternarStatus(1, false, requisitanteMock)).rejects.toThrow(AppError);
      await expect(service.alternarStatus(1, false, requisitanteMock)).rejects.toThrow(
        'Produto não encontrado.',
      );
    });

    it('deve alterar o status e retornar o produto atualizado', async () => {
      const produtoMock = { id: 1, ativo: true };
      (mockProdutoRepo.findOneBy as JestMock).mockResolvedValue(produtoMock);

      const produtoAtualizadoMock = { id: 1, ativo: false };
      (mockProdutoRepo.findOne as JestMock).mockResolvedValue(produtoAtualizadoMock);

      const result = await service.alternarStatus(1, false, requisitanteMock);

      expect(mockProdutoRepo.save).toHaveBeenCalledWith({ id: 1, ativo: false });
      expect(result.ativo).toBe(false);
    });
  });
});
