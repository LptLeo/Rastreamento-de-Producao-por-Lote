import type { Request, Response } from "express";
import type { InsumoLoteService } from "../services/InsumoLoteService.js";
import { vincularInsumosSchema } from "../dto/InsumoLoteDTO.js";
import { z } from "zod";

export class InsumoLoteController {
  private insumoLoteService: InsumoLoteService

  constructor(insumoLoteService: InsumoLoteService) {
    this.insumoLoteService = insumoLoteService;
  }

  vincular = async (req: Request, res: Response) => {
    try {
      const insumosValidados = vincularInsumosSchema.parse(req.body);
      const loteId = parseInt(req.params.loteId as string);

      const resultado = await this.insumoLoteService.vincularInsumos(loteId, insumosValidados);

      return res.status(201).json(resultado);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Erro de validação nos campos de insumo",
          errors: error.issues
        });
      }
      return res.status(400).json({ message: error.message });
    }
  };

  listarPorLote = async (req: Request, res: Response) => {
    try {
      const loteId = parseInt(req.params.loteId as string);
      const insumos = await this.insumoLoteService.listarInsumosPorLote(loteId);
      return res.json(insumos);
    } catch (error: any) {
      return res.status(404).json({ message: error.message });
    }
  };

  remover = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      await this.insumoLoteService.removerInsumo(id);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  };

  rastreabilidadeReversa = async (req: Request, res: Response) => {
    try {
      const { termo } = req.query;

      if (!termo) {
        return res.status(400).json({ message: "Informe o código ou lote do insumo para a busca." });
      }

      const lotesAfetados = await this.insumoLoteService.getRastreabilidadeReversa(String(termo));
      return res.json(lotesAfetados);
    } catch (error) {
      return res.status(500).json({ message: "Erro interno ao processar rastreabilidade." });
    }
  };
}