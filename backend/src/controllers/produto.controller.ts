import type { Request, Response } from 'express';
import { ProdutoService } from '../services/produto.service.js';
import { criarProdutoSchema, atualizarProdutoSchema } from '../dto/Produto.dto.js';
import { getRequisitante } from '../utils/auth.utils.js';
import { AppError } from '../errors/AppError.js';

export class ProdutoController {
  private produtoService: ProdutoService;

  constructor() {
    this.produtoService = new ProdutoService();
  }

  create = async (req: Request, res: Response) => {
    const validatedData = criarProdutoSchema.parse(req.body);

    const novoProduto = await this.produtoService.createProduto(validatedData, getRequisitante(req));

    return res.status(201).json(novoProduto);
  }

  getAll = async (req: Request, res: Response) => {
    const filtros: any = {};

    if (req.query.search) filtros.search = String(req.query.search);
    if (req.query.ativo) filtros.ativo = req.query.ativo === 'true';

    const produtos = await this.produtoService.getAllProdutos(getRequisitante(req), filtros);

    return res.status(200).json(produtos);
  }

  getById = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) throw new AppError("ID do produto não fornecido.", 400);

    const produto = await this.produtoService.getProdutoById(Number(id), getRequisitante(req));

    return res.status(200).json(produto);
  }

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const validatedData = atualizarProdutoSchema.parse(req.body);

    if (!id) throw new AppError("ID do produto não fornecido.", 400);

    const produto = await this.produtoService.updateProduto(Number(id), validatedData, getRequisitante(req));

    return res.status(200).json(produto);
  }

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) throw new AppError("ID do produto não fornecido.", 400);

    await this.produtoService.desativarProduto(Number(id), getRequisitante(req));

    return res.status(204).send();
  }
}
