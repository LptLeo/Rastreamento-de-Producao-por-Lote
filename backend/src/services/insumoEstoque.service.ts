import { ILike, type Repository } from "typeorm";
import { AppDataSource } from '../config/AppDataSource.js';
import { InsumoEstoque, Turno, InsumoEstoqueStatus } from '../entities/InsumoEstoque.js';
import { MateriaPrima } from '../entities/MateriaPrima.js';
import { PerfilUsuario, Usuario } from '../entities/Usuario.js';
import { AppError } from '../errors/AppError.js';
import { verificaPermissao, type Requisitante } from '../utils/auth.utils.js';
import type { CriarInsumoEstoqueDTO, ListInsumosQueryDto } from '../dto/insumoEstoque.dto.js';
import { formatarRespostaPaginada, type RespostaPaginada } from '../dto/paginacao.dto.js';

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
  private async gerarNumeroLote(): Promise<string> {
    const hoje = new Date();
    const dia = hoje.getUTCDate().toString().padStart(2, '0');
    const mes = (hoje.getUTCMonth() + 1).toString().padStart(2, '0');
    const ano = hoje.getUTCFullYear();

    const prefixo = `INS-${dia}${mes}${ano}-`;

    const contagem = await this.repo.count({
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
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    const materiaPrima = await this.mpRepo.findOneBy({ id: dto.materia_prima_id });
    if (!materiaPrima) throw new AppError('Matéria-prima não encontrada.', 404);

    if (materiaPrima.unidade_medida === 'UN' && !Number.isInteger(dto.quantidade_inicial)) {
      throw new AppError("A quantidade para unidade 'UN' não pode ser fracionada.", 400);
    }

    const operador = await this.usuarioRepo.findOneBy({ id: requisitante.id });
    if (!operador) throw new AppError('Operador não encontrado.', 404);

    const numeroLote = await this.gerarNumeroLote();

    const entidade = this.repo.create({
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

    return this.repo.save(entidade);
  };

  listar = async (
    query: ListInsumosQueryDto,
    requisitante: Requisitante,
  ): Promise<RespostaPaginada<InsumoEstoque>> => {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

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
        queryBuilder.orderBy('ie.recebido_em', 'DESC').addOrderBy('mp.nome', 'ASC');
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

    insumo.status = novoStatus;
    return this.repo.save(insumo);
  };

  buscarPorId = async (id: number, requisitante: Requisitante): Promise<InsumoEstoque> => {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

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
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

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
}
