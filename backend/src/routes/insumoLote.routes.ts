import { Router } from "express";
import { InsumoLoteController } from "../controllers/insumoLote.controller.js";
import { authGuard } from "../middlewares/authGuard.js";
import { validateBody } from "../middlewares/validateBody.js";
import { vincularInsumosSchema } from "../dto/insumoLote.dto.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

const insumoRoutes = Router();
const insumoController = new InsumoLoteController();

insumoRoutes.use(authGuard);

insumoRoutes.post("/lotes/:loteId/insumos", roleGuard(PerfilUsuario.OPERADOR), validateBody(vincularInsumosSchema), insumoController.vincular);
insumoRoutes.get("/lotes/:loteId/insumos", roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR), insumoController.listarPorLote);
insumoRoutes.delete("/insumos/:id", roleGuard(PerfilUsuario.OPERADOR), insumoController.remover);

export default insumoRoutes;