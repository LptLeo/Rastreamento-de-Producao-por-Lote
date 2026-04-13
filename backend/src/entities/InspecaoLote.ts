import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";
import type { Lote } from "./Lote.js";
import type { Usuario } from "./Usuario.js";

export enum ResultadoInspecao {
  APROVADO = "aprovado",
  APROVADO_RESTRICAO = "aprovado_restricao",
  REPROVADO = "reprovado"
}

@Entity("inspecao_lote")
export class InspecaoLote {
  @PrimaryGeneratedColumn()
  id!: number

  @OneToOne("Lote", "inspecao", { cascade: true })
  @JoinColumn({ name: "lote_id" })
  lote!: Relation<Lote>

  @ManyToOne("Usuario", "inspecoes")
  @JoinColumn({ name: "inspetor_id" })
  inspetor!: Relation<Usuario>

  @Column({ type: "enum", enum: ResultadoInspecao, nullable: false })
  resultado!: ResultadoInspecao

  @Column({ type: "int", nullable: false, default: 0 })
  quantidade_repr!: number

  @Column({ type: "text", nullable: true })
  descricao_desvio?: string

  @Column({ type: "timestamptz", nullable: false, default: () => "CURRENT_TIMESTAMP" })
  inspecionado_em!: Date
}