import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CriarInsumoEstoquePayload,
  FiltrosCatalogo,
  FiltrosEstoque,
  InsumosService,
  OrdenacaoEstoque,
} from './services/insumos.service.js';
import { AuthService } from '../../core/services/auth.service.js';

import { MetricCardsComponent } from './components/metric-cards/metric-cards.component.js';
import { EstoqueListComponent } from './components/estoque-list/estoque-list.component.js';
import { CatalogoTableComponent } from './components/catalogo-table/catalogo-table.component.js';
import { NovaMpModalComponent } from './components/nova-mp-modal/nova-mp-modal.component.js';
import { RegistrarEntradaModalComponent } from './components/registrar-entrada-modal/registrar-entrada-modal.component.js';
import { PedirInsumosModalComponent } from './components/pedir-insumos-modal/pedir-insumos-modal.component.js';
import { LotesReceberComponent } from './components/lotes-receber/lotes-receber.component.js';
import { PaginationComponent } from '../../shared/components/pagination/pagination.js';
import { rxResource } from '@angular/core/rxjs-interop';
import { ToastService } from '../../core/services/toast.service.js';
import { forkJoin } from 'rxjs';
import { filter } from 'rxjs/operators';
import type { MateriaPrima, InsumoEstoque } from '../../shared/models/lote.models.js';
import type { PedidoInsumoItem } from './components/pedir-insumos-modal/pedir-insumos-modal.component.js';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SseClientService, type SseEvento } from '../../core/services/sse-client.service.js';

@Component({
  selector: 'app-insumos',
  standalone: true,
  imports: [
    CommonModule,
    MetricCardsComponent,
    EstoqueListComponent,
    CatalogoTableComponent,
    NovaMpModalComponent,
    RegistrarEntradaModalComponent,
    PedirInsumosModalComponent,
    LotesReceberComponent,
    PaginationComponent,
  ],
  templateUrl: './insumos.html',
})
export class Insumos {
  private insumosService = inject(InsumosService);
  private toastService = inject(ToastService);
  private sseService = inject(SseClientService);
  authService = inject(AuthService);

  abaAtiva = signal<'estoque' | 'catalogo'>('estoque');
  termoPesquisa = signal('');

  // Filtros Adicionais para Estoque
  filtroEsgotado = signal(false);
  filtroFornecedor = signal('');
  ordenarPor = signal<OrdenacaoEstoque>('mais_recente');

  currentPageEstoque = signal(1);
  currentPageCatalogo = signal(1);

  constructor() {
    /**
     * Assina o stream SSE e mapeia eventos para reloads seletivos.
     * takeUntilDestroyed() garante cancelamento automático ao sair da tela.
     */
    this.sseService.eventos$
      .pipe(
        takeUntilDestroyed(),
        filter((e) => e.tipo === 'insumo:criado' || e.tipo === 'insumo:status_alterado'),
      )
      .subscribe((evento) => this.tratarEventoSse(evento));
  }

  /** Resource para o Estoque de Lotes (Apenas Disponíveis) */
  estoqueResource = rxResource({
    params: (): FiltrosEstoque => ({
      pagina: this.currentPageEstoque(),
      limite: 10,
      busca: this.abaAtiva() === 'estoque' ? this.termoPesquisa().trim() : '',
      esgotado: this.abaAtiva() === 'estoque' ? this.filtroEsgotado() : false,
      fornecedor: this.abaAtiva() === 'estoque' ? this.filtroFornecedor().trim() : '',
      ordenarPor: this.abaAtiva() === 'estoque' ? this.ordenarPor() : '',
      status: 'disponivel',
    }),
    stream: ({ params }) => this.insumosService.getAll(params),
  });

  /** Resource para os Lotes a Receber (Logística) */
  lotesReceberResource = rxResource({
    params: () => ({
      fornecedor: this.abaAtiva() === 'estoque' ? this.filtroFornecedor().trim() : '',
      ordenarPor: this.abaAtiva() === 'estoque' ? this.ordenarPor() : '',
      status: 'a_caminho,pendente',
      limite: 100,
    }),
    stream: ({ params }) => this.insumosService.getAll(params as any),
  });

  /** Resource para o Catálogo de Matérias-Primas */
  catalogoResource = rxResource({
    params: (): FiltrosCatalogo => ({
      pagina: this.currentPageCatalogo(),
      limite: 10,
      busca: this.abaAtiva() === 'catalogo' ? this.termoPesquisa().trim() : '',
    }),
    stream: ({ params }) => this.insumosService.getMateriasPrimasPaginado(params),
  });

  /** Resource para as Categorias */
  categoriasResource = rxResource({
    stream: () => this.insumosService.getCategoriasMateriasPrimas(),
  });

  /** Resource para as Métricas do Estoque (Total, Saldo, Esgotados) */
  contagemResource = rxResource({
    stream: () => this.insumosService.getContagem(),
  });

  /** Resource para o Catálogo Completo (sem paginação, usado para selects) */
  catalogoCompletoResource = rxResource({
    stream: () => this.insumosService.getMateriasPrimas(),
  });

  // Derivações reativas
  insumos = computed(() => this.estoqueResource.value()?.itens || []);
  lotesReceber = computed(() => this.lotesReceberResource.value()?.itens || []);
  catalogo = computed<MateriaPrima[]>(() => this.catalogoResource.value()?.itens || []);
  catalogoCompleto = computed(() => this.catalogoCompletoResource.value() || []);
  categoriasMp = computed(() => this.categoriasResource.value() || []);

  insumosDisponiveis = computed(() => {
    const mapa = new Map<number, InsumoEstoque[]>();
    for (const insumo of this.insumos()) {
      const mpId = insumo.materiaPrima.id;
      const lista = mapa.get(mpId) ?? [];
      lista.push(insumo);
      mapa.set(mpId, lista);
    }
    return mapa;
  });

  paginationMetaEstoque = computed(() => this.estoqueResource.value()?.meta || null);
  paginationMetaCatalogo = computed(() => this.catalogoResource.value()?.meta || null);

  carregando = computed(
    () => this.estoqueResource.isLoading() || this.catalogoResource.isLoading(),
  );
  erro = computed(() =>
    this.estoqueResource.error() || this.catalogoResource.error()
      ? 'Falha na comunicação com o servidor.'
      : null,
  );

  // -- Modal Nova MP --
  modalAberto = signal(false);
  salvandoMp = signal(false);
  erroMp = signal<string | null>(null);

  // -- Modal Registrar Entrada de Estoque --
  modalEstoqueAberto = signal(false);
  salvandoEstoque = signal(false);
  erroEstoque = signal<string | null>(null);

  // -- Modal Pedir Insumos --
  modalPedidoAberto = signal(false);

  /** Métricas Dinâmicas Reais (Vindas do Backend) */
  totalRegistros = computed(() => this.contagemResource.value()?.total || 0);
  totalComSaldo = computed(() => this.contagemResource.value()?.comSaldo || 0);
  totalEsgotados = computed(() => this.contagemResource.value()?.esgotados || 0);
  totalCatalogo = computed(() => this.paginationMetaCatalogo()?.totalItens || 0);

  onPageChange(pagina: number): void {
    if (this.abaAtiva() === 'estoque') {
      this.currentPageEstoque.set(pagina);
    } else {
      this.currentPageCatalogo.set(pagina);
    }
  }

  setAba(aba: 'estoque' | 'catalogo'): void {
    this.abaAtiva.set(aba);
    this.termoPesquisa.set('');
    this.currentPageEstoque.set(1);
    this.currentPageCatalogo.set(1);
  }

  onSearch(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.termoPesquisa.set(valor);
    this.resetarPaginas();
  }

  get isOperador(): boolean {
    return this.authService.usuario()?.perfil === 'operador';
  }

  limparFiltrosEstoque(): void {
    this.filtroEsgotado.set(false);
    this.filtroFornecedor.set('');
    this.ordenarPor.set('mais_recente');
    this.currentPageEstoque.set(1);
  }

  toggleEsgotado(): void {
    this.filtroEsgotado.update((v) => !v);
    this.currentPageEstoque.set(1);
  }

  setFornecedor(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.filtroFornecedor.set(valor);
    this.currentPageEstoque.set(1);
  }

  setOrdenacao(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value as OrdenacaoEstoque;
    this.ordenarPor.set(valor);
    this.currentPageEstoque.set(1);
  }

  // --- Modal Logic (Mantido imperativo para ações de escrita) ---

  abrirModalNovaMp(): void {
    this.erroMp.set(null);
    this.modalAberto.set(true);
  }

  fecharModalNovaMp(): void {
    this.modalAberto.set(false);
    this.erroMp.set(null);
  }

  salvarNovaMp(payload: Partial<MateriaPrima>): void {
    this.salvandoMp.set(true);
    this.erroMp.set(null);

    this.insumosService.criarMateriaPrima(payload).subscribe({
      next: () => {
        this.catalogoResource.reload();
        this.catalogoCompletoResource.reload();
        this.categoriasResource.reload();
        this.fecharModalNovaMp();
      },
      error: (err) => {
        console.error('Erro ao criar matéria-prima:', err);
        this.erroMp.set(err.error?.message || 'Erro ao salvar matéria-prima.');
        this.salvandoMp.set(false);
      },
      complete: () => this.salvandoMp.set(false),
    });
  }

  abrirModalEstoque(): void {
    this.erroEstoque.set(null);
    this.modalEstoqueAberto.set(true);
  }

  fecharModalEstoque(): void {
    this.modalEstoqueAberto.set(false);
    this.erroEstoque.set(null);
  }

  // --- Fluxo de Pedido de Insumos ---

  iniciarFluxoPedido(): void {
    this.toastService.confirm(
      'Para realizar um pedido, você deve selecionar as matérias-primas e quantidades no próximo passo. Os itens chegarão em 10 segundos.',
      () => this.modalPedidoAberto.set(true),
      'Entendido',
    );
  }

  processarPedido(itens: PedidoInsumoItem[]): void {
    this.modalPedidoAberto.set(false);

    const payload = itens.map((item) => ({
      ...this.montarPayloadPedido(item),
      status: 'a_caminho' as const,
    }));

    this.insumosService.createBulk(payload).subscribe({
      next: (lotesCriados) => {
        this.lotesReceberResource.reload();
        this.toastService.success(`Pedido realizado! ${lotesCriados.length} lotes estão a caminho.`);
      },
      error: (err) => {
        console.error('Erro ao pedir insumos:', err);
        this.toastService.error(
          err.error?.message || 'Erro ao processar o pedido de insumos em lote.',
        );
      },
    });
  }

  receberLoteFisico(id: number): void {
    this.insumosService.atualizarStatus(id, 'disponivel').subscribe({
      next: () => {
        this.toastService.success('✅ Insumo recebido no estoque físico e pronto para uso!');
        this.lotesReceberResource.reload();
        this.estoqueResource.reload();
        this.contagemResource.reload();
      },
      error: () => this.toastService.error('Erro ao confirmar recebimento.'),
    });
  }

  salvarEstoque(payload: {
    materia_prima_id: string | number;
    numero_lote_fornecedor?: string;
    fornecedor: string;
    quantidade_inicial: string | number;
    turno: 'manha' | 'tarde' | 'noite';
    naoAplicaValidade?: boolean;
    data_validade?: string | null;
  }): void {
    this.salvandoEstoque.set(true);
    this.erroEstoque.set(null);

    const formattedPayload = this.montarPayloadEntradaEstoque(payload);

    this.insumosService.create(formattedPayload).subscribe({
      next: () => {
        this.estoqueResource.reload();
        this.contagemResource.reload();
        this.fecharModalEstoque();
      },
      error: (err) => {
        console.error('Erro ao registrar estoque:', err);
        this.erroEstoque.set(err.error?.message || 'Erro ao registrar entrada.');
        this.salvandoEstoque.set(false);
      },
      complete: () => this.salvandoEstoque.set(false),
    });
  }

  private resetarPaginas(): void {
    this.currentPageEstoque.set(1);
    this.currentPageCatalogo.set(1);
  }

  /**
   * Trata eventos SSE do domínio de insumos e dispara reloads seletivos.
   * Preserva paginação, filtros e ordenação — o rxResource recarrega com os
   * parâmetros atuais da UI, sem nenhuma manipulação manual de arrays.
   */
  private tratarEventoSse(evento: SseEvento): void {
    switch (evento.tipo) {
      case 'insumo:criado':
        if (evento.dados.status === 'a_caminho') {
          this.lotesReceberResource.reload();
        } else if (evento.dados.status === 'disponivel') {
          this.estoqueResource.reload();
          this.contagemResource.reload();
        }
        break;

      case 'insumo:status_alterado':
        if (evento.dados.status === 'disponivel') {
          // Saiu da logística, entrou no estoque
          this.lotesReceberResource.reload();
          this.estoqueResource.reload();
          this.contagemResource.reload();
        } else {
          // Mudança dentro da logística (pendente → a_caminho ou vice-versa)
          this.lotesReceberResource.reload();
        }
        break;
    }
  }

  private montarPayloadPedido(item: PedidoInsumoItem): CriarInsumoEstoquePayload {
    return {
      materia_prima_id: item.materia_prima_id,
      numero_lote_fornecedor: 'PEDIDO-AUTO',
      fornecedor: 'Fornecedor Homologado',
      quantidade_inicial: Number(item.quantidade),
      turno: 'manha',
      data_validade: null,
    };
  }

  private montarPayloadEntradaEstoque(payload: {
    materia_prima_id: string | number;
    numero_lote_fornecedor?: string;
    fornecedor: string;
    quantidade_inicial: string | number;
    turno: 'manha' | 'tarde' | 'noite';
    naoAplicaValidade?: boolean;
    data_validade?: string | null;
  }): CriarInsumoEstoquePayload {
    return {
      materia_prima_id: Number(payload.materia_prima_id),
      numero_lote_fornecedor: payload.numero_lote_fornecedor,
      fornecedor: payload.fornecedor,
      quantidade_inicial: Number(payload.quantidade_inicial),
      turno: payload.turno,
      data_validade:
        !payload.naoAplicaValidade && payload.data_validade ? payload.data_validade : null,
    };
  }
}
