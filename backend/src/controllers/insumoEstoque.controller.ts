import type { Request, Response, NextFunction } from 'express';
import { InsumoEstoqueService } from '../services/insumoEstoque.service.js';
import { getRequisitante } from '../utils/auth.utils.js';
import type { ListarDisponiveisQueryDto } from '../dto/insumoEstoque.dto.js';
import { SseService } from '../services/sse.service.js';
import { InsumoEstoqueStatus } from '../entities/InsumoEstoque.js';

const service = new InsumoEstoqueService();

export const criar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await service.criar(req.body, getRequisitante(req));
    res.status(201).json(resultado);
    // Emite SSE após resposta HTTP — não bloqueia o cliente
    SseService.instancia.emitir('insumo:criado', { id: resultado.id, status: resultado.status });
  } catch (e) {
    next(e);
  }
};

export const criarBulk = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultados = await service.criarBulk(req.body, getRequisitante(req));
    res.status(201).json(resultados);

    // Emite eventos SSE iniciais (A Caminho)
    for (const item of resultados) {
      SseService.instancia.emitir('insumo:criado', { id: item.id, status: item.status });
    }

    // Simulação de Logística (Backend): Após 10s, os itens chegam na doca (status pendente)
    // Usamos o próprio requisitante original para manter a trilha de auditoria
    const requisitante = getRequisitante(req);
    
    setTimeout(async () => {
      for (const item of resultados) {
        try {
          const atualizado = await service.atualizarStatus(item.id, InsumoEstoqueStatus.PENDENTE, requisitante);
          SseService.instancia.emitir('insumo:status_alterado', { id: atualizado.id, status: atualizado.status });
        } catch (err) {
          console.error(`[Logistica] Erro ao atualizar chegada do lote ${item.id}:`, err);
        }
      }
    }, 10000);

  } catch (e) {
    next(e);
  }
};

export const listar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await service.listar(req.query as any, getRequisitante(req));
    res.json(resultado);
  } catch (e) {
    next(e);
  }
};

export const buscarPorId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await service.buscarPorId(Number(req.params.id), getRequisitante(req));
    res.json(resultado);
  } catch (e) {
    next(e);
  }
};

export const atualizarStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await service.atualizarStatus(
      Number(req.params.id),
      req.body.status,
      getRequisitante(req),
    );
    res.json(resultado);
    // Emite SSE após resposta HTTP
    SseService.instancia.emitir('insumo:status_alterado', { id: resultado.id, status: resultado.status });
  } catch (e) {
    next(e);
  }
};

export const getContagem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await service.getContagem(getRequisitante(req));
    res.json(resultado);
  } catch (e) {
    next(e);
  }
};

/** Endpoint para o funil do operador: lista insumos disponíveis filtrados por matérias-primas */
export const listarDisponiveis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.query as unknown as ListarDisponiveisQueryDto;
    const resultado = await service.listarDisponiveis(ids, getRequisitante(req));
    res.json(resultado);
  } catch (e) {
    next(e);
  }
};
