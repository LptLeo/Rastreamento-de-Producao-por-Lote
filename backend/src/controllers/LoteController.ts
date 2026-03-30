import type { Request, Response } from 'express';
import { LoteService } from '../services/LoteService.js';
import type { LoteStatus } from '../entities/Lote.js';

export class LoteController {
  private loteService: LoteService;

  constructor() {
    this.loteService = new LoteService();
  }

  async create(req: Request, res: Response) {
    try {
      const novoLote = await this.loteService.createLote(req.body);
      return res.status(201).json(novoLote);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const filtros = {
        produto_id: req.query.produto_id as string,
        status: req.query.status as LoteStatus,
        dataInicio: req.query.dataInicio ? new Date(req.query.dataInicio as string) : undefined,
        dataFim: req.query.dataFim ? new Date(req.query.dataFim as string) : undefined
      }

      const lotes = await this.loteService.getAllLotes(filtros);
      return res.status(200).json(lotes);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async vincularInsumos(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const insumos = req.body;

      const resultado = await this.loteService.vincularInsumos(Number(id), insumos);

      return res.json(resultado);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async encerrar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const loteEncerrado = await this.loteService.encerrarProducao(Number(id));
      return res.json(loteEncerrado);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async getDetalhes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const detalhes = await this.loteService.getLoteById(Number(id));
      return res.json(detalhes);
    } catch (error: any) {
      return res.status(404).json({ message: error.message });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const loteAtualizado = await this.loteService.updateStatus(Number(id), status);

      return res.json(loteAtualizado);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async reversa(req: Request, res: Response) {
    try {
      const { loteOrigem } = req.params;
      if (!loteOrigem) return res.status(400).json({ message: 'Parâmetro loteOrigem é obrigatório' });
      const lotesAfetados = await this.loteService.getRastreabilidade({ codigo_insumo: loteOrigem as string });
      return res.json(lotesAfetados);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async rastreabilidade(req: Request, res: Response) {
    try {
      const { lote, insumo } = req.query;

      const loteQuery = lote as string | undefined;
      const insumoQuery = insumo as string | undefined;

      const filtros: any = {};
      if (loteQuery) filtros.numero_lote = loteQuery;
      if (insumoQuery) filtros.codigo_insumo = insumoQuery;

      const consulta = await this.loteService.getRastreabilidade(filtros);

      return res.json(consulta);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async dashboard(req: Request, res: Response) {
    try {
      const metricas = await this.loteService.getDashboardMetrics();

      return res.json(metricas);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }
}