import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { AppDataSource } from '../../config/AppDataSource.js';
import jwt from 'jsonwebtoken';
import { PerfilUsuario, Usuario } from '../../entities/Usuario.js';

let container: StartedPostgreSqlContainer;

export async function startTestContainer() {
  if (!container) {
    console.log('[test] 🐳 Iniciando container PostgreSQL global...');
    container = await new PostgreSqlContainer('postgres:15')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_pass')
      .start();

    process.env.DB_HOST = container.getHost();
    process.env.DB_PORT = container.getMappedPort(5432).toString();
    process.env.DB_USER = 'test_user';
    process.env.DB_PASSWORD = 'test_pass';
    process.env.DB_NAME = 'test_db';
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'secret_test';
    process.env.JWT_REFRESH_SECRET = 'refresh_secret_test';
    process.env.JWT_EXPIRATION = '15m';
    process.env.JWT_REFRESH_EXPIRATION = '7d';
    process.env.JWT_SALT = '10';

    console.log(`[test] ✅ Container pronto em ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  }

  if (!AppDataSource.isInitialized) {
    AppDataSource.setOptions({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      username: 'test_user',
      password: 'test_pass',
      database: 'test_db',
    });
    await AppDataSource.initialize();
  }

  return container;
}

export async function stopTestContainer() {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  if (container) {
    await container.stop();
  }
}

export async function limparBanco() {
  if (!AppDataSource.isInitialized) return;
  const entities = AppDataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = AppDataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE "${entity.tableName}" CASCADE;`);
  }
}

export async function criarUsuarioTeste(perfil: PerfilUsuario = PerfilUsuario.GESTOR) {
  const userRepo = AppDataSource.getRepository(Usuario);
  const user = userRepo.create({
    nome: `Usuario ${perfil}`,
    email: `${perfil}@teste.com`,
    senha_hash: 'hash_fake',
    perfil,
    ativo: true,
  });
  const salvo = await userRepo.save(user);

  const token = jwt.sign(
    { id: salvo.id, perfil: salvo.perfil, nome: salvo.nome },
    process.env.JWT_SECRET || 'secret_test',
    { expiresIn: '1h' },
  );

  return { usuario: salvo, token };
}
