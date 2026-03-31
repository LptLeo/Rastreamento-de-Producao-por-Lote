import { Router } from 'express';
import { ProdutoController } from '../controllers/ProdutoController.js';

const produtoRouter = Router();
const produtoController = new ProdutoController();

// POST /produtos - Criar novo produto
produtoRouter.post("/produtos", (req, res) => produtoController.create(req, res));

// GET /produtos - Listar todos os produtos (com filtros opcionais: search, ativo)
produtoRouter.get("/produtos", (req, res) => produtoController.getAll(req, res));

// GET /produtos/:id - Buscar produto por ID
produtoRouter.get("/produtos/:id", (req, res) => produtoController.getById(req, res));

// PUT /produtos/:id - Atualizar produto
produtoRouter.put("/produtos/:id", (req, res) => produtoController.update(req, res));

// DELETE /produtos/:id - Desativar produto (soft delete)
produtoRouter.delete("/produtos/:id", (req, res) => produtoController.delete(req, res));

export default produtoRouter;
