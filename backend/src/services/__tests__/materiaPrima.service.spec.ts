import { jest } from '@jest/globals';
import { PerfilUsuario } from '../../entities/Usuario.js';
import type { CriarMateriaPrimaDTO } from '../../dto/materiaPrima.dto.js';
import type { MateriaPrima } from '../../entities/MateriaPrima.js';

type JestMock = ReturnType<typeof jest.fn>;

const mockMpRepo = {
  findOneBy: jest.fn(() => Promise.resolve(null as unknown)),
  create: jest.fn((d: unknown) => d),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
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
  let service: InstanceType<typeof MateriaPrimaService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MateriaPrimaService();
  });

  describe('criar()', () => {
    const dto: CriarMateriaPrimaDTO = {
      nome: 'Painel LED 14"',
      unidade_medida: 'UN',
      categoria: 'Displays'
    };
    const requisitante = { id: 1, perfil: PerfilUsuario.GESTOR };

    it('deve gerar o SKU interno corretamente e salvar a entidade', async () => {
      (mockMpRepo.findOneBy as JestMock).mockResolvedValue(null);

      // Usamos 'unknown' em vez de 'any' para cumprir a regra de tipagem estrita
      (mockMpRepo.save as JestMock).mockImplementation((entidade: unknown) =>
        Promise.resolve({ ...(entidade as object), id: 1 })
      );

      const result = await service.criar(dto, requisitante);

      expect(result.sku_interno).toBe('MP-PAINELLED14');
      expect(mockMpRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          sku_interno: 'MP-PAINELLED14',
          nome: dto.nome
        })
      );
    });

    it('deve garantir unicidade do SKU adicionando sufixo se o base já existir', async () => {
      (mockMpRepo.findOneBy as JestMock)
        .mockResolvedValueOnce({ id: 5 })
        .mockResolvedValueOnce(null);

      await service.criar(dto, requisitante);

      expect(mockMpRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          sku_interno: 'MP-PAINELLED14-1',
        })
      );
    });
  });

  describe('buscarPorId()', () => {
    const requisitante = { id: 1, perfil: PerfilUsuario.OPERADOR };

    it('deve retornar a matéria-prima se encontrada', async () => {
      const mpMock = { id: 1, nome: 'Matéria Teste' } as MateriaPrima;
      (mockMpRepo.findOneBy as JestMock).mockResolvedValue(mpMock);

      const result = await service.buscarPorId(1, requisitante);

      expect(result.id).toBe(1);
      expect(result.nome).toBe('Matéria Teste');
    });

    it('deve lançar erro 404 se não for encontrada', async () => {
      (mockMpRepo.findOneBy as JestMock).mockResolvedValue(null);

      await expect(service.buscarPorId(99, requisitante)).rejects.toThrow(
        'Matéria-prima não encontrada.'
      );
    });
  });

  describe('listar()', () => {
    const requisitante = { id: 1, perfil: PerfilUsuario.GESTOR };

    it('deve retornar lista paginada de matérias-primas', async () => {
      const mockQueryBuilder = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(() => Promise.resolve([[{ id: 1, nome: 'A' }], 1])),
      };
      (mockMpRepo.createQueryBuilder as JestMock).mockReturnValue(mockQueryBuilder);

      const query = { pagina: 1, limite: 10 };
      const result = await service.listar(query, requisitante);

      expect(result.itens).toHaveLength(1);
      expect(result.meta.totalItens).toBe(1);
    });
  });
});
