import { Router } from 'express';
import { ProdutoController } from '../controllers/ProdutoController.js';

const produtoRouter = Router();
const produtoController = new ProdutoController();

produtoRouter.post("/produtos", (req, res) => produtoController.create(req, res));
produtoRouter.get("/produtos", (req, res) => produtoController.getAll(req, res));
produtoRouter.get("/produtos/:id", (req, res) => produtoController.getById(req, res));
produtoRouter.put("/produtos/:id", (req, res) => produtoController.update(req, res));
produtoRouter.delete("/produtos/:id", (req, res) => produtoController.delete(req, res));

export default produtoRouter;
