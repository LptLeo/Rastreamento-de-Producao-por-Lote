import { jest } from '@jest/globals';
import { AppError } from '../../errors/AppError.js';
import { InsumoEstoqueStatus, Turno } from '../../entities/InsumoEstoque.js';
import { PerfilUsuario } from '../../entities/Usuario.js';
import type { Requisitante } from '../../utils/auth.utils.js';

import type { CriarInsumoEstoqueDTO, CriarInsumoEstoqueBulkDTO } from '../../dto/insumoEstoque.dto.js';

type JestMock = ReturnType<typeof jest.fn>;

// Mocks dos Repositórios
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

// Manager/DataSource
const mockEntityManager = {
  findOneBy: jest.fn(),
  findBy: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  getRepository: jest.fn((entity: { name?: string } | string | unknown) => {
    const name = (entity as { name?: string }).name || (entity as string);
    if (name === 'InsumoEstoque') return mockInsumoRepo;
    if (name === 'MateriaPrima') return mockMpRepo;
    if (name === 'Usuario') return mockUserRepo;
    return {};
  }),
};

jest.unstable_mockModule('../../config/AppDataSource.js', () => ({
  AppDataSource: {
    transaction: jest.fn((callback: (em: unknown) => unknown) => callback(mockEntityManager)),
    getRepository: jest.fn((entity: { name?: string } | string | unknown) => {
      const name = (entity as { name?: string }).name || (entity as string);
      if (name === 'InsumoEstoque') return mockInsumoRepo;
      if (name === 'MateriaPrima') return mockMpRepo;
      if (name === 'Usuario') return mockUserRepo;
      return {};
    }),
  },
}));

// Mock do NotificacaoService
const mockNotificacaoService = {
  criarNotificacaoParaPerfis: jest.fn(() => Promise.resolve()),
};

jest.unstable_mockModule('../notificacao.service.js', () => ({
  NotificacaoService: jest.fn().mockImplementation(() => mockNotificacaoService),
}));

// Import dinâmico
const { InsumoEstoqueService } = await import('../insumoEstoque.service.js');

describe('InsumoEstoqueService', () => {
  let service: InstanceType<typeof InsumoEstoqueService>;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockEntityManager.findOneBy as JestMock).mockImplementation((entity: { name?: string } | string | unknown) => {
      const name = (entity as { name?: string }).name || (entity as string);
      if (name === 'Usuario') return Promise.resolve({ id: 1 });
      return Promise.resolve(null);
    });
    service = new InsumoEstoqueService();
  });

  describe('criar()', () => {
    const dto = {
      materia_prima_id: 100,
      quantidade_inicial: 50.5,
      fornecedor: 'Fornecedor Teste',
      turno: 'manha' as Turno,
    };
    const requisitante: Requisitante = { id: 1, perfil: PerfilUsuario.OPERADOR };

    it('deve lançar erro se a matéria prima não for encontrada', async () => {
      (mockEntityManager.findOneBy as JestMock).mockResolvedValue(null);
      await expect(service.criar(dto as CriarInsumoEstoqueDTO, requisitante)).rejects.toThrow(AppError);
    });

    it('deve criar com sucesso', async () => {
      (mockEntityManager.findOneBy as JestMock).mockImplementation((entity: { name?: string } | string | unknown) => {
        const name = (entity as { name?: string }).name || (entity as string);
        if (name === 'MateriaPrima') return Promise.resolve({ id: 100, unidade_medida: 'KG' });
        return Promise.resolve({ id: 1 });
      });
      (mockEntityManager.count as JestMock).mockResolvedValue(5);
      (mockEntityManager.create as JestMock).mockReturnValue({ id: 10 });
      (mockEntityManager.save as JestMock).mockResolvedValue({ id: 10 });

      const result = await service.criar(dto as CriarInsumoEstoqueDTO, requisitante);
      expect(result.id).toBe(10);
    });
  });

  describe('criarBulk()', () => {
    it('deve usar bulk save com chunking', async () => {
      (mockEntityManager.findOneBy as JestMock).mockResolvedValue({ id: 1 });
      (mockEntityManager.findBy as JestMock).mockResolvedValue([{ id: 100, unidade_medida: 'KG' }]);
      (mockEntityManager.save as JestMock).mockImplementation((e: unknown, opt: unknown) => {
        expect(opt).toEqual({ chunk: 100 });
        return Promise.resolve(e);
      });

      const itensBulk = [{ materia_prima_id: 100, quantidade_inicial: 1, fornecedor: 'A', turno: 'manha' as Turno }];
      const req: Requisitante = { id: 1, perfil: PerfilUsuario.OPERADOR };
      await service.criarBulk({ itens: itensBulk } as CriarInsumoEstoqueBulkDTO, req);
      expect(mockEntityManager.save).toHaveBeenCalled();
    });
  });

  describe('atualizarStatus()', () => {
    it('deve disparar notificação ao mudar para disponivel', async () => {
      const insumoMock = { id: 1, status: InsumoEstoqueStatus.PENDENTE, materiaPrima: { nome: 'A' } };
      (mockInsumoRepo.findOne as JestMock).mockResolvedValue(insumoMock);
      (mockInsumoRepo.save as JestMock).mockResolvedValue(insumoMock);

      const req: Requisitante = { id: 1, perfil: PerfilUsuario.GESTOR };
      await service.atualizarStatus(1, InsumoEstoqueStatus.DISPONIVEL, req);
      expect(mockNotificacaoService.criarNotificacaoParaPerfis).toHaveBeenCalled();
    });
  });
});
