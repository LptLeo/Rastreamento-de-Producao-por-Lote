import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PerfilUsuario } from '../../entities/Usuario.js';

describe('Produtos (Integração)', () => {
  let container: StartedPostgreSqlContainer;
  let app: any;
  let AppDataSource: any;
  let tokenGestor: string;

  beforeAll(async () => {
    console.log('[test] 🐳 Iniciando container PostgreSQL para integração...');
    container = await new PostgreSqlContainer('postgres:15')
      .withDatabase('lotepim_test')
      .withUsername('admin')
      .withPassword('senha_teste_123')
      .start();

    // Injeta as configurações do container nas ENVs antes de carregar o app
    process.env.DB_HOST = container.getHost();
    process.env.DB_PORT = container.getMappedPort(5432).toString();
    process.env.DB_USER = 'admin';
    process.env.DB_PASSWORD = 'senha_teste_123';
    process.env.DB_NAME = 'lotepim_test';
    process.env.NODE_ENV = 'test';

    // Importação dinâmica para garantir que o AppDataSource use as ENVs acima
    const serverModule = await import('../../server.js');
    const dbModule = await import('../../config/AppDataSource.js');
    
    app = serverModule.app;
    AppDataSource = dbModule.AppDataSource;

    await AppDataSource.initialize();

    // Cria um gestor de teste
    const { Usuario } = await import('../../entities/Usuario.js');
    const userRepo = AppDataSource.getRepository(Usuario);
    const gestor = userRepo.create({
      nome: 'Gestor Teste',
      email: 'gestor@teste.com',
      senha_hash: 'hash_fake',
      perfil: PerfilUsuario.GESTOR,
      ativo: true,
    });
    await userRepo.save(gestor);

    // Gera token real para o gestor
    tokenGestor = jwt.sign(
      { id: gestor.id, perfil: gestor.perfil, nome: gestor.nome },
      process.env.JWT_SECRET || 'secret_test',
      { expiresIn: '1h' }
    );
  }, 60000); // 60s timeout para o Docker

  afterAll(async () => {
    if (AppDataSource?.isInitialized) {
      await AppDataSource.destroy();
    }
    if (container) {
      await container.stop();
    }
  });

  describe('POST /api/produtos', () => {
    it('deve retornar 401 se nenhum token for enviado', async () => {
      const response = await request(app)
        .post('/api/produtos')
        .send({ nome: 'Produto Sem Auth' });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Token ausente/);
    });

    it('deve retornar 400 se faltarem campos obrigatorios', async () => {
      const response = await request(app)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send({ nome: 'Produto Incompleto' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Dados inválidos');
    });

    it('deve criar um produto com sucesso e persistir no banco real do container', async () => {
      const payload = {
        nome: 'Notebook Industrial X1',
        categoria: 'Computadores',
        linha_padrao: 'Linha A',
        percentual_ressalva: 15,
        ativo: true,
        receita: []
      };

      const response = await request(app)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${tokenGestor}`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.nome).toBe(payload.nome);

      // Verificação de persistência real no banco do Docker
      const { Produto } = await import('../../entities/Produto.js');
      const produtoRepo = AppDataSource.getRepository(Produto);
      const produtoNoBanco = await produtoRepo.findOneBy({ nome: payload.nome });
      
      expect(produtoNoBanco).toBeDefined();
      expect(produtoNoBanco?.categoria).toBe(payload.categoria);
    });
  });

  describe('GET /api/produtos', () => {
    it('deve listar os produtos cadastrados', async () => {
      const response = await request(app)
        .get('/api/produtos')
        .set('Authorization', `Bearer ${tokenGestor}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.itens)).toBe(true);
      expect(response.body.itens.length).toBeGreaterThan(0);
    });
  });
});
