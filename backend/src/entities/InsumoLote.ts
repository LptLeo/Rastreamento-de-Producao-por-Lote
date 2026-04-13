import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";
import type { Lote } from "./Lote.js";

@Entity("insumos_lote")
export class InsumoLote {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne("Lote", "insumos")
  @JoinColumn({ name: "lote_id" })
  lote!: Relation<Lote>

  @Column({ type: "text", nullable: false })
  nome_insumo!: string;

  @Column({ type: "text", nullable: true })
  codigo_insumo?: string;

  @Column({ type: "text", nullable: true })
  lote_insumo?: string;

  @Column({ type: "numeric", nullable: false })
  quantidade!: number;

  @Column({ type: "text", nullable: false })
  unidade!: string;
}