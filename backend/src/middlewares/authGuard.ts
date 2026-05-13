import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError.js';
import { AppDataSource } from '../config/AppDataSource.js';
import { Usuario } from '../entities/Usuario.js';
import { env } from '../config/env.js';
import type { TokenPayload } from '../types/auth.js';

export const authGuard = async (req: Request, res: Response, next: NextFunction) => {
  const userRepo = AppDataSource.getRepository(Usuario);
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Token ausente ou inválido', 401));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(new AppError('Token ausente', 401));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

    const user = await userRepo.findOne({
      where: { id: payload.id },
      select: ['ativo'],
    });

    if (!user || !user.ativo) {
      return next(
        new AppError('Sua conta foi desativada. Entre em contato com o administrador.', 403),
      );
    }

    req.auth = payload;

    return next();
  } catch {
    return next(new AppError('Token inválido ou expirado', 401));
  }
};
