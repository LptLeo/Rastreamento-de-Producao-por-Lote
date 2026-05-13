import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppDataSource } from './config/AppDataSource.js';
import routes from './routes/index.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { ProgressaoService } from './services/progressao.service.js';
import { InsumoEstoqueService } from './services/insumoEstoque.service.js';
import { env, isProduction, isTest } from './config/env.js';

export const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(
  cors({
    origin: isProduction ? env.ALLOWED_ORIGINS : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json()); // Permite receber json
app.use(cookieParser()); // Anexa os cookies nas requisições
app.set('trust proxy', 1); // 'trust proxy' diz para acreditar no servidor intermediário e 1 que
// tem que ser o primeiro servidor intermediario

app.use('/api', routes);
app.use(errorHandler);

if (!isTest) {
  AppDataSource.initialize()
    .then(async () => {
      console.log('Banco de dados conectado com sucesso.');

      const insumoService = new InsumoEstoqueService();
      await insumoService.resgatarLotesTravados();

      const progressao = new ProgressaoService();
      progressao.iniciar();

      app.listen(env.PORT, () => {
        console.log(`Servidor rodando na porta ${env.PORT} (${env.NODE_ENV})`);
      });
    })
    .catch((error) => {
      console.error('Erro ao conectar com o banco:', error);
    });
}
