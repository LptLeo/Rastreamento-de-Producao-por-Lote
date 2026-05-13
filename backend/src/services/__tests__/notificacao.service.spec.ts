import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import { TipoNotificacao } from '../../entities/Notificacao.js';

type JestMock = ReturnType<typeof jest.fn>;

const mockNotifRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
const mockUserRepo = { createQueryBuilder: jest.fn() };

const mockAppDataSource = {
  getRepository: jest.fn((entity: { name?: string } | string | unknown) => {
    const name = (entity as { name?: string }).name || (entity as string);
    if (name === 'Notificacao') return mockNotifRepo;
    if (name === 'Usuario') return mockUserRepo;
    return {};
  }),
};

jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: mockAppDataSource,
}));

const { NotificacaoService } = await import('../notificacao.service.js');

describe('NotificacaoService', () => {
  let service: InstanceType<typeof NotificacaoService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificacaoService();
  });

  describe('marcarComoLida', () => {
    it('deve lançar erro se a notificação não existir para o usuário', async () => {
      mockNotifRepo.findOne.mockResolvedValue(null as never);
      await expect(service.marcarComoLida(1, 10)).rejects.toThrow('Notificação não encontrada.');
    });

    it('deve marcar como lida e salvar', async () => {
      const mockNotif = { id: 1, lida: false };
      mockNotifRepo.findOne.mockResolvedValue(mockNotif as never);
      mockNotifRepo.save.mockResolvedValue({ ...mockNotif, lida: true } as never);

      const result = await service.marcarComoLida(1, 10);
      expect(result.lida).toBe(true);
      expect(mockNotifRepo.save).toHaveBeenCalled();
    });
  });

  describe('criarNotificacaoParaPerfis', () => {
    it('deve buscar usuários pelos perfis e salvar múltiplas notificações', async () => {
      const mockUsers = [{ id: 1 }, { id: 2 }];
      const mockQB = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockUsers),
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(mockQB);

      await service.criarNotificacaoParaPerfis('Mensagem', TipoNotificacao.SISTEMA, ['gestor']);

      expect(mockNotifRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ mensagem: 'Mensagem', usuario: { id: 1 } }),
          expect.objectContaining({ mensagem: 'Mensagem', usuario: { id: 2 } }),
        ]),
      );
    });
  });
});
