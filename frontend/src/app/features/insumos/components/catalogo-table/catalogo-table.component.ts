import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { MateriaPrima } from '../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-catalogo-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './catalogo-table.component.html',
})
export class CatalogoTableComponent {
  catalogo = input<MateriaPrima[]>([]);
  carregando = input<boolean>(false);
}
