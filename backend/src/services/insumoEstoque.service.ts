import { ILike, type Repository, In, EntityManager } from "typeorm";
import { AppDataSource } from '../config/AppDataSource.js';
import { InsumoEstoque, Turno, InsumoEstoqueStatus } from '../entities/InsumoEstoque.js';
import { MateriaPrima } from '../entities/MateriaPrima.js';
import { PerfilUsuario, Usuario } from '../entities/Usuario.js';
import { AppError } from '../errors/AppError.js';
import { verificaPermissao, type Requisitante } from '../utils/auth.utils.js';
import type { CriarInsumoEstoqueDTO, ListInsumosQueryDto } from '../dto/insumoEstoque.dto.js';
import { formatarRespostaPaginada, type RespostaPaginada } from '../dto/paginacao.dto.js';
import { NotificacaoService } from './notificacao.service.js';
import { TipoNotificacao } from '../entities/Notificacao.js';

export class InsumoEstoqueService {
  private repo: Repository<InsumoEstoque>;
  private mpRepo: Repository<MateriaPrima>;
  private usuarioRepo: Repository<Usuario>;

  constructor() {
    this.repo = AppDataSource.getRepository(InsumoEstoque);
    this.mpRepo = AppDataSource.getRepository(MateriaPrima);
    this.usuarioRepo = AppDataSource.getRepository(Usuario);
  }

  /** Gera número de lote interno sequencial no padrão INS-DDMMAAAA-N (N = item do dia) */
  private async gerarNumeroLote(manager?: EntityManager): Promise<string> {
    const hoje = new Date();
    const dia = hoje.getUTCDate().toString().padStart(2, '0');
    const mes = (hoje.getUTCMonth() + 1).toString().padStart(2, '0');
    const ano = hoje.getUTCFullYear();

    const prefixo = `INS-${dia}${mes}${ano}-`;

    const repo = manager ? manager.getRepository(InsumoEstoque) : this.repo;

    const contagem = await repo.count({
      where: { numero_lote_interno: ILike(`${prefixo}%`) },
    });

    const sequencial = contagem + 1;
    const numeroLote = `${prefixo}${sequencial}`;

    return numeroLote;
  }

  criar = async (
    dto: CriarInsumoEstoqueDTO,
    requisitante: Requisitante,
  ): Promise<InsumoEstoque> => {
    return AppDataSource.transaction(async (manager) => {
      verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

      const materiaPrima = await manager.findOneBy(MateriaPrima, { id: dto.materia_prima_id });
      if (!materiaPrima) throw new AppError('Matéria-prima não encontrada.', 404);

      if (materiaPrima.unidade_medida === 'UN' && !Number.isInteger(dto.quantidade_inicial)) {
        throw new AppError("A quantidade para unidade 'UN' não pode ser fracionada.", 400);
      }

      const operador = await manager.findOneBy(Usuario, { id: requisitante.id });
      if (!operador) throw new AppError('Operador não encontrado.', 404);

      const numeroLote = await this.gerarNumeroLote(manager);

      const entidade = manager.create(InsumoEstoque, {
        materiaPrima,
        status: (dto.status as InsumoEstoqueStatus) || InsumoEstoqueStatus.DISPONIVEL,
        numero_lote_fornecedor: dto.numero_lote_fornecedor || '',
        numero_lote_interno: numeroLote,
        quantidade_inicial: dto.quantidade_inicial,
        quantidade_atual: dto.quantidade_inicial,
        fornecedor: dto.fornecedor,
        codigo_interno: dto.codigo_interno || '',
        turno: dto.turno as Turno,
        operador,
        data_validade: dto.data_validade ?? null,
        observacoes: dto.observacoes || '',
      });

      return manager.save(entidade);
    });
  };

  criarBulk = async (
    dto: { itens: CriarInsumoEstoqueDTO[] },
    requisitante: Requisitante,
  ): Promise<InsumoEstoque[]> => {
    return AppDataSource.transaction(async (manager) => {
      verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

      const operador = await manager.findOneBy(Usuario, { id: requisitante.id });
      if (!operador) throw new AppError('Operador não encontrado.', 404);

      const mpIds = dto.itens.map((i) => i.materia_prima_id);
      const materiasPrimas = await manager.findBy(MateriaPrima, { id: In(mpIds) });

      const resultados: InsumoEstoque[] = [];

      for (const itemDto of dto.itens) {
        const mp = materiasPrimas.find((m) => m.id === itemDto.materia_prima_id);
        if (!mp) throw new AppError(`Matéria-prima ${itemDto.materia_prima_id} não encontrada.`, 404);

        const numeroLote = await this.gerarNumeroLote(manager);

        const entidade = manager.create(InsumoEstoque, {
          materiaPrima: mp,
          status: (itemDto.status as InsumoEstoqueStatus) || InsumoEstoqueStatus.DISPONIVEL,
          numero_lote_fornecedor: itemDto.numero_lote_fornecedor || '',
          numero_lote_interno: numeroLote,
          quantidade_inicial: itemDto.quantidade_inicial,
          quantidade_atual: itemDto.quantidade_inicial,
          fornecedor: itemDto.fornecedor,
          codigo_interno: itemDto.codigo_interno || '',
          turno: itemDto.turno as Turno,
          operador,
          data_validade: itemDto.data_validade ?? null,
          observacoes: itemDto.observacoes || '',
        });

        const salvo = await manager.save(entidade);
        resultados.push(salvo);
      }

      return resultados;
    });
  };

  listar = async (
    query: ListInsumosQueryDto,
    requisitante: Requisitante,
  ): Promise<RespostaPaginada<InsumoEstoque>> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    const { pagina, limite, busca, materia_prima_id, esgotado, fornecedor, ordenarPor, status } =
      query;
    const skip = (pagina - 1) * limite;

    const queryBuilder = this.repo
      .createQueryBuilder('ie')
      .leftJoinAndSelect('ie.materiaPrima', 'mp')
      .leftJoinAndSelect('ie.operador', 'op')
      .skip(skip)
      .take(limite);

    // Ordenação Dinâmica
    switch (ordenarPor) {
      case 'menor_estoque':
        queryBuilder.orderBy('ie.quantidade_atual', 'ASC');
        break;
      case 'maior_estoque':
        queryBuilder.orderBy('ie.quantidade_atual', 'DESC');
        break;
      case 'mais_recente':
        queryBuilder.orderBy('ie.recebido_em', 'DESC');
        break;
      case 'menos_recente':
        queryBuilder.orderBy('ie.recebido_em', 'ASC');
        break;
      default:
        queryBuilder.orderBy('ie.recebido_em', 'DESC')
          .addOrderBy('ie.id', 'DESC')
          .addOrderBy('mp.nome', 'ASC');
    }

    if (busca) {
      queryBuilder.andWhere(
        '(ie.numero_lote_interno ILIKE :busca OR ie.numero_lote_fornecedor ILIKE :busca OR mp.nome ILIKE :busca)',
        { busca: `%${busca}%` },
      );
    }

    if (materia_prima_id) {
      queryBuilder.andWhere('mp.id = :mpId', { mpId: Number(materia_prima_id) });
    }

    if (esgotado) {
      queryBuilder.andWhere('ie.quantidade_atual = 0');
    }

    if (fornecedor) {
      queryBuilder.andWhere('ie.fornecedor ILIKE :fornecedor', { fornecedor: `%${fornecedor}%` });
    }

    if (status && status.length > 0) {
      queryBuilder.andWhere('ie.status IN (:...status)', { status });
    }

    const [itens, total] = await queryBuilder.getManyAndCount();

    return formatarRespostaPaginada([itens, total], query);
  };

  atualizarStatus = async (
    id: number,
    novoStatus: InsumoEstoqueStatus,
    requisitante: Requisitante,
  ): Promise<InsumoEstoque> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    const insumo = await this.repo.findOne({ where: { id }, relations: ['materiaPrima'] });
    if (!insumo) throw new AppError('Lote de insumo não encontrado.', 404);

    const statusAnterior = insumo.status;
    insumo.status = novoStatus;
    const salvo = await this.repo.save(insumo);

    // Se o status mudou para DISPONIVEL, notifica os gestores
    if (statusAnterior !== InsumoEstoqueStatus.DISPONIVEL && novoStatus === InsumoEstoqueStatus.DISPONIVEL) {
      const notificacaoService = new NotificacaoService();
      await notificacaoService.criarNotificacaoParaPerfis(
        `Logística: O lote de insumo ${insumo.numero_lote_interno} (${insumo.materiaPrima.nome}) foi recebido e está disponível para produção.`,
        TipoNotificacao.SISTEMA,
        [PerfilUsuario.GESTOR],
        { link: '/app/insumos', filtro: insumo.materiaPrima.nome }
      );
    }

    return salvo;
  };

  buscarPorId = async (id: number, requisitante: Requisitante): Promise<InsumoEstoque> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    const insumo = await this.repo.findOne({
      where: { id },
      relations: ['materiaPrima', 'operador'],
    });

    if (!insumo) throw new AppError('Lote de insumo não encontrado.', 404);
    return insumo;
  };

  getContagem = async (
    requisitante: Requisitante,
  ): Promise<{ total: number; comSaldo: number; esgotados: number }> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    const stats = await this.repo
      .createQueryBuilder('ie')
      .select('COUNT(*)', 'total')
      .addSelect(
        "COUNT(*) FILTER (WHERE ie.quantidade_atual > 0 AND ie.status = 'disponivel')",
        'comSaldo',
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE ie.quantidade_atual = 0 AND ie.status = 'disponivel')",
        'esgotados',
      )
      .where("ie.status IN ('disponivel', 'pendente')") // A caminho não conta como estoque físico real
      .getRawOne();

    return {
      total: Number(stats.total),
      comSaldo: Number(stats.comSaldo),
      esgotados: Number(stats.esgotados),
    };
  };

  listarDisponiveis = async (
    materiaPrimaIds: number[],
    requisitante: Requisitante,
  ): Promise<InsumoEstoque[]> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    if (materiaPrimaIds.length === 0) return [];

    return this.repo
      .createQueryBuilder('ie')
      .leftJoinAndSelect('ie.materiaPrima', 'mp')
      .leftJoinAndSelect('ie.operador', 'op')
      .where('mp.id IN (:...ids)', { ids: materiaPrimaIds })
      .andWhere('ie.quantidade_atual > 0')
      .andWhere('ie.status = :status', { status: InsumoEstoqueStatus.DISPONIVEL })
      .andWhere('ie.ativo = true')
      .orderBy('mp.nome', 'ASC')
      .addOrderBy('ie.recebido_em', 'DESC')
      .getMany();
  };

  /**
   * Padrão Ouro - Self-Healing:
   * Procura por lotes que ficaram travados no status 'a_caminho' (ex: queda do servidor).
   * Se um lote estiver 'a_caminho' há mais de 1 minuto, move para 'pendente' automaticamente.
   */
  resgatarLotesTravados = async (): Promise<void> => {
    const umMinutoAtras = new Date(Date.now() - 60000);
    
    const resultado = await this.repo
      .createQueryBuilder()
      .update(InsumoEstoque)
      .set({ status: InsumoEstoqueStatus.PENDENTE })
      .where("status = :status", { status: InsumoEstoqueStatus.A_CAMINHO })
      .andWhere("criado_em < :data", { data: umMinutoAtras })
      .execute();

    if (resultado.affected && resultado.affected > 0) {
      console.log(`[Self-Healing] 🛠️ ${resultado.affected} lotes em trânsito foram resgatados.`);
    }
  };
}
