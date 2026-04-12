import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { switchMap } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

import { LoteFeatureService } from '../../services/lote.service';
import {
  LoteDetalhe,
  LoteStatus,
  STATUS_CONFIG,
  StatusConfig,
} from '../../../../shared/models/lote.models';

const TURNO_LABEL: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

@Component({
  selector: 'app-lote-detail',
  imports: [CommonModule],
  templateUrl: './lote-detail.html',
  styleUrl: './lote-detail.css',
})
export class LoteDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private loteService = inject(LoteFeatureService);

  lote = signal<LoteDetalhe | null>(null);
  carregando = signal(true);
  erro = signal<string | null>(null);

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = Number(params.get('id'));
        if (!id || isNaN(id)) {
          this.erro.set('ID do lote inválido.');
          this.carregando.set(false);
          return EMPTY;
        }
        this.carregando.set(true);
        this.erro.set(null);
        return this.loteService.getLoteById(id);
      }),
    ).subscribe({
      next: (lote) => {
        this.lote.set(lote);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar os dados do lote. Verifique sua conexão e tente novamente.');
        this.carregando.set(false);
      },
    });
  }

  voltarParaLista(): void {
    this.router.navigate(['/app/lote']);
  }

  // ── Utilitários de template ─────────────────────────────────────────────

  getStatusConfig(status?: LoteStatus): StatusConfig {
    return STATUS_CONFIG[status!] ?? {
      label: status ?? '',
      cor: '#ADAAAA',
      corBg: 'transparent',
      corBorda: '#484847',
    };
  }

  getTurnoLabel(turno?: string): string {
    return TURNO_LABEL[turno ?? ''] ?? turno ?? '—';
  }

  formatarData(data?: string): string {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatarDataHora(data?: string): string {
    if (!data) return '—';
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  calcularTaxaAprovacao(prod: number, repr: number): number {
    if (!prod) return 0;
    return Math.round(((prod - repr) / prod) * 100);
  }
}
