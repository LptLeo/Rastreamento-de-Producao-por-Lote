import { Router } from "express";
import * as ctrl from "../controllers/produto.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { validateQuery } from "../middlewares/validateQuery.js";
import { criarProdutoSchema, atualizarReceitaSchema, ListProdutosQueryDto, alternarStatusProdutoSchema } from "../dto/produto.dto.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

const router = Router();

router.get("/", validateQuery(ListProdutosQueryDto), ctrl.listar);
router.get("/categorias", ctrl.listarCategorias);
router.get("/linhas", ctrl.listarLinhas);
router.get("/contagem", ctrl.getContagem);
router.get("/:id", ctrl.buscarPorId);
// Apenas GESTOR pode criar produtos e alterar receitas (regra de negócio #1)
router.post("/", roleGuard(PerfilUsuario.GESTOR), validateBody(criarProdutoSchema), ctrl.criar);
router.patch("/:id/receita", roleGuard(PerfilUsuario.GESTOR), validateBody(atualizarReceitaSchema), ctrl.atualizarReceita);
router.patch("/:id/status", roleGuard(PerfilUsuario.GESTOR), validateBody(alternarStatusProdutoSchema), ctrl.alternarStatus);

export default router;
