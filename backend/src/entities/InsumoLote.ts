import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Lote } from "./Lote.js";

@Entity("insumos_lote")
export class InsumoLote {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Lote, (lote) => lote.insumos)
  @JoinColumn({ name: "lote_id" })
  lote!: Lote

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