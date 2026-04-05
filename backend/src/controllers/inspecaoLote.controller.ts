import type { Request, Response } from "express";
import { InspecaoLoteService } from "../services/inspecaoLote.service.js";
import { registrarInspecaoSchema } from "../dto/inspecaoLote.dto.js";
import { getRequisitante } from "../utils/auth.utils.js";
import { AppError } from "../errors/AppError.js";

export class InspecaoLoteController {
  private inspecaoLoteService: InspecaoLoteService;

  constructor() {
    this.inspecaoLoteService = new InspecaoLoteService();
  }

  registrar = async (req: Request, res: Response) => {
    const loteId = parseInt(req.params.loteId as string);
    if (isNaN(loteId)) throw new AppError("ID do lote inválido.", 400);

    const dto = registrarInspecaoSchema.parse(req.body);
    const inspecao = await this.inspecaoLoteService.registrarInspecao(
      loteId,
      dto,
      getRequisitante(req)
    );

    return res.status(201).json(inspecao);
  };

  buscarPorLote = async (req: Request, res: Response) => {
    const loteId = parseInt(req.params.loteId as string);
    if (isNaN(loteId)) throw new AppError("ID do lote inválido.", 400);

    const inspecao = await this.inspecaoLoteService.buscarInspecaoPorLote(
      loteId,
      getRequisitante(req)
    );

    return res.json(inspecao);
  };
}