import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Produto } from '../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-produto-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './produto-card.html',
  host: {
    class: 'block h-full min-w-0',
  },
})
export class ProdutoCardComponent {
  @Input({ required: true }) prod!: Produto;
  @Output() cardClick = new EventEmitter<number>();

  formatarData(data: string) {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR');
  }
}
