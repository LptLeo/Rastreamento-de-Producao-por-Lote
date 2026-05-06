import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import { PerfilUsuario } from '../../entities/Usuario.js';

const mockMpRepo = {
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockAppDataSource = {
  getRepository: jest.fn(() => mockMpRepo),
};

jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: mockAppDataSource,
}));

const { MateriaPrimaService } = await import('../materiaPrima.service.js');

describe('MateriaPrimaService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MateriaPrimaService();
  });

  describe('criar', () => {
    const dto = { nome: 'Painel LED 14"', unidade_medida: 'UN', categoria: 'Displays' };
    const req = { id: 1, perfil: PerfilUsuario.GESTOR };

    it('deve gerar o SKU interno corretamente', async () => {
      mockMpRepo.findOneBy.mockResolvedValue(null as never);
      mockMpRepo.create.mockReturnValue({ ...dto, id: 1 } as never);
      mockMpRepo.save.mockResolvedValue({ ...dto, id: 1, sku_interno: 'MP-PAINELLED14' } as never);

      const result = await service.criar(dto as any, req);

      expect(result.sku_interno).toBe('MP-PAINELLED14');
      expect(mockMpRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sku_interno: 'MP-PAINELLED14',
        }),
      );
    });

    it('deve garantir unicidade do SKU adicionando sufixo se já existir', async () => {
      // Simula que o SKU base já existe, mas o com sufixo -1 está livre
      mockMpRepo.findOneBy
        .mockResolvedValueOnce({ id: 5 } as never) // Primeira tentativa (base) existe
        .mockResolvedValueOnce(null as never); // Segunda tentativa (-1) livre

      mockMpRepo.create.mockReturnValue({ id: 6 } as never);
      mockMpRepo.save.mockResolvedValue({ id: 6 } as never);

      await service.criar(dto as any, req);

      expect(mockMpRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sku_interno: 'MP-PAINELLED14-1',
        }),
      );
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar a matéria-prima se encontrada', async () => {
      mockMpRepo.findOneBy.mockResolvedValue({ id: 1, nome: 'MP' } as never);
      const result = await service.buscarPorId(1, { perfil: PerfilUsuario.OPERADOR });
      expect(result.id).toBe(1);
    });

    it('deve lançar erro 404 se não for encontrada', async () => {
      mockMpRepo.findOneBy.mockResolvedValue(null as never);
      await expect(service.buscarPorId(99, { perfil: PerfilUsuario.OPERADOR })).rejects.toThrow(
        'Matéria-prima não encontrada.',
      );
    });
  });
});
