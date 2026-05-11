import type { Request, Response, NextFunction } from 'express';
import { SseService } from '../services/sse.service.js';
import { getRequisitante } from '../utils/auth.utils.js';

const sseService = SseService.instancia;

/**
 * POST /api/events/ticket
 * Gera um ticket temporário (UUID v4, TTL 30s, uso único) para autenticar
 * a conexão SSE sem expor o JWT na URL.
 * Requer: authGuard + roleGuard (qualquer perfil autenticado)
 */
export const gerarTicket = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const requisitante = getRequisitante(req);
    const ticket = sseService.gerarTicket(requisitante.id);
    res.json({ ticket });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/events/stream?ticket=<uuid>
 * Abre a conexão SSE. Autenticado via ticket (sem Bearer token na URL).
 * Sem authGuard — o ticket é a autenticação neste endpoint.
 */
export const conectarStream = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { ticket } = req.query as { ticket?: string };

    if (!ticket) {
      res.status(401).json({ message: 'Ticket ausente.' });
      return;
    }

    const userId = sseService.validarTicket(ticket);
    if (!userId) {
      res.status(401).json({ message: 'Ticket inválido ou expirado.' });
      return;
    }

    // Configura headers SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Desativa buffering em proxies reversos (Nginx, Render)
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    sseService.adicionarCliente(res);

    // Remove o cliente quando a conexão fechar (aba fechada, logout, etc.)
    req.on('close', () => {
      sseService.removerCliente(res);
    });
  } catch (e) {
    next(e);
  }
};
