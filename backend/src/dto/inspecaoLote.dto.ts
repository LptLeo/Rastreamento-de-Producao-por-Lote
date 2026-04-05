import { z } from "zod";

const resultadoInspecaoSchema = z.enum(
  ["aprovado", "aprovado_restricao", "reprovado"],
  { message: "Resultado inválido. Valores aceitos: aprovado, aprovado_restricao, reprovado." }
);

export const registrarInspecaoSchema = z.object({
  inspetor_id: z.coerce.number("O inspetor é obrigatório.").int().positive(),

  resultado: resultadoInspecaoSchema,

  quantidade_repr: z.coerce
    .number("A quantidade reprovada deve ser um número.")
    .int("A quantidade reprovada deve ser um número inteiro.")
    .min(0, "A quantidade reprovada não pode ser negativa.")
    .default(0),

  descricao_desvio: z.string("A descrição do desvio deve ser uma string.").max(2000, "A descrição do desvio deve ter no máximo 2000 caracteres.").optional(),
})
  .refine(
    (data) => data.resultado === "aprovado" || !!data.descricao_desvio?.trim(),
    {
      message: "A descrição do desvio é obrigatória quando o resultado não for aprovado.",
      path: ["descricao_desvio"],
    }
  )
  .refine(
    (data) => data.resultado === "aprovado" || data.quantidade_repr > 0,
    {
      message: "Informe a quantidade reprovada quando o resultado não for aprovado.",
      path: ["quantidade_repr"],
    }
  );

export type RegistrarInspecaoDTO = z.infer<typeof registrarInspecaoSchema>;