import { AppDataSource } from '../config/AppDataSource.js';
import { type Repository, ILike } from 'typeorm';
import { Lote } from '../entities/Lote.js';
import { InsumoEstoque } from '../entities/InsumoEstoque.js';
import { ConsumoInsumo } from '../entities/ConsumoInsumo.js';
import { AppError } from '../errors/AppError.js';
import { verificaPermissao, type Requisitante } from '../utils/auth.utils.js';
import { PerfilUsuario } from '../entities/Usuario.js';
import {
  PaginacaoQueryDto,
  formatarRespostaPaginada,
  type RespostaPaginada,
} from "../dto/paginacao.dto.js";

export class RastreabilidadeService {
  private loteRepo: Repository<Lote>;
  private consumoRepo: Repository<ConsumoInsumo>;
  private insumoRepo: Repository<InsumoEstoque>;

  constructor() {
    this.loteRepo = AppDataSource.getRepository(Lote);
    this.consumoRepo = AppDataSource.getRepository(ConsumoInsumo);
    this.insumoRepo = AppDataSource.getRepository(InsumoEstoque);
  }

  /** Autocomplete: busca simultânea em Lote e InsumoEstoque */
  autocomplete = async (q: string, requisitante: Requisitante) => {
    verificaPermissao(requisitante, [
      PerfilUsuario.GESTOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.OPERADOR,
    ]);

    const termo = `%${q}%`;

    const [lotes, insumos] = await Promise.all([
      this.loteRepo
        .createQueryBuilder('l')
        .leftJoinAndSelect('l.produto', 'p')
        .where('l.numero_lote ILIKE :termo', { termo })
        .limit(6)
        .getMany(),
      this.insumoRepo
        .createQueryBuilder('ie')
        .leftJoinAndSelect('ie.materiaPrima', 'mp')
        .where('ie.numero_lote_interno ILIKE :termo', { termo })
        .orWhere('ie.numero_lote_fornecedor ILIKE :termo', { termo })
        .addSelect(
          'CASE WHEN ie.quantidade_atual < ie.quantidade_inicial THEN 1 ELSE 0 END',
          'foi_usado',
        )
        .orderBy('foi_usado', 'DESC')
        .addOrderBy('ie.recebido_em', 'DESC')
        .limit(6)
        .getMany(),
    ]);

    return [
      ...lotes.map((l) => ({
        id: l.id,
        texto_exibicao: l.numero_lote,
        subtexto: l.produto?.nome ?? '—',
        tipo: 'LOTE_PRODUTO' as const,
        status: l.status,
      })),
      ...insumos.map((ie) => ({
        id: ie.id,
        texto_exibicao: ie.numero_lote_interno,
        subtexto: `${ie.materiaPrima?.nome ?? '—'} · Forn: ${ie.numero_lote_fornecedor}`,
        tipo: 'LOTE_INSUMO' as const,
        status: null,
      })),
    ];
  };

  /** Consulta por número de lote de produção */
  private consultarPorLote = async (termo: string) => {
    const lote = await this.loteRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.produto', 'produto')
      .leftJoinAndSelect('l.operador', 'operador')
      .leftJoinAndSelect('l.consumos', 'consumos')
      .leftJoinAndSelect('consumos.insumoEstoque', 'insumoEstoque')
      .leftJoinAndSelect('insumoEstoque.materiaPrima', 'materiaPrima')
      .leftJoinAndSelect('insumoEstoque.operador', 'operadorInsumo')
      .leftJoinAndSelect('l.inspecao', 'inspecao')
      .leftJoinAndSelect('inspecao.inspetor', 'inspetor')
      .where('l.numero_lote ILIKE :termo', { termo })
      .getOne();

    if (!lote) throw new AppError(`Nenhum lote encontrado com o número '${termo}'.`, 404);
    return lote;
  };

  /** Consulta reversa por código de lote de insumo (Recall) */
  private consultarPorInsumo = async (termo: string, query: PaginacaoQueryDto) => {
    const { pagina, limite } = query;
    const skip = (pagina - 1) * limite;
    const termoBusca = `%${termo}%`;

    // 1. Verificamos se esse insumo sequer existe no nosso estoque
    const insumoBase = await this.insumoRepo.findOne({
      where: [
        { numero_lote_interno: ILike(termoBusca) },
        { numero_lote_fornecedor: ILike(termoBusca) }
      ],
      relations: ['materiaPrima']
    });

    if (!insumoBase) {
      throw new AppError(`Insumo '${termo}' não encontrado no sistema.`, 404);
    }

    // 2. Buscamos todos os lotes que consumiram insumos que batem com esse termo
    const lotesRaw = await this.consumoRepo
      .createQueryBuilder('ci')
      .select('DISTINCT ci.lote_id', 'id')
      .innerJoin('ci.insumoEstoque', 'ie')
      .where('ie.numero_lote_interno ILIKE :termo OR ie.numero_lote_fornecedor ILIKE :termo', {
        termo: termoBusca,
      })
      .getRawMany();

    const total = lotesRaw.length;

    // Se o insumo existe mas nunca foi usado em produção, retornamos lista vazia graciosamente
    if (total === 0) {
      return formatarRespostaPaginada([[], 0], query);
    }

    // 3. Paginação manual dos IDs
    const idsAfetados = lotesRaw.slice(skip, skip + limite).map((r) => r.id || r.lote_id || r.ci_lote_id);

    // 4. Busca detalhada dos lotes afetados
    const consumos = await this.consumoRepo
      .createQueryBuilder('ci')
      .leftJoinAndSelect('ci.insumoEstoque', 'ie')
      .leftJoinAndSelect('ie.materiaPrima', 'mp')
      .leftJoinAndSelect('ci.lote', 'lote')
      .leftJoinAndSelect('lote.produto', 'produto')
      .leftJoinAndSelect('lote.operador', 'operador')
      .where('lote.id IN (:...idsAfetados)', { idsAfetados })
      .orderBy('lote.data_producao', 'DESC')
      .getMany();

    const lotesMap = new Map<
      number,
      {
        numero_lote: string;
        produto: string;
        data_producao: Date;
        status: string;
        operador_nome: string;
        insumos_correspondentes: { nome: string; lote_interno: string; quantidade: number; unidade: string }[];
      }
    >();

    for (const consumo of consumos) {
      const lote = consumo.lote;
      const entry = lotesMap.get(lote.id);
      const insumoInfo = {
        nome: consumo.insumoEstoque.materiaPrima.nome,
        lote_interno: consumo.insumoEstoque.numero_lote_interno,
        quantidade: Number(consumo.quantidade_consumida),
        unidade: consumo.insumoEstoque.materiaPrima.unidade_medida
      };

      if (entry) {
        entry.insumos_correspondentes.push(insumoInfo);
      } else {
        lotesMap.set(lote.id, {
          numero_lote: lote.numero_lote,
          produto: lote.produto.nome,
          data_producao: lote.data_producao,
          status: lote.status,
          operador_nome: lote.operador?.nome ?? '—',
          insumos_correspondentes: [insumoInfo],
        });
      }
    }

    const items = Array.from(lotesMap.values());
    return formatarRespostaPaginada([items, total], query);
  };
consultar = async (termo: string, q: PaginacaoQueryDto, requisitante: Requisitante) => {
  verificaPermissao(requisitante, [
    PerfilUsuario.GESTOR,
    PerfilUsuario.INSPETOR,
    PerfilUsuario.OPERADOR,
  ]);

  const ehLoteProduto = termo.toUpperCase().startsWith('LOT-');

  if (ehLoteProduto) {
    return {
      tipo: 'lote' as const,
      resultado: await this.consultarPorLote(`%${termo}%`),
    };
  }

  return {
    tipo: 'insumo' as const,
    resultado: await this.consultarPorInsumo(termo, q),
  };
};
}
