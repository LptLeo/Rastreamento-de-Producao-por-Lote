import { z } from 'zod';
import { PerfilUsuario } from '../entities/Usuario.js';
import { PaginacaoQueryDto } from './paginacao.dto.js';
import { env } from '../config/env.js';

const perfilUsuario = z.enum(
  [PerfilUsuario.GESTOR, PerfilUsuario.INSPETOR, PerfilUsuario.OPERADOR],
  'Perfil inválido',
);

const senhaSchema = z
  .string()
  .min(env.SENHA_MIN_LENGTH, `Senha deve ter no mínimo ${env.SENHA_MIN_LENGTH} caracteres`)
  .max(env.SENHA_MAX_LENGTH, `Senha deve ter no máximo ${env.SENHA_MAX_LENGTH} caracteres`);

export const CreateUsuarioDto = z.object({
  email: z.email('E-mail inválido'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  senha: senhaSchema,
  perfil: perfilUsuario,
  ativo: z.boolean().default(true),
});

export const UpdateUsuarioDto = z.object({
  nome: z.string().min(1).optional(),
  email: z.email().optional(),
  perfil: perfilUsuario.optional(),
  ativo: z.boolean().optional(),
});

export const UpdateSenhaDto = z.object({
  senha_atual: z.string().min(1, 'Senha atual é obrigatória'),
  nova_senha: senhaSchema,
});

export const ListUsuariosQueryDto = PaginacaoQueryDto.extend({
  perfil: z.string().optional(),
  ativo: z.string().optional(),
});

export type ListUsuariosQueryDto = z.infer<typeof ListUsuariosQueryDto>;
export type CreateUsuarioDto = z.infer<typeof CreateUsuarioDto>;
export type UpdateUsuarioDto = z.infer<typeof UpdateUsuarioDto>;
export type UpdateSenhaDto = z.infer<typeof UpdateSenhaDto>;
