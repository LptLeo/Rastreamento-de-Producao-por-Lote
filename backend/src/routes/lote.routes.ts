import { Router } from 'express';
import { LoteController } from '../controllers/lote.controller.js';
import { authGuard } from '../middlewares/authGuard.js';

const loteRoutes = Router();
const loteController = new LoteController();
loteRoutes.use(authGuard);

loteRoutes.post("/", loteController.create);
loteRoutes.get("/", loteController.getAll);
loteRoutes.post("/:id/insumos", loteController.vincularInsumos);
loteRoutes.patch("/:id/encerrar", loteController.encerrar);
loteRoutes.get("/:id", loteController.getDetalhes);

export default loteRoutes;