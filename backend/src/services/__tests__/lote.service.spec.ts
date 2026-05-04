import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import { PerfilUsuario } from '../../entities/Usuario.js';

// Setup basic mocks that will be returned by the mocked module
const mockProdutoRepo = { findOneBy: jest.fn() };
const mockEstoqueRepo = { findOneBy: jest.fn(), save: jest.fn() };
const mockUserRepo = { findOneBy: jest.fn().mockResolvedValue({ id: 1 }) };
const mockLoteRepo = { count: jest.fn().mockResolvedValue(0), findOne: jest.fn(), createQueryBuilder: jest.fn() };
const mockManager = { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), find: jest.fn().mockResolvedValue([]) };

// Create the mock for AppDataSource
const mockAppDataSource = {
  getRepository: jest.fn((entity: any) => {
    if (entity.name === 'Produto' || entity === 'Produto') return mockProdutoRepo;
    if (entity.name === 'InsumoEstoque' || entity === 'InsumoEstoque') return mockEstoqueRepo;
    if (entity.name === 'Usuario' || entity === 'Usuario') return mockUserRepo;
    if (entity.name === 'Lote' || entity === 'Lote') return mockLoteRepo;
    return {} as any;
  }),
  transaction: jest.fn(async (cb: any) => await cb(mockManager))
};

// Use unstable_mockModule for ESM mocking before importing the service
jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: mockAppDataSource
}));

// We must import the module dynamically AFTER setting up the mock
const { LoteService } = await import('../lote.service.js');

describe('LoteService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LoteService();
  });

  describe('Segurança e Permissões', () => {
    it('deve impedir que um INSPETOR crie um lote', async () => {
      const requisitante = { id: 1, perfil: PerfilUsuario.INSPETOR };
      await expect(service.criar({}, requisitante)).rejects.toThrow(/Acesso negado/);
    });
  });

  describe('criar', () => {
    const requisitanteMock = { id: 1, perfil: PerfilUsuario.OPERADOR };
    const dtoMock = {
      produto_id: 1,
      quantidade_planejada: 10,
      turno: 'manha',
      data_producao: new Date().toISOString(),
      consumos: [
        { insumo_estoque_id: 100, quantidade_consumida: 5 }
      ]
    };

    it('deve lançar erro se o produto não for encontrado', async () => {
      mockProdutoRepo.findOneBy.mockResolvedValue(null as never);

      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow(AppError);
      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow('Produto não encontrado.');
    });

    it('deve lançar erro se o insumo não for encontrado no estoque', async () => {
      mockProdutoRepo.findOneBy.mockResolvedValue({ id: 1, nome: 'Produto Teste' } as never);
      mockManager.findOne.mockResolvedValue(null as never);

      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow('Lote de insumo ID 100 não encontrado.');
    });

    it('deve lançar erro se o insumo estiver inativo', async () => {
      mockProdutoRepo.findOneBy.mockResolvedValue({ id: 1, nome: 'Produto Teste' } as never);
      mockManager.findOne.mockResolvedValue({ 
        id: 100, 
        ativo: false,
        materiaPrima: { nome: 'Insumo Inativo' } 
      } as never);

      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow(/está inativo/);
    });

    it('deve lançar erro se tentar consumo fracionado para unidade UN', async () => {
      mockProdutoRepo.findOneBy.mockResolvedValue({ id: 1, nome: 'Produto Teste' } as never);
      mockManager.findOne.mockResolvedValue({ 
        id: 100, 
        ativo: true,
        materiaPrima: { nome: 'Item UN', unidade_medida: 'UN' } 
      } as never);
      
      const dtoInvalido = { ...dtoMock, consumos: [{ insumo_estoque_id: 100, quantidade_consumida: 1.5 }] };

      await expect(service.criar(dtoInvalido as any, requisitanteMock)).rejects.toThrow(/não aceita consumo de lote fracionado/);
    });

    it('deve lançar erro se tentar consumir mais insumo do que o disponível', async () => {
      mockProdutoRepo.findOneBy.mockResolvedValue({ id: 1, nome: 'Produto Teste' } as never);
      mockManager.findOne.mockResolvedValue({ 
        id: 100, 
        quantidade_atual: 3,
        ativo: true,
        materiaPrima: { unidade_medida: 'UN' }
      } as never);

      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow(/Saldo insuficiente no lote/);
    });

    it('deve criar o lote e abater o estoque corretamente', async () => {
      mockProdutoRepo.findOneBy.mockResolvedValue({ id: 1, nome: 'Produto Teste', percentual_ressalva: 10 } as never);
      
      const estoqueMock = { id: 100, quantidade_atual: 20, quantidade_inicial: 20, ativo: true, materiaPrima: { nome: 'MP', unidade_medida: 'UN' } };
      
      const loteSalvoMock = { id: 50, numero_lote: 'LOT-01012026-1' };
      mockManager.create.mockReturnValue(loteSalvoMock as never); 
      mockManager.save.mockResolvedValue(loteSalvoMock as never);
      
      mockManager.findOne.mockResolvedValueOnce(estoqueMock as never).mockResolvedValueOnce(loteSalvoMock as never);
      mockLoteRepo.count.mockResolvedValue(0 as never);

      const resultado = await service.criar(dtoMock as any, requisitanteMock);

      expect(resultado).toBeDefined();
      expect(mockAppDataSource.transaction).toHaveBeenCalled();
      expect(estoqueMock.quantidade_atual).toBe(15);
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar o lote completo se encontrado', async () => {
      const mockLote = { id: 1, numero_lote: 'LOT-123' };
      mockLoteRepo.findOne.mockResolvedValue(mockLote as never);

      const result = await service.buscarPorId(1, { perfil: PerfilUsuario.GESTOR });
      expect(result.numero_lote).toBe('LOT-123');
    });

    it('deve lançar erro 404 se o lote não existir', async () => {
      mockLoteRepo.findOne.mockResolvedValue(null as never);
      await expect(service.buscarPorId(999, { perfil: PerfilUsuario.GESTOR })).rejects.toThrow('Lote não encontrado.');
    });
  });

  describe('getContagemPorStatus', () => {
    it('deve agrupar e retornar as contagens corretamente', async () => {
      const mockRaw = [
        { status: 'em_producao', count: '5' },
        { status: 'aprovado', count: '10' }
      ];
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockRaw)
      };

      mockLoteRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getContagemPorStatus({ perfil: PerfilUsuario.GESTOR });

      expect(result.em_producao).toBe(5);
      expect(result.aprovado).toBe(10);
      expect(result.todos).toBe(15);
    });
  });
});
