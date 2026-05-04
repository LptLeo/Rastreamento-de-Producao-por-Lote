import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { AppDataSource } from '../../config/AppDataSource.js';
import jwt from 'jsonwebtoken';
import { PerfilUsuario, Usuario } from '../../entities/Usuario.js';

let container: StartedPostgreSqlContainer;

export async function startTestContainer() {
  if (container) return container;

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

  console.log(`[test] ✅ Container pronto em ${process.env.DB_HOST}:${process.env.DB_PORT}`);

  if (!AppDataSource.isInitialized) {
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
    { expiresIn: '1h' }
  );

  return { usuario: salvo, token };
}
