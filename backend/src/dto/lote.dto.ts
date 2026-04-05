import { z } from "zod";

const turnoSchema = z.enum(["manha", "tarde", "noite"], "Turno inválido. Valores aceitos: manha, tarde, noite.");

const loteStatusSchema = z.enum(["em_producao", "aguardando_inspecao", "aprovado", "aprovado_restricao", "reprovado"], "Status inválido.");

export const criarLoteSchema = z.object({
  produto: z.string().min(1, "O produto é obrigatório."),
  data_producao: z.coerce.date({ error: "A data de produção é obrigatória e deve ser uma data válida." }),
  turno: turnoSchema,
  operador: z.string().min(1, "O operador é obrigatório."),
  quantidade_prod: z.number().int().positive("A quantidade produzida deve ser maior que zero."),
  observacoes: z.string().max(1000, "Observações não podem ultrapassar 1000 caracteres.").optional(),
});

export type LoteDTO = z.infer<typeof criarLoteSchema>;

export const transicaoStatusSchema = z.object({
  status: loteStatusSchema,
})

export type TransicaoStatusDTO = z.infer<typeof transicaoStatusSchema>;
