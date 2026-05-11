import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { MateriaPrima } from '../../../../shared/models/lote.models.js';

export interface PedidoInsumoItem {
  materia_prima_id: number;
  quantidade: number;
  nome: string;
}

type PedidoInsumoForm = FormGroup;

@Component({
  selector: 'app-pedir-insumos-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pedir-insumos-modal.component.html',
})
export class PedirInsumosModalComponent {
  private fb = inject(FormBuilder);

  @Input() isOpen = false;
  @Input() catalogo: MateriaPrima[] = [];
  @Input() estoqueMap: Map<number, any[]> = new Map();
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<PedidoInsumoItem[]>();

  form = this.fb.group({
    itens: this.fb.array([]),
  });

  get itensArray(): FormArray<PedidoInsumoForm> {
    return this.form.get('itens') as FormArray<PedidoInsumoForm>;
  }

  private _previousIsOpen = false;

  ngOnChanges() {
    if (this.isOpen && !this._previousIsOpen) {
      this.initForm();
    }
    this._previousIsOpen = this.isOpen;
  }

  initForm(): void {
    this.itensArray.clear();
    this.catalogo.forEach((mp) => {
      const lotes = this.estoqueMap.get(mp.id) || [];
      const saldoAtual = lotes.reduce((acc, lote) => acc + Number(lote.quantidade_atual), 0);
      const saldoArredondado = Number(saldoAtual.toFixed(3));

      this.itensArray.push(
        this.fb.group({
          materia_prima_id: [mp.id],
          nome: [mp.nome],
          unidade: [mp.unidade_medida],
          saldo: [saldoArredondado],
          selecionado: [false],
          quantidade: [100, [Validators.required, Validators.min(0.01)]],
        }),
      );
    });
  }

  onClose(): void {
    this.close.emit();
  }

  onConfirm(): void {
    const selecionados = this.itensArray.value
      .filter((item) => item.selecionado)
      .map((item) => ({
        materia_prima_id: item.materia_prima_id,
        quantidade: item.quantidade,
        nome: item.nome,
      })) as PedidoInsumoItem[];

    if (selecionados.length === 0) return;
    this.confirm.emit(selecionados);
  }
}
