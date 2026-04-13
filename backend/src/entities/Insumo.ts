import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("insumos")
export class Insumo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text", nullable: false, unique: true })
  nome!: string;

  @Column({ type: "text", nullable: false, unique: true })
  codigo!: string;

  @Column({ type: "text", nullable: false })
  unidade_padrao!: string;

  @Column({ type: "boolean", default: true })
  ativo!: boolean;
}
