import { AppDataSource } from "../config/AppDataSource.js";
import { Repository } from "typeorm";
import { Insumo } from "../entities/Insumo.js";
import { PerfilUsuario } from "../entities/Usuario.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";

export class InsumoService {
  private insumoRepo: Repository<Insumo>;

  constructor() {
    this.insumoRepo = AppDataSource.getRepository(Insumo);
  }

  // Listar todos os insumos ativos
  getAllInsumos = async (requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR, PerfilUsuario.INSPETOR]);

    const insumos = await this.insumoRepo.find({
      where: { ativo: true },
      order: { nome: "ASC" }
    });

    // Se a tabela estiver vazia, vamos semear alguns dados iniciais para facilitar o teste
    if (insumos.length === 0) {
      return this.seedInsumos();
    }

    return insumos;
  }

  private seedInsumos = async () => {
    const defaultInsumos = [
      { nome: "Polímero Base (Polietileno)", codigo: "MP-001", unidade_padrao: "KG" },
      { nome: "Corante Azul Master", codigo: "COR-042", unidade_padrao: "KG" },
      { nome: "Aditivo Anti-UV", codigo: "ADV-007", unidade_padrao: "L" },
      { nome: "Resina Estirênica", codigo: "RS-102", unidade_padrao: "KG" },
      { nome: "Embalagem Plástica G", codigo: "EMB-G", unidade_padrao: "UNID" },
      { nome: "Etiqueta Térmica 100x50", codigo: "ETQ-01", unidade_padrao: "UNID" },
    ];

    const novos = this.insumoRepo.create(defaultInsumos);
    await this.insumoRepo.save(novos);
    
    return novos;
  }
}
