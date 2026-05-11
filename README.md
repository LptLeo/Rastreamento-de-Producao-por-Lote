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

| Sem LOTE PIM                       | Com LOTE PIM                                   |
| ---------------------------------- | ---------------------------------------------- |
| Planilhas com versões conflitantes | Fonte única de verdade em tempo real           |
| Status de lote desconhecido        | Progressão automática com Polling Real-time    |
| Inspeção sem critério objetivo     | Limiar de ressalva por produto configurável    |
| Estoque de insumos manual          | Rastreabilidade completa de consumo por lote   |
| Listagens lentas e pesadas         | **Paginação Server-Side** em todas as telas    |
| Notificações via gritos ou rádio   | **Sistema de Alertas Inteligentes** por perfil |
| Relatórios mensais e defasados     | Dashboard interativo com exportação em PDF     |

---

## 🎯 Funcionalidades Principais

### 📊 Dashboard Executivo

- Métricas mensais em tempo real: lotes produzidos, unidades, taxa de aprovação.
- Indicadores de tendência com variação percentual vs. período anterior.
- Lista dos **últimos 10 lotes** com acesso direto ao detalhe (clicáveis).
- Exportação de relatório executivo em **PDF** profissional.

### 📦 Gestão de Lotes de Produção

- Criação de lotes com seleção de produto, operador, turno (automático) e quantidade.
- **Progressão automática de status** validada pelo backend a cada 2 segundos.
- Paginação eficiente para milhares de registros.
- **Rastreabilidade Inversa**: Identifique quais lotes foram afetados por um lote de insumo específico (Recall).

### 🔔 Sistema de Notificações (Real-time)

- **Operador**: Avisado instantaneamente quando novos produtos são cadastrados.
- **Inspetor**: Alerta de "Aguardando Inspeção" assim que a produção termina.
- **Gestor**: Notificações críticas de **Estoque Baixo** baseadas em limite (%) configurável.
- Badge amarelo interativo com histórico de alertas.

### 🔬 Inspeção e Qualidade

- Resultado calculado automaticamente com base no **percentual de ressalva** do produto.
- Bloqueio de ações em lotes já finalizados.
- Registro detalhado de desvios e responsáveis.

### 🏭 Gestão de Usuários e Segurança

- **Segurança Pesada**: Trava no backend que impede edição de cargos por usuários comuns.
- **Ciclo de Vida**: Ativação e Desativação de colaboradores com **expulsão imediata (forced logout)** de contas inativas.
- Edição de perfil próprio e alteração de senha segura com confirmação via Toast interativo.

---

## 🏗️ Arquitetura do Sistema

### Stack Tecnológica

- **Frontend**: Angular 21, Tailwind CSS 4, Signals, rxResource.
- **Backend**: Node.js (Express 5), TypeORM, PostgreSQL, Zod, JWT (HttpOnly Cookies).
- **Infra**: Docker Compose, Polling Real-time otimizado.

### Modelo de Dados Paginado

Todas as rotas de listagem implementam o padrão de resposta:

```json
{
  "itens": [...],
  "meta": {
    "totalItens": 180,
    "itensPorPagina": 10,
    "totalPaginas": 18,
    "paginaAtual": 1
  }
}
```

---

## 🚀 Instalação e Execução

### Pré-requisitos

- **Node.js** ≥ 18 | **npm** ≥ 9 | **Docker** e **Docker Compose**

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run db:up   # Sobe o PostgreSQL
npm run seed    # Gera 180 lotes e 25 produtos (Configurável no .env)
npm run dev     # Servidor na porta 3000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start       # App na porta 4200
```

---

## ⚙️ Configurações do Seed (.env)

O sistema permite gerar uma massa de dados massiva para testes de performance:

- `SEED_TOTAL_LOTES_PRODUCAO`: Padrão 180 lotes.
- `SEED_REPROVACAO_BASE`: Taxa de erro (ex: 10%).
- `SEED_INSUMO_SURPLUS_PCT`: Margem de sobra no estoque (ex: 35%).

---

## 🔑 Credenciais de Acesso

- **Gestor**: `gestor@lotepim.com` / `senha123`
- **Operador**: `operador@lotepim.com` / `senha123`
- **Inspetor**: `inspetor@lotepim.com` / `senha123`

---

<div align="center">
Desenvolvido para máxima rastreabilidade e performance industrial. 🛠️
</div>
