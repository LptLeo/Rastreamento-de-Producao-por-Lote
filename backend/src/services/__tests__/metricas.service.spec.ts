import { jest } from '@jest/globals';
import { PerfilUsuario } from '../../entities/Usuario.js';

const mockLoteRepo = { 
  count: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn()
};

const mockAppDataSource = {
  getRepository: jest.fn(() => mockLoteRepo)
};

jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: mockAppDataSource
}));

const { MetricasService } = await import('../metricas.service.js');

describe('MetricasService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MetricasService();
  });

  describe('getDashboard', () => {
    const requisitante = { id: 1, perfil: PerfilUsuario.GESTOR };

    it('deve calcular a tendência de unidades produzidas corretamente', async () => {
      // Mock de contagem de lotes
      mockLoteRepo.count.mockResolvedValue(10 as never);
      
      // Mock de unidades
      const mockQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn()
          .mockResolvedValueOnce({ total: "100" }) // Atual
          .mockResolvedValueOnce({ total: "50" }), // Passado
        getRawMany: jest.fn().mockResolvedValue([])
      };
      
      mockLoteRepo.createQueryBuilder.mockReturnValue(mockQB as any);
      mockLoteRepo.find.mockResolvedValue([]);

      const result = await service.getDashboard(requisitante, 'mes', 'mes');

      expect(result.unidades_mes).toBe(100);
      expect(result.unidades_tendencia).toBe(100); // (100-50)/50 * 100
    });

    it('deve retornar taxa de aprovação 0 se não houver inspeções', async () => {
      mockLoteRepo.count.mockResolvedValue(0 as never);
      const mockQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: "0" }),
        getRawMany: jest.fn().mockResolvedValue([])
      };
      mockLoteRepo.createQueryBuilder.mockReturnValue(mockQB as any);
      mockLoteRepo.find.mockResolvedValue([]);

      const result = await service.getDashboard(requisitante);
      expect(result.taxa_aprovacao_mes).toBe(0);
    });
  });
});
