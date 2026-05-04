import { jest } from '@jest/globals';
import { LoteStatus } from '../../entities/Lote.js';

const mockLoteRepo = { find: jest.fn(), save: jest.fn() };
const mockNotificacaoService = { criarNotificacaoParaPerfis: jest.fn() };

jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => mockLoteRepo)
  }
}));

jest.unstable_mockModule('../notificacao.service.js', () => ({
  NotificacaoService: jest.fn(() => mockNotificacaoService)
}));

const { ProgressaoService } = await import('../progressao.service.js');

describe('ProgressaoService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProgressaoService();
    process.env.TEMPO_PRODUCAO_MINUTOS = '2';
  });

  it('deve avançar lotes expirados e enviar notificação', async () => {
    const loteExpirado = { id: 1, numero_lote: 'L-01', status: LoteStatus.EM_PRODUCAO };
    mockLoteRepo.find.mockResolvedValue([loteExpirado] as never);

    // Acessa o método privado executar via cast de any para teste
    await (service as any).executar();

    expect(loteExpirado.status).toBe(LoteStatus.AGUARDANDO_INSPECAO);
    expect(mockLoteRepo.save).toHaveBeenCalledWith(loteExpirado);
    expect(mockNotificacaoService.criarNotificacaoParaPerfis).toHaveBeenCalledWith(
      expect.stringContaining('L-01'),
      'inspecao',
      ['inspetor']
    );
  });

  it('não deve fazer nada se não houver lotes expirados', async () => {
    mockLoteRepo.find.mockResolvedValue([] as never);

    await (service as any).executar();

    expect(mockLoteRepo.save).not.toHaveBeenCalled();
    expect(mockNotificacaoService.criarNotificacaoParaPerfis).not.toHaveBeenCalled();
  });
});
