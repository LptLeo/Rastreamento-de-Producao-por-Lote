import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProdutosService } from './services/produtos.service';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ProdutoFilterButtonComponent } from './components/produto-filter-button/produto-filter-button';
import { ProdutoCardComponent } from './components/produto-card/produto-card';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import type { Produto } from '../../shared/models/lote.models';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, RouterLink, ProdutoFilterButtonComponent, ProdutoCardComponent, StatCardComponent, PageHeaderComponent],
  templateUrl: './produtos.html',
})
export class Produtos implements OnInit {
  private produtosService = inject(ProdutosService);
  private router = inject(Router);
  authService = inject(AuthService);

  // States
  produtosBase = signal<Produto[]>([]);
  carregando = signal(true);
  erro = signal<string | null>(null);
  termoPesquisa = signal('');
  filtroAtivo = signal('todos');
  ultimaAtualizacao = signal(new Date().toLocaleTimeString('pt-BR'));

  /** Listagem filtrada por busca local e abas */
  produtos = computed(() => {
    let lista = this.produtosBase();
    
    // Filtro por abas
    const filtro = this.filtroAtivo();
    if (filtro === 'ativos') lista = lista.filter(p => p.ativo);
    if (filtro === 'inativos') lista = lista.filter(p => !p.ativo);
    if (filtro === 'sem_insumos') lista = lista.filter(p => !p.receita || p.receita.length === 0);

    // Filtro por pesquisa textual
    const termo = this.termoPesquisa().toLowerCase().trim();
    if (!termo) return lista;
    return lista.filter(p =>
      p.nome.toLowerCase().includes(termo) ||
      p.sku.toLowerCase().includes(termo) ||
      p.categoria.toLowerCase().includes(termo)
    );
  });

  /** Métricas computadas localmente para as abas */
  metrics = computed(() => {
    const lista = this.produtosBase();
    return {
      total: lista.length,
      ativos: lista.filter(p => p.ativo).length,
      inativos: lista.filter(p => !p.ativo).length,
      mais_produzidos: 0, // Placeholder
      sem_insumos: lista.filter(p => !p.receita || p.receita.length === 0).length,
      mais_produzido: lista.length > 0 ? lista[0].nome : '—'
    };
  });

  totalProdutos = computed(() => this.produtosBase().length);
  totalAtivos = computed(() => this.produtosBase().filter(p => p.ativo).length);
  totalComReceita = computed(() => this.produtosBase().filter(p => p.receita?.length > 0).length);

  ngOnInit(): void {
    this.carregarProdutos();
  }

  aplicarFiltroTab(tab: string): void {
    this.filtroAtivo.set(tab);
  }

  carregarProdutos(): void {
    this.carregando.set(true);
    this.produtosService.getProdutos()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (dados) => this.produtosBase.set(dados),
        error: () => this.erro.set('Erro ao carregar produtos do servidor.'),
      });
  }

  onSearch(event: Event): void {
    this.termoPesquisa.set((event.target as HTMLInputElement).value);
  }

  irParaNovo(): void {
    this.router.navigate(['/app/produtos/novo']);
  }

  irParaDetalhe(id: number): void {
    this.router.navigate(['/app/produtos', id]);
  }

  formatarData(data?: string): string {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR');
  }
}
