import type { Request, Response } from "express";
import { InsumoLoteService } from "../services/insumoLote.service.js";
import { vincularInsumosSchema } from "../dto/insumoLote.dto.js";
import { getRequisitante } from "../utils/auth.utils.js";
import { AppError } from "../errors/AppError.js";

export class InsumoLoteController {
  private insumoLoteService: InsumoLoteService;

  constructor() {
    this.insumoLoteService = new InsumoLoteService();
  }

  vincular = async (req: Request, res: Response) => {
    const loteId = parseInt(req.params.loteId as string);
    if (isNaN(loteId)) throw new AppError("ID do lote inválido.", 400);

    const insumosValidados = vincularInsumosSchema.parse(req.body);
    const resultado = await this.insumoLoteService.vincularInsumos(loteId, insumosValidados, getRequisitante(req));

    return res.status(201).json(resultado);
  };

  listarPorLote = async (req: Request, res: Response) => {
    const loteId = parseInt(req.params.loteId as string);
    if (isNaN(loteId)) throw new AppError("ID do lote inválido.", 400);

    const insumos = await this.insumoLoteService.listarInsumosPorLote(loteId, getRequisitante(req));
    return res.json(insumos);
  };

  remover = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) throw new AppError("ID do insumo inválido.", 400);

    await this.insumoLoteService.removerInsumo(id, getRequisitante(req));
    return res.status(204).send();
  };
}