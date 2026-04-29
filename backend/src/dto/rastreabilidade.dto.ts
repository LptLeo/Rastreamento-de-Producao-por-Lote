import { z } from "zod";
import { PaginacaoQueryDto } from "./paginacao.dto.js";

export const queryRastreabilidadeSchema = PaginacaoQueryDto.extend({
  termo: z
    .string()
    .min(1, "Digite um número de lote, código ou lote de insumo para pesquisar."),
});

export type QueryRastreabilidadeDTO = z.infer<typeof queryRastreabilidadeSchema>;