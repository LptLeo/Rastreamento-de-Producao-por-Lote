import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Lote } from "./Lote.js";
import { Usuario } from "./Usuario.js";

enum Resultados {
  APROVADO = "aprovado",
  APROVADO_RESTRICAO = "aprovado_restricao",
  REPROVADO = "reprovado"
}

@Entity("inspecao_lote")
export class InspecaoLote {
  @PrimaryGeneratedColumn()
  id!: number

  @OneToOne(() => Lote, (lote) => lote.inspecao)
  @JoinColumn({ name: "lote_id" })
  lote!: Lote

  @ManyToOne(() => Usuario, (usuario) => usuario.inspecoes)
  @JoinColumn({ name: "inspetor_id" })
  inspetor!: Usuario

  @Column({ type: "enum", enum: Resultados, nullable: false })
  resultado!: Resultados

  @Column({ type: "int", nullable: false, default: 0 })
  quantidade_repr!: number

  @Column({ type: "text", nullable: true })
  descricao_desvio?: string

  @Column({ type: "timestamptz", nullable: false, default: () => "CURRENT_TIMESTAMP" })
  inspecionado_em!: Date
}