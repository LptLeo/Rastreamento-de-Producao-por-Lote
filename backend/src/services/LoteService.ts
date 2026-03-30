import { AppDataSource } from "../config/AppDataSource.js";
import { Between, LessThanOrEqual, Like, MoreThanOrEqual, type Repository } from "typeorm";
import { Lote, LoteStatus, Turno } from "../entities/Lote.js";
import type { LoteDTO } from "../dto/loteDTO.js";
import { InsumoLote } from "../entities/InsumoLote.js";
import type { InsumoVinculoDTO } from "../dto/InsumoLoteDTO.js";

interface IFiltros {
  produto_id?: string;
  status?: LoteStatus;
  dataInicio?: Date | undefined;
  dataFim?: Date | undefined;
}

export interface IDashboardMetrics {
  produzidosHoje: number;
  unidadesHoje: number;
  taxaAprovacaoMes: number;
  aguardandoInspecao: number;
  ultimosLotes: Lote[];
}

export class LoteService {
  private loteRepo: Repository<Lote>;
  private insumoLoteRepo: Repository<InsumoLote>;

  constructor() {
    this.loteRepo = AppDataSource.getRepository(Lote);
    this.insumoLoteRepo = AppDataSource.getRepository(InsumoLote);
  }
  // // // // //
  // Funções de Escrita
  // // // // //

  // createLote
  async createLote(loteDTO: LoteDTO) {
    const numeroGerado = await this.gerarNumeroLote(loteDTO.data_producao);
    const { observacoes, ...restDTO } = loteDTO;

    const novoLote = this.loteRepo.create({
      ...restDTO,
      ...(observacoes != null && { observacoes }),
      operador: { id: loteDTO.operador } as any,
      produto: { id: loteDTO.produto } as any,
      turno: loteDTO.turno as Turno,
      numero_lote: numeroGerado,
      status: LoteStatus.em_producao,
    });

    return await this.loteRepo.save(novoLote);
  }

  // gerarNumeroLote
  private async gerarNumeroLote(dataInput: Date | string = new Date()) {
    const data = typeof dataInput === 'string' ? new Date(dataInput) : dataInput;

    const inicioDia = new Date(data);
    inicioDia.setHours(0, 0, 0, 0);

    const fimDia = new Date(data);
    fimDia.setHours(23, 59, 59, 999);

    const totalHoje = await this.loteRepo.count({
      where: {
        aberto_em: Between(inicioDia, fimDia)
      }
    });

    const ano = data.getFullYear();
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const dia = data.getDate().toString().padStart(2, '0');

    const sequencial = (totalHoje + 1).toString().padStart(3, '0');

    const novoNumeroLote = `LOTE-${ano}${mes}${dia}-${sequencial}`;

    return novoNumeroLote;
  }

  // vincularInsumos
  async vincularInsumos(loteId: number, insumos: InsumoVinculoDTO[]) {
    const lote = await this.loteRepo.findOneBy({ id: loteId });

    if (!lote) {
      throw new Error("Lote não encontrado.");
    }

    if (lote.status !== LoteStatus.em_producao) {
      throw new Error("Só é possível vincular insumos a lotes em produção.");
    }

    const novosInsumos = insumos.map(insumo => {
      return this.insumoLoteRepo.create({
        ...insumo,
        lote: lote
      })
    });

    return await this.insumoLoteRepo.save(novosInsumos);
  }

  // encerrarProducao
  async encerrarProducao(loteId: number) {
    const lote = await this.loteRepo.findOneBy({ id: loteId });

    if (!lote) {
      throw new Error("Lote não encontrado.");
    }

    if (lote.status !== LoteStatus.em_producao) {
      throw new Error(`Não é possível encerrar um lote com status: ${lote.status}`);
    }

    const contagemInsumos = await this.insumoLoteRepo.count({
      where: { lote: { id: loteId } }
    });

    if (contagemInsumos === 0) {
      throw new Error("Não é possível encerrar um lote sem insumos vinculados.");
    }

    lote.status = LoteStatus.aguardando_inspecao;
    lote.encerrado_em = new Date();

    return await this.loteRepo.save(lote);
  }

  // updateStatus
  async updateStatus(loteId: number, novoStatus: LoteStatus, usuarioPerfil?: string) {
    const lote = await this.loteRepo.findOneBy({ id: loteId });
    if (!lote) throw new Error("Lote não encontrado.");

    lote.status = novoStatus;

    return await this.loteRepo.save(lote);
  }

  // // // // //
  // Funções de Leitura
  // // // // //

  // getAllLotes
  async getAllLotes(filtros?: IFiltros) {
    if (filtros?.dataInicio && filtros?.dataFim && filtros.dataInicio > filtros.dataFim) {
      throw new Error("A data de início não pode ser posterior à data de fim.");
    }

    const where: any = {};

    if (filtros) {
      if (filtros.produto_id) {
        where.produto = { id: Like(`%${filtros.produto_id}%`) };
      }

      if (filtros.status) where.status = filtros.status;

      if (filtros.dataInicio && filtros.dataFim) {
        where.aberto_em = Between(filtros.dataInicio, filtros.dataFim);
      } else if (filtros.dataInicio) {
        where.aberto_em = MoreThanOrEqual(filtros.dataInicio);
      } else if (filtros.dataFim) {
        where.aberto_em = LessThanOrEqual(filtros.dataFim);
      }
    }

    return await this.loteRepo.find({
      where,
      order: { aberto_em: "DESC" },
      relations: ['operador', 'produto']
    });
  }

  // getLoteById
  async getLoteById(loteId: number) {
    const lote = await this.loteRepo.findOne({
      where: { id: loteId },
      relations: ['operador', 'produto', 'insumos', 'inspecao', 'inspecao.inspetor']
    });

    if (!lote) throw new Error("Lote não encontrado.");

    return lote;
  }

  // getRastreabilidade
  async getRastreabilidade(filtros: { numero_lote?: string; codigo_insumo?: string }) {
    if (filtros.numero_lote) {
      const lote = await this.loteRepo.findOne({
        where: { numero_lote: filtros.numero_lote },
        relations: ['operador', 'produto', 'insumos', 'inspecao', 'inspecao.inspetor']
      });
      if (!lote) throw new Error("Lote não encontrado.");

      return lote;
    } else if (filtros.codigo_insumo) {
      const vinculos = await this.insumoLoteRepo.find({
        where: [
          { codigo_insumo: filtros.codigo_insumo },
          { lote_insumo: filtros.codigo_insumo },
          { lote_origem: filtros.codigo_insumo }
        ],
        relations: ['lote', 'lote.produto', 'lote.operador']
      });

      const lotesMap = new Map();
      for (const v of vinculos) {
        if (!lotesMap.has(v.lote.id)) {
          lotesMap.set(v.lote.id, v.lote);
        }
      }

      return Array.from(lotesMap.values());
    }

    throw new Error("Parâmetros insuficientes para rastreabilidade.");
  }

  // getDashboardMetrics
  async getDashboardMetrics(): Promise<IDashboardMetrics> {
    const hoje = new Date();
    const inicioDia = new Date(hoje.setHours(0, 0, 0, 0));
    const fimDia = new Date(hoje.setHours(23, 59, 59, 999));

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const lotesHoje = await this.loteRepo.find({
      where: { aberto_em: Between(inicioDia, fimDia) }
    });

    const produzidosHoje = lotesHoje.length;
    const unidadesHoje = lotesHoje.reduce((acc, lote) => acc + lote.quantidade_produzida, 0);

    const aguardandoInspecao = await this.loteRepo.count({
      where: { status: LoteStatus.aguardando_inspecao }
    });

    const todosDoMes = await this.loteRepo.find({
      where: { aberto_em: MoreThanOrEqual(inicioMes) }
    });

    let aprovados = 0;
    let inspecionados = 0;
    for (const l of todosDoMes) {
      if ([LoteStatus.aprovado, LoteStatus.aprovado_restricao, LoteStatus.reprovado].includes(l.status as LoteStatus)) {
        inspecionados++;
        if (l.status === LoteStatus.aprovado) {
          aprovados++;
        }
      }
    }

    const taxaAprovacaoMes = inspecionados > 0 ? (aprovados / inspecionados) * 100 : 0;

    const ultimosLotes = await this.loteRepo.find({
      order: { aberto_em: "DESC" },
      take: 10,
      relations: ['produto', 'operador']
    });

    return {
      produzidosHoje,
      unidadesHoje,
      taxaAprovacaoMes: Number(taxaAprovacaoMes.toFixed(2)),
      aguardandoInspecao,
      ultimosLotes
    };
  }
}