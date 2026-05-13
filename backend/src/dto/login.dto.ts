import { z } from 'zod';
import { env } from '../config/env.js';

export const LoginDTO = z.object({
  email: z.email('E-mail inválido.'),
  senha: z.string().min(env.SENHA_MIN_LENGTH, `A senha deve ter no mínimo ${env.SENHA_MIN_LENGTH} caracteres.`),
});

export type LoginDTO = z.infer<typeof LoginDTO>;
