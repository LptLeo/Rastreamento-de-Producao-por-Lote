import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lotes-receber',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lotes-receber.component.html',
})
export class LotesReceberComponent {
  @Input() lotes: any[] = [];
  @Output() receber = new EventEmitter<number>();
}
