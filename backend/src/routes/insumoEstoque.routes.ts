import { Router } from 'express';
import * as ctrl from '../controllers/insumoEstoque.controller.js';
import { validateBody } from '../middlewares/validateBody.js';
import { validateQuery } from '../middlewares/validateQuery.js';
import {
  criarInsumoEstoqueSchema,
  criarInsumoEstoqueBulkSchema,
  ListarDisponiveisQueryDto,
  ListInsumosQueryDto,
} from '../dto/insumoEstoque.dto.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { PerfilUsuario } from '../entities/Usuario.js';

const router = Router();

router.get('/', roleGuard(PerfilUsuario.OPERADOR), validateQuery(ListInsumosQueryDto), ctrl.listar);
router.get('/stats/contagem', roleGuard(PerfilUsuario.OPERADOR), ctrl.getContagem);
router.get(
  '/disponiveis',
  roleGuard(PerfilUsuario.OPERADOR),
  validateQuery(ListarDisponiveisQueryDto),
  ctrl.listarDisponiveis,
);
router.get('/:id', roleGuard(PerfilUsuario.OPERADOR), ctrl.buscarPorId);
router.patch('/:id/status', roleGuard(PerfilUsuario.OPERADOR), ctrl.atualizarStatus);
// Apenas OPERADOR (e GESTOR) podem registrar entradas de insumo no estoque
router.post(
  '/bulk',
  roleGuard(PerfilUsuario.OPERADOR),
  validateBody(criarInsumoEstoqueBulkSchema),
  ctrl.criarBulk,
);
router.post(
  '/',
  roleGuard(PerfilUsuario.OPERADOR),
  validateBody(criarInsumoEstoqueSchema),
  ctrl.criar,
);

export default router;
