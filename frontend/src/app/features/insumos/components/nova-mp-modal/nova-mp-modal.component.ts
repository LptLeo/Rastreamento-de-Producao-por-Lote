import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import type { MateriaPrima } from '../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-nova-mp-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './nova-mp-modal.component.html',
})
export class NovaMpModalComponent {
  private fb = inject(FormBuilder);

  isOpen = input<boolean>(false);
  salvando = input<boolean>(false);
  erro = input<string | null>(null);
  categorias = input<string[]>([]);

  close = output<void>();
  save = output<Partial<MateriaPrima>>();

  formMp = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    categoria: ['', Validators.required],
    unidade_medida: ['UN' as 'UN' | 'KG' | 'L' | 'M', Validators.required],
  });

  onClose() {
    this.formMp.reset({ unidade_medida: 'UN' });
    this.close.emit();
  }

  onSave() {
    if (this.formMp.invalid) return;
    this.save.emit(this.formMp.getRawValue());
    this.formMp.reset({ unidade_medida: 'UN' });
  }
}
