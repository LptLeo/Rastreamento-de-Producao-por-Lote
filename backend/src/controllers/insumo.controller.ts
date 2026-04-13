import type { Request, Response } from "express";
import { InsumoService } from "../services/insumo.service.js";
import { getRequisitante } from "../utils/auth.utils.js";

const insumoService = new InsumoService();

export const getAllInsumos = async (req: Request, res: Response) => {
  try {
    const insumos = await insumoService.getAllInsumos(getRequisitante(req));
    res.json(insumos);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
