import { Router } from 'express';
import * as ctrl from '../controllers/events.controller.js';
import { authGuard } from '../middlewares/authGuard.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { PerfilUsuario } from '../entities/Usuario.js';

const router = Router();

/**
 * POST / → Gera ticket SSE temporário
 * Requer JWT válido (authGuard inline) + qualquer perfil autenticado.
 * GESTOR é sempre permitido pelo roleGuard internamente.
 */
router.post(
  '/ticket',
  authGuard,
  roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR),
  ctrl.gerarTicket,
);

/**
 * GET /stream → Abre conexão SSE
 * Autenticado via ticket (sem authGuard — o ticket é a credencial).
 */
router.get('/stream', ctrl.conectarStream);

export default router;
