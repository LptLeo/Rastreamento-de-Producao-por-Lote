import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import { PerfilUsuario } from '../../entities/Usuario.js';

const mockInsumoRepo = {
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockMpRepo = { 
  findOneBy: jest.fn(),
  findBy: jest.fn()
};

const mockUserRepo = { 
  findOneBy: jest.fn() 
};

const mockEntityManager = {
  findOneBy: jest.fn<any>(),
  findBy: jest.fn<any>(),
  count: jest.fn<any>(),
  create: jest.fn<any>(),
  save: jest.fn<any>(),
  getRepository: jest.fn<any>((entity: any) => {
    if (entity.name === 'InsumoEstoque' || entity === 'InsumoEstoque') return mockInsumoRepo;
    if (entity.name === 'MateriaPrima' || entity === 'MateriaPrima') return mockMpRepo;
    if (entity.name === 'Usuario' || entity === 'Usuario') return mockUserRepo;
    return {} as any;
  }),
};

jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: {
    transaction: jest.fn((callback: any) => callback(mockEntityManager)),
    getRepository: jest.fn((entity: any) => {
      if (entity.name === 'InsumoEstoque' || entity === 'InsumoEstoque') return mockInsumoRepo;
      if (entity.name === 'MateriaPrima' || entity === 'MateriaPrima') return mockMpRepo;
      if (entity.name === 'Usuario' || entity === 'Usuario') return mockUserRepo;
      return {} as any;
    }),
  },
}));

const { InsumoEstoqueService } = await import('../insumoEstoque.service.js');

describe('InsumoEstoqueService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEntityManager.findOneBy.mockImplementation((entity: any, criteria: any) => {
      if (entity.name === 'Usuario' || entity === 'Usuario') return Promise.resolve({ id: 1 });
      return Promise.resolve(null);
    });
    service = new InsumoEstoqueService();
  });

  describe('criar', () => {
    const requisitanteMock = { id: 1, perfil: PerfilUsuario.OPERADOR };
    const dtoMock = {
      materia_prima_id: 100,
      quantidade_inicial: 50.5,
      fornecedor: 'Fornecedor Teste',
      turno: 'manha',
    };

    it('deve lançar erro se a matéria prima não for encontrada', async () => {
      mockEntityManager.findOneBy.mockResolvedValue(null as never);

      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow(AppError);
      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow(
        'Matéria-prima não encontrada.',
      );
    });

    it('deve lançar erro se a unidade for UN e a quantidade fracionada', async () => {
      mockEntityManager.findOneBy.mockImplementation((entity: any) => {
        if (entity.name === 'MateriaPrima' || entity === 'MateriaPrima') 
          return Promise.resolve({ id: 100, unidade_medida: 'UN' });
        return Promise.resolve({ id: 1 });
      });

      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow(AppError);
      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow(
        "A quantidade para unidade 'UN' não pode ser fracionada.",
      );
    });

    it('deve lançar erro se o operador não for encontrado', async () => {
      mockEntityManager.findOneBy.mockImplementation((entity: any) => {
        if (entity.name === 'MateriaPrima' || entity === 'MateriaPrima') 
          return Promise.resolve({ id: 100, unidade_medida: 'KG' });
        if (entity.name === 'Usuario' || entity === 'Usuario') 
          return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow(AppError);
      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow(
        'Operador não encontrado.',
      );
    });

    it('deve criar insumo com sucesso e gerar o número de lote interno corretamente', async () => {
      mockEntityManager.findOneBy.mockImplementation((entity: any) => {
        if (entity.name === 'MateriaPrima' || entity === 'MateriaPrima') 
          return Promise.resolve({ id: 100, unidade_medida: 'KG' });
        if (entity.name === 'Usuario' || entity === 'Usuario') 
          return Promise.resolve({ id: 1 });
        return Promise.resolve(null);
      });
      
      mockInsumoRepo.count.mockResolvedValue(5 as never);
      mockEntityManager.create.mockReturnValue({ id: 10 });
      mockEntityManager.save.mockResolvedValue({ id: 10 });

      const result = await service.criar(dtoMock as any, requisitanteMock);

      expect(result).toBeDefined();
      expect(result.id).toBe(10);
      expect(mockEntityManager.create).toHaveBeenCalled();

      const createArg = mockEntityManager.create.mock.calls[0][1];
      expect(createArg.numero_lote_interno).toMatch(/^INS-\d{8}-6$/);
      expect(createArg.quantidade_atual).toBe(50.5);
    });
  });

  describe('criarBulk', () => {
    const requisitanteMock = { id: 1, perfil: PerfilUsuario.OPERADOR };
    const itemsMock = [
      { materia_prima_id: 100, quantidade_inicial: 10, fornecedor: 'F1', turno: 'manha' },
      { materia_prima_id: 101, quantidade_inicial: 20, fornecedor: 'F1', turno: 'manha' }
    ];

    it('deve criar múltiplos insumos em uma única transação', async () => {
      mockEntityManager.findOneBy.mockResolvedValue({ id: 1 }); // Operador
      mockEntityManager.findBy.mockResolvedValue([
        { id: 100, nome: 'MP1', unidade_medida: 'KG' },
        { id: 101, nome: 'MP2', unidade_medida: 'KG' }
      ]);
      
      let count = 0;
      mockInsumoRepo.count.mockImplementation(() => Promise.resolve(count++));
      
      mockEntityManager.create.mockImplementation((entity, data) => ({ ...data, id: Math.random() }));
      mockEntityManager.save.mockImplementation((entity) => Promise.resolve(entity));

      const resultados = await service.criarBulk({ itens: itemsMock as any }, requisitanteMock);

      expect(resultados).toHaveLength(2);
      expect(mockEntityManager.create).toHaveBeenCalledTimes(2);
      expect(mockInsumoRepo.count).toHaveBeenCalledTimes(2);
      expect(resultados[0].numero_lote_interno).toMatch(/-1$/);
      expect(resultados[1].numero_lote_interno).toMatch(/-2$/);
    });
  });

  describe('getContagem', () => {
    it('deve retornar métricas de estoque com uma única consulta agregada', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total: '9',
          comSaldo: '7',
          esgotados: '2',
        }),
      };
      mockInsumoRepo.createQueryBuilder.mockReturnValue(qb as never);

      const resultado = await service.getContagem({ id: 1, perfil: PerfilUsuario.GESTOR });

      expect(resultado).toEqual({ total: 9, comSaldo: 7, esgotados: 2 });
      expect(mockInsumoRepo.createQueryBuilder).toHaveBeenCalledWith('ie');
      expect(qb.getRawOne).toHaveBeenCalledTimes(1);
    });
  });
});
