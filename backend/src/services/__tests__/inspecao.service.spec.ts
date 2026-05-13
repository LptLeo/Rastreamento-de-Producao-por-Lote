import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import { PerfilUsuario } from '../../entities/Usuario.js';
import { LoteStatus } from '../../entities/Lote.js';
import type { Requisitante } from '../../utils/auth.utils.js';

type JestMock = ReturnType<typeof jest.fn>;

const mockInspecaoRepo = { findOneBy: jest.fn(), findOne: jest.fn(), save: jest.fn() };
const mockLoteRepo = { findOne: jest.fn(), save: jest.fn() };
const mockUserRepo = { findOneBy: jest.fn() };
const mockManager = { create: jest.fn(), save: jest.fn() };

const mockAppDataSource = {
  getRepository: jest.fn((entity: { name?: string } | string | unknown) => {
    const name = (entity as { name?: string }).name || (entity as string);
    if (name === 'Inspecao') return mockInspecaoRepo;
    if (name === 'Lote') return mockLoteRepo;
    if (name === 'Usuario') return mockUserRepo;
    return {};
  }),
  transaction: jest.fn(async (cb: (em: typeof mockManager) => Promise<unknown>) => await cb(mockManager)),
};

jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: mockAppDataSource,
}));

const { InspecaoService } = await import('../inspecao.service.js');

describe('InspecaoService', () => {
  let service: InstanceType<typeof InspecaoService>;
  const requisitanteMock: Requisitante = { id: 1, perfil: PerfilUsuario.INSPETOR };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InspecaoService();
  });

  describe('registrar', () => {
    const dtoMock = { quantidade_reprovada: 5, descricao_desvio: 'Teste' };

    it('deve lançar erro se o lote não existir', async () => {
      mockLoteRepo.findOne.mockResolvedValue(null as never);
      await expect(service.registrar(1, dtoMock, requisitanteMock)).rejects.toThrow(
        'Lote não encontrado.',
      );
    });

    it('deve lançar erro se o lote não estiver aguardando inspeção', async () => {
      mockLoteRepo.findOne.mockResolvedValue({ id: 1, status: LoteStatus.EM_PRODUCAO } as never);
      await expect(service.registrar(1, dtoMock, requisitanteMock)).rejects.toThrow(
        /Só é possível inspecionar lotes com status/,
      );
    });

    it('deve calcular APROVADO quando zero reprovados', async () => {
      const loteMock = {
        id: 1,
        status: LoteStatus.AGUARDANDO_INSPECAO,
        quantidade_planejada: 100,
        produto: { percentual_ressalva: 10 },
      };
      mockLoteRepo.findOne.mockResolvedValue(loteMock as never);
      mockInspecaoRepo.findOneBy.mockResolvedValue(null as never);
      mockUserRepo.findOneBy.mockResolvedValue({ id: 1 } as never);
      mockManager.create.mockReturnValue({ resultado_calculado: 'aprovado' } as never);

      await service.registrar(1, { quantidade_reprovada: 0 }, requisitanteMock);

      expect(mockManager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          resultado_calculado: 'aprovado',
        }),
      );
    });

    it('deve calcular REPROVADO quando taxa excede ressalva', async () => {
      const loteMock = {
        id: 1,
        status: LoteStatus.AGUARDANDO_INSPECAO,
        quantidade_planejada: 100,
        produto: { percentual_ressalva: 10 },
      };
      mockLoteRepo.findOne.mockResolvedValue(loteMock as never);
      mockInspecaoRepo.findOneBy.mockResolvedValue(null as never);
      mockUserRepo.findOneBy.mockResolvedValue({ id: 1 } as never);

      await service.registrar(1, { quantidade_reprovada: 15 }, requisitanteMock); // 15% > 10%

      expect(mockManager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          resultado_calculado: 'reprovado',
        }),
      );
    });

    it('deve calcular APROVADO_RESTRICAO quando taxa está dentro da ressalva', async () => {
      const loteMock = {
        id: 1,
        status: LoteStatus.AGUARDANDO_INSPECAO,
        quantidade_planejada: 100,
        produto: { percentual_ressalva: 10 },
      };
      mockLoteRepo.findOne.mockResolvedValue(loteMock as never);
      mockInspecaoRepo.findOneBy.mockResolvedValue(null as never);
      mockUserRepo.findOneBy.mockResolvedValue({ id: 1 } as never);

      await service.registrar(1, { quantidade_reprovada: 5 }, requisitanteMock); // 5% <= 10%

      expect(mockManager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          resultado_calculado: 'aprovado_restricao',
        }),
      );
    });
  });
});
