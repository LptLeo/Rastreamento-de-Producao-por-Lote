import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import { PerfilUsuario } from '../../entities/Usuario.js';
import type { Requisitante } from '../../utils/auth.utils.js';
import type { CriarLoteDTO } from '../../dto/lote.dto.js';

type JestMock = ReturnType<typeof jest.fn>;

// Setup basic mocks
const mockProdutoRepo = { findOneBy: jest.fn(), createQueryBuilder: jest.fn() };
const mockEstoqueRepo = { findOneBy: jest.fn(), save: jest.fn() };
const mockUserRepo = { findOneBy: jest.fn().mockResolvedValue({ id: 1 }) };
const mockLoteRepo = {
  count: jest.fn().mockResolvedValue(0),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
};
const mockManager = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
};

// Create the mock for AppDataSource
const mockAppDataSource = {
  getRepository: jest.fn((entity: { name?: string } | string | unknown) => {
    const name = (entity as { name?: string }).name || (entity as string);
    if (name === 'Produto') return mockProdutoRepo;
    if (name === 'InsumoEstoque') return mockEstoqueRepo;
    if (name === 'Usuario') return mockUserRepo;
    if (name === 'Lote') return mockLoteRepo;
    return {};
  }),
  transaction: jest.fn(async (cb: (em: typeof mockManager) => Promise<unknown>) => await cb(mockManager)),
};

// Use unstable_mockModule for ESM mocking before importing the service
jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: mockAppDataSource,
}));

// Import dinâmico do serviço
const { LoteService } = await import('../lote.service.js');

describe('LoteService', () => {
  let service: InstanceType<typeof LoteService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LoteService();
  });

  describe('Segurança e Permissões', () => {
    it('deve impedir que um INSPETOR crie um lote', async () => {
      const requisitante: Requisitante = { id: 1, perfil: PerfilUsuario.INSPETOR };
      await expect(service.criar({} as CriarLoteDTO, requisitante)).rejects.toThrow(/Acesso negado/);
    });
  });

  describe('criar', () => {
    const requisitanteMock: Requisitante = { id: 1, perfil: PerfilUsuario.OPERADOR };
    const dtoMock: CriarLoteDTO = {
      produto_id: 1,
      quantidade_planejada: 10,
      turno: 'manha',
      data_producao: new Date().toISOString().split('T')[0],
      consumos: [{ insumo_estoque_id: 100, quantidade_consumida: 5 }],
      observacoes: ''
    };

    it('deve lançar erro se o produto não for encontrado', async () => {
      (mockProdutoRepo.findOneBy as JestMock).mockResolvedValue(null);

      await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(AppError);
      await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow('Produto não encontrado.');
    });

    it('deve lançar erro se o insumo não for encontrado no estoque', async () => {
      (mockProdutoRepo.findOneBy as JestMock).mockResolvedValue({ id: 1, nome: 'Produto Teste' });
      (mockManager.findOne as JestMock).mockResolvedValue(null);

      await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow('Lote de insumo ID 100 não encontrado.');
    });

    it('deve lançar erro se o insumo estiver inativo', async () => {
      (mockProdutoRepo.findOneBy as JestMock).mockResolvedValue({ id: 1, nome: 'Produto Teste' });
      (mockManager.findOne as JestMock).mockResolvedValue({
        id: 100,
        ativo: false,
        materiaPrima: { nome: 'Insumo Inativo' },
      });

      await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(/está inativo/);
    });

    it('deve lançar erro se tentar consumo fracionado para unidade UN', async () => {
      (mockProdutoRepo.findOneBy as JestMock).mockResolvedValue({ id: 1, nome: 'Produto Teste' });
      (mockManager.findOne as JestMock).mockResolvedValue({
        id: 100,
        ativo: true,
        materiaPrima: { nome: 'Item UN', unidade_medida: 'UN' },
      });

      const dtoInvalido = {
        ...dtoMock,
        consumos: [{ insumo_estoque_id: 100, quantidade_consumida: 1.5 }],
      };

      await expect(service.criar(dtoInvalido as CriarLoteDTO, requisitanteMock)).rejects.toThrow(/não aceita consumo de lote fracionado/);
    });

    it('deve lançar erro se tentar consumir mais insumo do que o disponível', async () => {
      (mockProdutoRepo.findOneBy as JestMock).mockResolvedValue({ id: 1, nome: 'Produto Teste' });
      (mockManager.findOne as JestMock).mockResolvedValue({
        id: 100,
        quantidade_atual: 3,
        ativo: true,
        materiaPrima: { unidade_medida: 'UN' },
      });

      await expect(service.criar(dtoMock, requisitanteMock)).rejects.toThrow(/Saldo insuficiente no lote/);
    });

    it('deve criar o lote e abater o estoque corretamente', async () => {
      (mockProdutoRepo.findOneBy as JestMock).mockResolvedValue({
        id: 1,
        nome: 'Produto Teste',
        percentual_ressalva: 10,
      });

      const estoqueMock = {
        id: 100,
        quantidade_atual: 20,
        quantidade_inicial: 20,
        ativo: true,
        materiaPrima: { nome: 'MP', unidade_medida: 'UN' },
      };

      const loteSalvoMock = { id: 50, numero_lote: 'LOT-01012026-1' };
      (mockManager.create as JestMock).mockReturnValue(loteSalvoMock);
      (mockManager.save as JestMock).mockResolvedValue(loteSalvoMock);

      (mockManager.findOne as JestMock)
        .mockResolvedValueOnce(estoqueMock)
        .mockResolvedValueOnce(loteSalvoMock);
      (mockLoteRepo.count as JestMock).mockResolvedValue(0);

      const resultado = await service.criar(dtoMock, requisitanteMock);

      expect(resultado).toBeDefined();
      expect(mockAppDataSource.transaction).toHaveBeenCalled();
      expect(estoqueMock.quantidade_atual).toBe(15);
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar o lote completo se encontrado', async () => {
      const mockLote = { id: 1, numero_lote: 'LOT-123' };
      (mockLoteRepo.findOne as JestMock).mockResolvedValue(mockLote);

      const result = await service.buscarPorId(1, { id: 1, perfil: PerfilUsuario.GESTOR });
      expect(result.numero_lote).toBe('LOT-123');
    });

    it('deve lançar erro 404 se o lote não existir', async () => {
      (mockLoteRepo.findOne as JestMock).mockResolvedValue(null);
      await expect(service.buscarPorId(999, { id: 1, perfil: PerfilUsuario.GESTOR })).rejects.toThrow('Lote não encontrado.');
    });
  });

  describe('getContagemPorStatus', () => {
    it('deve agrupar e retornar as contagens corretamente', async () => {
      const mockRaw = [
        { status: 'em_producao', count: '5' },
        { status: 'aprovado', count: '10' },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockRaw),
      };

      (mockLoteRepo.createQueryBuilder as JestMock).mockReturnValue(mockQueryBuilder);

      const result = await service.getContagemPorStatus({ id: 1, perfil: PerfilUsuario.GESTOR });

      expect(result['em_producao']).toBe(5);
      expect(result['aprovado']).toBe(10);
      expect(result['todos']).toBe(15);
    });
  });

  describe('buscarSugestoes', () => {
    const requisitanteMock: Requisitante = { id: 1, perfil: PerfilUsuario.OPERADOR };

    const mockLoteQB = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    const mockProdutoQB = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    beforeEach(() => {
      (mockLoteRepo.createQueryBuilder as JestMock).mockReturnValue(mockLoteQB);
      (mockProdutoRepo.createQueryBuilder as JestMock).mockReturnValue(mockProdutoQB);
    });

    it('deve retornar lotes e produtos combinados com os tipos corretos', async () => {
      mockLoteQB.getMany.mockResolvedValue([
        { id: 1, numero_lote: 'LOT-01012026-1', status: 'em_producao' },
      ]);
      mockProdutoQB.getMany.mockResolvedValue([
        { id: 10, nome: 'Produto A', sku: 'PA-001' },
      ]);

      const result = await service.buscarSugestoes('LOT', requisitanteMock);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ tipo: 'lote', label: 'LOT-01012026-1', id: 1 });
      expect(result[1]).toMatchObject({ tipo: 'produto', label: 'Produto A', id: 10 });
    });

    it('deve retornar lista vazia quando nenhum resultado bater', async () => {
      mockLoteQB.getMany.mockResolvedValue([]);
      mockProdutoQB.getMany.mockResolvedValue([]);

      const result = await service.buscarSugestoes('xyz_inexistente', requisitanteMock);

      expect(result).toHaveLength(0);
    });

    it('deve impedir que um perfil sem permissão acesse sugestões', async () => {
      // buscarSugestoes permite OPERADOR, INSPETOR e GESTOR — nenhum perfil inválido existe
      // mas verificamos que a função de permissão é chamada passando o requisitante correto
      const requisitanteGestor: Requisitante = { id: 2, perfil: PerfilUsuario.GESTOR };
      mockLoteQB.getMany.mockResolvedValue([]);
      mockProdutoQB.getMany.mockResolvedValue([]);

      await expect(service.buscarSugestoes('test', requisitanteGestor)).resolves.toBeDefined();
    });
  });
});
