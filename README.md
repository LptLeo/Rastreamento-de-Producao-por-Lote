<div align="center">

<br/>

```
 ██╗      ██████╗ ████████╗███████╗    ██████╗ ██╗███╗   ███╗
 ██║     ██╔═══██╗╚══██╔══╝██╔════╝    ██╔══██╗██║████╗ ████║
 ██║     ██║   ██║   ██║   █████╗      ██████╔╝██║██╔████╔██║
 ██║     ██║   ██║   ██║   ██╔══╝      ██╔═══╝ ██║██║╚██╔╝██║
 ███████╗╚██████╔╝   ██║   ███████╗    ██║     ██║██║ ╚═╝ ██║
 ╚══════╝ ╚═════╝    ╚═╝   ╚══════╝    ╚═╝     ╚═╝╚═╝     ╚═╝
```

**Sistema de Gestão Industrial de Lotes de Produção**

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com)

</div>

---

## 🔥 O Problema que Resolvemos

> **Imagine uma fábrica onde cada lote de produção é anotado em planilhas.**  
> Ninguém sabe em tempo real o status de cada lote. A inspeção acontece manualmente, sem histórico. O gestor recebe relatórios de semanas atrás para tomar decisões de hoje.

Esse é o cenário de **milhares de pequenas e médias indústrias** no Brasil.

**LOTE PIM** foi construído para eliminar esse gargalo. É uma plataforma de **gestão industrial full-stack** que digitaliza e automatiza o ciclo de vida completo de lotes de produção — da abertura à inspeção final — com rastreabilidade total, métricas em tempo real e controle de qualidade integrado.

---

## ✨ Por Que o LOTE PIM?

| Sem LOTE PIM | Com LOTE PIM |
|---|---|
| Planilhas com versões conflitantes | Fonte única de verdade em tempo real |
| Status de lote desconhecido | Progressão automática com Job de estado |
| Inspeção sem critério objetivo | Limiar de ressalva por produto configurável |
| Estoque de insumos manual | Rastreabilidade completa de consumo por lote |
| Relatórios mensais e defasados | Dashboard executivo com tendência mensal |
| Acesso irrestrito a dados sensíveis | RBAC com 3 perfis distintos (Operador, Inspetor, Gestor) |
| Exportação de dados improvável | Relatório executivo em PDF com 1 clique |

---

## 🎯 Funcionalidades Principais

### 📊 Dashboard Executivo
- Métricas mensais em tempo real: lotes produzidos, unidades, taxa de aprovação
- Indicadores de tendência com variação percentual vs. mês anterior (↑↓)
- Lista dos últimos 10 lotes com status visual
- Exportação de relatório executivo em **PDF** com ranking de produtos e funcionários

### 📦 Gestão de Lotes de Produção
- Criação de lotes com seleção de produto, operador, turno e quantidade planejada
- **Progressão automática de status** via Job interno (sem intervenção manual):
  ```
  EM PRODUÇÃO → AGUARDANDO INSPEÇÃO → [APROVADO | APROVADO COM RESTRIÇÃO | REPROVADO]
  ```
- Filtros por status, produto e período com busca textual
- Rastreabilidade completa de insumos consumidos por lote

### 🔬 Inspeção e Qualidade
- Registro de inspeção com quantidade de unidades reprovadas
- Resultado calculado automaticamente com base no **limiar de ressalva (%)** configurado por produto
- Histórico completo de inspeções por inspetor

### 🏭 Catálogo de Produtos
- Gerenciamento completo de produtos com SKU auto-gerado
- **Receita do Produto**: lista de matérias-primas necessárias com quantidades e unidades
- Edição de receita via interface modal sem perda de histórico

### 📋 Gestão de Insumos (Estoque)
- Controle de estoque de matérias-primas por lote de fornecedor
- Rastreabilidade de qual insumo foi consumido em qual lote de produção
- Alertas visuais para produtos sem insumos vinculados

### 🔍 Rastreabilidade Industrial
- Busca por número de lote com histórico completo de:
  - Produto fabricado, operador, turno
  - Insumos consumidos com lotes de fornecedor
  - Resultado da inspeção e inspetor responsável

### 🔐 Controle de Acesso (RBAC)
| Perfil | Capacidades |
|--------|------------|
| **Operador** | Abrir lotes, registrar consumo de insumos, visualizar dashboard |
| **Inspetor** | Registrar inspeções, aprovar ou reprovar lotes |
| **Gestor** | Acesso total: produtos, insumos, usuários, configurações, exportações |

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                         LOTE PIM                            │
│                                                             │
│   ┌──────────────────┐           ┌──────────────────────┐   │
│   │    FRONTEND      │   HTTP    │      BACKEND         │   │
│   │   Angular 21     │◄────────► │    Express 5 + TS    │   │
│   │   Tailwind CSS   │   JWT     │    TypeORM + Zod     │   │
│   │   jsPDF          │           │    Job de Progressão │   │
│   └──────────────────┘           └──────────┬───────────┘   │
│                                             │               │
│                                    ┌────────▼──────────┐    │
│                                    │    PostgreSQL 16  │    │
│                                    │    (via Docker)   │    │
│                                    └───────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Modelo de Domínio (Entidades)

```
Usuario ───────────────────────────────────────┐
   │                                           │
   │ (operador)                                │ (inspetor)
   ▼                                           ▼
 Lote ──────────── ConsumoInsumo         Inspeção
   │                    │                     │
   │ (produto)          │ (insumoEstoque)     │ (lote)
   ▼                    ▼                     │
Produto           InsumoEstoque               │
   │                    │                     │
   │ (receita)          │ (materiaPrima)      │
   ▼                    ▼                     │
ReceitaItem       MateriaPrima ◄──────────────┘
```

### Ciclo de Vida de um Lote

```
[ Criação ]
    │
    ▼
[ EM PRODUÇÃO ]  ◄─── Job verifica a cada 30s
    │                  (configura TEMPO_PRODUCAO_MINUTOS)
    ▼ (tempo expirado)
[ AGUARDANDO INSPEÇÃO ]
    │
    ▼ (Inspetor registra inspeção)
    ├── qtd_reprovada < limiar → [ APROVADO ]
    ├── qtd_reprovada ≈ limiar → [ APROVADO COM RESTRIÇÃO ]
    └── qtd_reprovada > limiar → [ REPROVADO ]
```

---

## 📁 Estrutura do Projeto

```
LotePIM/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── AppDataSource.ts     # Configuração TypeORM / PostgreSQL
│   │   │   └── seed.ts              # Script de dados iniciais (3 meses de histórico)
│   │   ├── controllers/             # Handlers HTTP (auth, lote, produto, insumos…)
│   │   ├── dto/                     # Schemas de validação Zod por domínio
│   │   ├── entities/                # Entidades TypeORM (mapeamento ORM ↔ BD)
│   │   │   ├── Lote.ts
│   │   │   ├── Produto.ts
│   │   │   ├── Usuario.ts
│   │   │   ├── MateriaPrima.ts
│   │   │   ├── ReceitaItem.ts
│   │   │   ├── InsumoEstoque.ts
│   │   │   ├── ConsumoInsumo.ts
│   │   │   └── Inspecao.ts
│   │   ├── errors/                  # AppError centralizado
│   │   ├── middlewares/             # authGuard, roleGuard, validateBody, errorHandler
│   │   ├── routes/                  # Definição de rotas por domínio
│   │   ├── services/                # Regras de negócio
│   │   │   ├── lote.service.ts
│   │   │   ├── produto.service.ts
│   │   │   ├── inspecao.service.ts
│   │   │   ├── metricas.service.ts  # Dashboard + métricas comparativas mensais
│   │   │   ├── progressao.service.ts # Job automático de progressão de status
│   │   │   └── rastreabilidade.service.ts
│   │   ├── utils/
│   │   │   └── auth.utils.ts        # JWT helpers + verificação de permissão
│   │   └── server.ts                # Entry point do servidor
│   ├── docker-compose.yml
│   └── package.json
│
└── frontend/
    └── src/
        └── app/
            ├── core/
            │   ├── guards/auth/     # authGuard — protege rotas autenticadas
            │   ├── interceptors/    # HTTP interceptor (injeta Bearer token)
            │   ├── layouts/         # MainLayout (sidebar + header)
            │   └── services/        # AuthService, UsuarioService, ConfiguracoesService
            ├── features/            # Módulos de domínio
            │   ├── dashboard/       # Relatório executivo + export PDF
            │   ├── lote/            # Listagem, criação e detalhe de lotes
            │   ├── produtos/        # Catálogo, receita, detalhe
            │   ├── insumos/         # Estoque de matérias-primas
            │   ├── rastreabilidade/ # Busca por lote com histórico completo
            │   ├── configuracoes/   # Gerenciamento de usuários (Gestor)
            │   └── perfil/          # Edição de perfil do usuário logado
            └── shared/
                ├── components/      # Header, Sidebar, PageHeader, StatCard, LoteCard…
                └── models/          # Interfaces TypeScript compartilhadas
```

---

## 🚀 Instalação e Execução

### Pré-requisitos

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Docker** e **Docker Compose**
- **Angular CLI** (`npm install -g @angular/cli`)

---

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/LotePIM.git
cd LotePIM
```

---

### 2. Backend

```bash
# Entrar na pasta do backend
cd backend

# Instalar dependências
npm install

# Criar o arquivo de variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações (veja seção abaixo)

# Subir o banco de dados PostgreSQL via Docker
npm run db:up
# (equivalente a: sudo docker compose up -d)

# Popular o banco com dados iniciais (3 meses de histórico)
npm run seed

# Iniciar em modo desenvolvimento
npm run dev
```

O servidor estará disponível em: **`http://localhost:3000`**

#### Variáveis de Ambiente (`.env`)

```env
# Banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=postgres

# JWT
JWT_SECRET=sua_chave_secreta_aqui

# Job de progressão automática de lotes (em minutos)
# Use 2 para demonstração rápida, 480 (8h) para produção
TEMPO_PRODUCAO_MINUTOS=2

# Credenciais do usuário gestor criado pelo seed
SEED_USER_EMAIL=gestor@lotepim.com
SEED_USER_PASSWORD=senha123
```

#### Comandos do Backend

| Comando | Descrição |
|---------|-----------|
| `npm run db:up` | Sobe o container PostgreSQL |
| `npm run db:down` | Para o container |
| `npm run db:reset` | Destrói e recria o banco (⚠️ apaga todos os dados) |
| `npm run seed` | Popula o banco com dados de exemplo |
| `npm run dev` | Inicia o servidor em modo watch (tsx) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Executa a versão compilada |

---

### 3. Frontend

```bash
# Em outro terminal, entrar na pasta do frontend
cd frontend

# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm start
# ou: ng serve -o (abre o navegador automaticamente)
```

O aplicativo estará disponível em: **`http://localhost:4200`**

---

## 🔑 Credenciais de Acesso (Seed)

Após rodar o seed, os seguintes usuários estão disponíveis:

| Perfil | E-mail | Senha |
|--------|--------|-------|
| **Gestor** | `gestor@lotepim.com` | `senha123` |
| **Operador** | `operador@lotepim.com` | `senha123` |
| **Operador 2** | `operador2@lotepim.com` | `senha123` |
| **Inspetor** | `inspetor@lotepim.com` | `senha123` |
| **Inspetor 2** | `inspetor2@lotepim.com` | `senha123` |

> **Dica:** Use o perfil **Gestor** para acesso completo ao sistema em demonstrações.

---

## 🌐 API Reference

### Autenticação
```http
POST /api/auth/login
```
```json
{ "email": "gestor@lotepim.com", "senha": "senha123" }
```

Todas as demais rotas requerem o header:
```http
Authorization: Bearer <token>
```

### Principais Endpoints

| Método | Rota | Descrição | Perfil Mínimo |
|--------|------|-----------|---------------|
| `GET` | `/api/metricas/dashboard` | Métricas gerais do mês + top produtos/funcionários | Operador |
| `GET` | `/api/lotes` | Listagem paginada com filtros | Operador |
| `POST` | `/api/lotes` | Criar novo lote de produção | Operador |
| `GET` | `/api/lotes/:id` | Detalhe completo do lote | Operador |
| `POST` | `/api/lotes/:id/inspecao` | Registrar resultado da inspeção | Inspetor |
| `GET` | `/api/produtos` | Catálogo de produtos com receitas | Operador |
| `POST` | `/api/produtos` | Criar novo produto | Gestor |
| `PATCH` | `/api/produtos/:id/receita` | Atualizar receita de insumos | Gestor |
| `GET` | `/api/insumos-estoque` | Estoque de matérias-primas | Operador |
| `POST` | `/api/insumos-estoque` | Registrar entrada de estoque | Operador |
| `GET` | `/api/rastreabilidade` | Rastrear lote por número | Operador |
| `GET` | `/api/materias-primas` | Catálogo de matérias-primas | Operador |
| `GET` | `/api/usuarios` | Lista de usuários | Gestor |

---

## 🛠️ Stack Tecnológica

### Backend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Node.js** | ≥ 18 | Runtime |
| **Express** | 5.x | Framework HTTP |
| **TypeScript** | 6.x | Tipagem estática |
| **TypeORM** | 0.3.x | ORM + migrations |
| **PostgreSQL** | 16 | Banco de dados relacional |
| **Zod** | 4.x | Validação de DTOs |
| **bcrypt** | 6.x | Hash de senhas |
| **jsonwebtoken** | 9.x | Autenticação JWT |
| **tsx** | 4.x | Watch mode TypeScript |
| **Docker Compose** | — | Orquestração do banco |

### Frontend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Angular** | 21 | Framework SPA |
| **TypeScript** | 5.9 | Tipagem estática |
| **Tailwind CSS** | 4.x | Utilitários de estilo |
| **jsPDF** + **jspdf-autotable** | — | Exportação de PDF |
| **RxJS** | 7.8 | Programação reativa |

---

## 🔄 Fluxo de Trabalho Típico

```
1. Gestor cadastra Produtos e define a Receita de insumos
       ↓
2. Estoque de matérias-primas é registrado (lotes de fornecedor)
       ↓
3. Operador abre um Lote de Produção → status: EM PRODUÇÃO
       ↓
4. Job automático detecta o tempo e avança → AGUARDANDO INSPEÇÃO
       ↓
5. Inspetor registra o resultado da inspeção (qtd. reprovada)
       ↓
6. Sistema calcula o resultado baseado no limiar de ressalva do produto
   ├── Dentro do limiar → APROVADO
   ├── No limite       → APROVADO COM RESTRIÇÃO
   └── Acima do limiar → REPROVADO
       ↓
7. Dashboard atualiza métricas. Gestor exporta relatório PDF.
```

---

## ⚙️ Configurações Avançadas

### Ajustando o Tempo de Progressão de Lotes

O Job de progressão automática lê a variável `TEMPO_PRODUCAO_MINUTOS` do `.env`. Isso simula o tempo que um lote permanece em produção antes de avançar automaticamente para inspeção:

```env
# Demo: 2 minutos (padrão)
TEMPO_PRODUCAO_MINUTOS=2

# Jornada de trabalho real: 8 horas
TEMPO_PRODUCAO_MINUTOS=480
```

### Reiniciando o Banco Completamente

```bash
cd backend

# Para os containers e remove volumes
npm run db:reset

# Aguarda inicialização e popula novamente
npm run seed
```

---

## 🧱 Decisões de Arquitetura

| Decisão | Justificativa |
|---------|--------------|
| **Monorepo com `backend/` e `frontend/`** | Facilita o versionamento conjunto sem complexidade de workspaces |
| **TypeORM com `synchronize: true` (dev)** | Agilidade no desenvolvimento sem migrations manuais |
| **Job de progressão interno ao servidor** | Elimina dependência de ferramentas externas (cron, Redis) para o ambiente de demo |
| **Validação com Zod nos DTOs** | Type-safety em runtime, erros de validação com mensagens claras |
| **RBAC via middleware `roleGuard`** | Centraliza verificação de permissões, evitando lógica distribuída nos services |
| **JWT stateless** | Sem necessidade de sessão server-side; escalável horizontalmente |
| **Angular Signals + `rxResource`** | Reatividade moderna sem boilerplate de `BehaviorSubject` |
| **Tailwind CSS 4** | Estilo inline e sem conflitos de especificidade; zero CSS morto em produção |

---

<div align="center">

Feito com ⚡ e TypeScript em todo o stack.

</div>
