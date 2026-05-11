import { z } from 'zod';
import { PaginacaoQueryDto } from './paginacao.dto.js';

export const ListInsumosQueryDto = PaginacaoQueryDto.extend({
  materia_prima_id: z.string().optional(),
  esgotado: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  fornecedor: z.string().optional(),
  status: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',') : undefined)),
  ordenarPor: z
    .enum(['menor_estoque', 'maior_estoque', 'mais_recente', 'menos_recente'])
    .optional(),
  cache_buster: z.string().optional(),
});

export type ListInsumosQueryDto = z.infer<typeof ListInsumosQueryDto>;

export const ListarDisponiveisQueryDto = z.object({
  ids: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? '')
        .split(',')
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0),
    ),
});

export type ListarDisponiveisQueryDto = z.infer<typeof ListarDisponiveisQueryDto>;

const turnoSchema = z.enum(['manha', 'tarde', 'noite'], {
  message: 'Turno inválido. Valores aceitos: manha, tarde, noite.',
});

export const criarInsumoEstoqueSchema = z.object({
  materia_prima_id: z.coerce
    .number({ message: 'A matéria-prima é obrigatória.' })
    .int()
    .positive('ID da matéria-prima inválido.'),

  numero_lote_fornecedor: z.string().optional().default(''),

  quantidade_inicial: z
    .number({ message: 'A quantidade é obrigatória.' })
    .positive('A quantidade deve ser maior que zero.'),

  fornecedor: z
    .string({ message: 'O fornecedor é obrigatório.' })
    .min(1, 'O fornecedor não pode ser vazio.'),

  codigo_interno: z.string().optional().default(''),

  turno: turnoSchema,

  data_validade: z.coerce.date().nullable().optional().default(null),

  status: z.enum(['a_caminho', 'pendente', 'disponivel']).optional().default('disponivel'),

  observacoes: z.string().max(1000).optional().default(''),
});

export const criarInsumoEstoqueBulkSchema = z.object({
  itens: z.array(criarInsumoEstoqueSchema).min(1, 'A lista de itens não pode estar vazia.'),
});

export type CriarInsumoEstoqueDTO = z.infer<typeof criarInsumoEstoqueSchema>;
export type CriarInsumoEstoqueBulkDTO = z.infer<typeof criarInsumoEstoqueBulkSchema>;
