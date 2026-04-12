import type { Request, Response } from 'express';
import { LoteService } from '../services/lote.service.js';
import type { LoteStatus } from '../entities/Lote.js';
import { getRequisitante } from '../utils/auth.utils.js';
import { AppError } from '../errors/AppError.js';

export class LoteController {
  private loteService: LoteService;

  constructor() {
    this.loteService = new LoteService();
  }

  create = async (req: Request, res: Response) => {
    const novoLote = await this.loteService.createLote(req.body, getRequisitante(req));

    return res.status(201).json(novoLote);
  }

  getAll = async (req: Request, res: Response) => {
    const filtros = {
      produto_id: req.query.produto_id as string,
      status: req.query.status as LoteStatus,
      dataInicio: req.query.dataInicio ? new Date(req.query.dataInicio as string) : undefined,
      dataFim: req.query.dataFim ? new Date(req.query.dataFim as string) : undefined
    }

    const lotes = await this.loteService.getAllLotes(getRequisitante(req), filtros);

    return res.status(200).json(lotes);
  }

  encerrar = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new AppError("ID do lote não fornecido.", 400);

    const loteEncerrado = await this.loteService.encerrarProducao(Number(id), getRequisitante(req));

    if (!loteEncerrado) throw new AppError("Lote não encontrado.", 404);

    return res.json(loteEncerrado);
  }

  getDetalhes = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) throw new AppError("ID do lote não fornecido.", 400);

    const detalhes = await this.loteService.getLoteById(Number(id), getRequisitante(req));

    if (!detalhes) throw new AppError("Lote não encontrado.", 404);

    return res.json(detalhes);
  }

  updateStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) throw new AppError("ID do lote não fornecido.", 400);
    if (!status) throw new AppError("Status não fornecido.", 400);

    const loteAtualizado = await this.loteService.updateStatus(Number(id), status, getRequisitante(req));

    if (!loteAtualizado) throw new AppError("Lote não encontrado.", 404);

    return res.json(loteAtualizado);
  }

  buscarSugestoes = async (req: Request, res: Response) => {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.json([]);
    }

    const sugestoes = await this.loteService.buscarSugestoes(q, getRequisitante(req));

    return res.json(sugestoes);
  }
}