import { randomUUID } from 'crypto';
import type { Response } from 'express';

interface Ticket {
  userId: number;
  expira_em: Date;
}

/**
 * Singleton que gerencia todas as conexões SSE ativas e o sistema de tickets.
 *
 * Responsabilidades:
 * - Manter o Set de clientes conectados
 * - Emitir eventos nomeados para todos os clientes
 * - Gerar e validar tickets temporários (UUID v4, TTL 30s, uso único)
 * - Executar heartbeat a cada 30s para detectar e remover conexões mortas
 */
export class SseService {
  private static _instancia: SseService;

  private clientes = new Set<Response>();
  private tickets = new Map<string, Ticket>();
  private heartbeatInterval: NodeJS.Timeout;

  private constructor() {
    this.heartbeatInterval = setInterval(() => this.executarHeartbeat(), 30_000);
    // Padrão Ouro: .unref() impede que este timer mantenha o processo do Node vivo 
    // se não houver mais nada para fazer (essencial para o Jest fechar os testes).
    this.heartbeatInterval.unref();
  }

  /** Acesso ao singleton global */
  static get instancia(): SseService {
    if (!SseService._instancia) {
      SseService._instancia = new SseService();
    }
    return SseService._instancia;
  }

  /**
   * Registra um cliente SSE. Deve ser chamado após configurar os headers SSE na Response.
   * Remove automaticamente o cliente ao detectar desconexão via heartbeat.
   */
  adicionarCliente(res: Response): void {
    this.clientes.add(res);
    console.log(`[SSE] Cliente conectado. Total: ${this.clientes.size}`);
  }

  /** Remove um cliente do Set de conexões ativas. */
  removerCliente(res: Response): void {
    this.clientes.delete(res);
    console.log(`[SSE] Cliente desconectado. Total: ${this.clientes.size}`);
  }

  /**
   * Emite um evento SSE nomeado para todos os clientes conectados.
   * Clientes que falharem ao receber (conexão morta) são removidos automaticamente.
   */
  emitir(evento: string, dados: object): void {
    const payload = `event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`;

    for (const res of this.clientes) {
      try {
        res.write(payload);
      } catch {
        // Conexão morta — remove silenciosamente
        this.removerCliente(res);
      }
    }
  }

  /**
   * Gera um ticket UUID v4 de uso único com TTL de 30 segundos.
   * Deve ser chamado apenas após autenticação JWT válida.
   */
  gerarTicket(userId: number): string {
    const ticket = randomUUID();
    const expira_em = new Date(Date.now() + 30_000);
    this.tickets.set(ticket, { userId, expira_em });
    return ticket;
  }

  /**
   * Valida e consome um ticket (uso único).
   * Remove tickets expirados durante a validação.
   * @returns userId se válido, null se inválido ou expirado
   */
  validarTicket(ticket: string): number | null {
    const info = this.tickets.get(ticket);

    if (!info) return null;

    // Limpa ticket expirado
    if (info.expira_em < new Date()) {
      this.tickets.delete(ticket);
      return null;
    }

    // Uso único — remove imediatamente após validação
    this.tickets.delete(ticket);
    return info.userId;
  }

  /**
   * Heartbeat: escreve um comentário SSE inócuo (':ping') em todos os clientes.
   * Se a escrita falhar (EPIPE), o cliente está morto e é removido — prevenindo memory leak.
   */
  private executarHeartbeat(): void {
    for (const res of this.clientes) {
      try {
        res.write(':ping\n\n');
      } catch {
        this.removerCliente(res);
      }
    }
  }
}
