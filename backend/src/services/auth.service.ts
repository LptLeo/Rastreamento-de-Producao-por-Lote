import type { Repository } from 'typeorm';
import type { StringValue } from 'ms';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Usuario } from '../entities/Usuario.js';
import { AppDataSource } from '../config/AppDataSource.js';
import { AppError } from '../errors/AppError.js';
import { env } from '../config/env.js';
import type { LoginDTO } from '../dto/login.dto.js';

export class AuthService {
  private userRepo: Repository<Usuario>;

  constructor() {
    this.userRepo = AppDataSource.getRepository(Usuario);
  }

  async login(dados: LoginDTO) {
    const usuario = await this.userRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.senha_hash')
      .where('usuario.email = :email', { email: dados.email })
      .getOne();

    if (!usuario) throw new AppError('E-mail ou senha incorretos.', 401);

    if (!usuario.ativo)
      throw new AppError(
        'Este usuário está desativado. Entre em contato com o administrador.',
        403,
      );

    const senhaValida = await bcrypt.compare(dados.senha, usuario.senha_hash);

    if (!senhaValida) throw new AppError('E-mail ou senha incorretos.', 401);

    const tokens = await this.gerarERegistrarTokens(usuario);

    return {
      tokenAcesso: tokens.tokenAcesso,
      tokenAtualizacao: tokens.tokenAtualizacao,
    };
  }

  async refresh(token: string) {
    if (!token) throw new AppError('Refresh token não fornecido.', 401);

    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: number };
      const usuario = await this.userRepo.findOne({
        where: { id: decoded.id },
        select: ['id', 'nome', 'email', 'perfil', 'ativo', 'refresh_token'],
      });

      if (!usuario || !usuario.ativo || !usuario.refresh_token) {
        throw new AppError('Sessão inválida ou usuário desativado.', 401);
      }

      const tokenValido = await bcrypt.compare(token, usuario.refresh_token);
      if (!tokenValido) throw new AppError('Token de atualização inválido.', 401);

      const tokens = await this.gerarERegistrarTokens(usuario);
      return tokens;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Token de atualização expirado ou inválido.', 401);
    }
  }

  async logout(usuarioId: number) {
    await this.userRepo.update(usuarioId, { refresh_token: null });
  }

  private async gerarERegistrarTokens(usuario: Usuario) {
    const tokenAcesso = jwt.sign(
      { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRATION as StringValue },
    );

    const tokenAtualizacao = jwt.sign({ id: usuario.id }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRATION as StringValue,
    });

    // Salva hash do refresh token para permitir invalidação individual de sessão
    const hash = await bcrypt.hash(tokenAtualizacao, env.JWT_SALT);
    await this.userRepo.update(usuario.id, { refresh_token: hash });

    return { tokenAcesso, tokenAtualizacao };
  }
}
