import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import { PerfilUsuario } from '../../entities/Usuario.js';

const mockInsumoRepo = { count: jest.fn(), create: jest.fn(), save: jest.fn(), findOne: jest.fn(), createQueryBuilder: jest.fn() };
const mockMpRepo = { findOneBy: jest.fn() };
const mockUserRepo = { findOneBy: jest.fn() };

jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: {
    getRepository: jest.fn((entity: any) => {
      if (entity.name === 'InsumoEstoque' || entity === 'InsumoEstoque') return mockInsumoRepo;
      if (entity.name === 'MateriaPrima' || entity === 'MateriaPrima') return mockMpRepo;
      if (entity.name === 'Usuario' || entity === 'Usuario') return mockUserRepo;
      return {} as any;
    })
  }
}));

const { InsumoEstoqueService } = await import('../insumoEstoque.service.js');

describe('InsumoEstoqueService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepo.findOneBy.mockResolvedValue({ id: 1 } as never);
    service = new InsumoEstoqueService();
  });

  describe('criar', () => {
    const requisitanteMock = { id: 1, perfil: PerfilUsuario.OPERADOR };
    const dtoMock = {
      materia_prima_id: 100,
      quantidade_inicial: 50.5,
      fornecedor: 'Fornecedor Teste',
      turno: 'manha'
    };

    it('deve lançar erro se a matéria prima não for encontrada', async () => {
      mockMpRepo.findOneBy.mockResolvedValue(null as never);

      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow(AppError);
      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow('Matéria-prima não encontrada.');
    });

    it('deve lançar erro se a unidade for UN e a quantidade fracionada', async () => {
      mockMpRepo.findOneBy.mockResolvedValue({ id: 100, unidade_medida: 'UN' } as never);

      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow(AppError);
      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow("A quantidade para unidade 'UN' não pode ser fracionada.");
    });

    it('deve lançar erro se o operador não for encontrado', async () => {
      mockMpRepo.findOneBy.mockResolvedValue({ id: 100, unidade_medida: 'KG' } as never);
      mockUserRepo.findOneBy.mockResolvedValue(null as never);

      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow(AppError);
      await expect(service.criar(dtoMock as any, requisitanteMock)).rejects.toThrow('Operador não encontrado.');
    });

    it('deve criar insumo com sucesso e gerar o número de lote interno corretamente', async () => {
      mockMpRepo.findOneBy.mockResolvedValue({ id: 100, unidade_medida: 'KG' } as never);
      mockInsumoRepo.count.mockResolvedValue(5 as never);
      mockInsumoRepo.create.mockReturnValue({ id: 10 } as never);
      mockInsumoRepo.save.mockResolvedValue({ id: 10 } as never);

      const result = await service.criar(dtoMock as any, requisitanteMock);

      expect(result).toBeDefined();
      expect(result.id).toBe(10);
      expect(mockInsumoRepo.create).toHaveBeenCalled();
      
      const createArg = mockInsumoRepo.create.mock.calls[0][0];
      expect(createArg.numero_lote_interno).toMatch(/^INS-\d{8}-6$/); // count + 1 = 6
      expect(createArg.quantidade_atual).toBe(50.5);
    });
  });
});
