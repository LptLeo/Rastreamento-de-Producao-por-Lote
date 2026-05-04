import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service.js';
import { LoteFeatureService } from '../../services/lote.service.js';
import type { Produto, ReceitaItem, InsumoEstoque } from '../../../../shared/models/lote.models.js';
import { finalize, of } from 'rxjs';
import { rxResource } from '@angular/core/rxjs-interop';
import { LoteInsumoItemComponent } from './components/lote-insumo-item/lote-insumo-item.js';
import { criarLoteSchema } from '../../../../core/schemas/lote.schema.js';
import { ZodError } from 'zod';

@Component({
  selector: 'app-lote-novo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoteInsumoItemComponent],
  templateUrl: './lote-novo.html',
})
export class LoteNovo implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private loteService = inject(LoteFeatureService);
  private router = inject(Router);

  /** Resource para carregar os produtos cadastrados */
  produtosResource = rxResource({
    stream: () => this.loteService.getProdutos()
  });

  /** Resource para carregar insumos disponíveis para o produto selecionado */
  insumosResource = rxResource({
    params: () => {
      const pId = Number(this.form.controls.produto_id.value);
      const produto = this.produtos().find(p => p.id === pId);
      return produto?.receita?.map((r: any) => r.materiaPrima.id) || [];
    },
    stream: ({ params: mpIds }) => {
      if (!mpIds.length) return of([]);
      return this.loteService.getInsumosDisponiveis(mpIds);
    }
  });

  produtos = computed(() => this.produtosResource.value() || []);
  insumosList = computed(() => this.insumosResource.value() || []);

  /** Insumos em estoque disponíveis, agrupados por matéria-prima ID */
  insumosDisponiveis = computed(() => {
    const mapa = new Map<number, InsumoEstoque[]>();
    for (const insumo of this.insumosList()) {
      const mpId = insumo.materiaPrima.id;
      const lista = mapa.get(mpId) ?? [];
      lista.push(insumo);
      mapa.set(mpId, lista);
    }
    return mapa;
  });

  salvando = signal(false);
  erro = signal<string | null>(null);
  fieldErrors = signal<Record<string, string>>({});

  /** Flag de carregamento dos insumos */
  carregandoInsumos = computed(() => this.insumosResource.isLoading());

  constructor() {
    /** Reação automática para mudança de produto - reconstrói o FormArray de consumos */
    effect(() => {
      const produtoId = Number(this.form.controls.produto_id.value);
      const produto = this.produtos().find(p => p.id === produtoId);

      this.consumosArray.clear();
      
      if (!produto || !produto.receita?.length) return;

      const qtdPlanejada = Number(this.form.controls.quantidade_planejada.value) || 1;

      for (const item of produto.receita) {
        let consumidoInicial = item.quantidade * qtdPlanejada;
        if (item.unidade !== 'UN') consumidoInicial = Number(consumidoInicial.toFixed(2));
        else consumidoInicial = Math.floor(consumidoInicial);

        this.consumosArray.push(
          this.fb.nonNullable.group({
            materia_prima_id: [item.materiaPrima.id],
            materia_prima_nome: [item.materiaPrima.nome],
            quantidade_necessaria: [item.quantidade],
            unidade: [item.unidade],
            insumo_estoque_id: [0, [Validators.required, Validators.min(1)]],
            quantidade_consumida: [consumidoInicial, [Validators.required, Validators.min(0.01)]],
          })
        );
      }
    });
  }

  private getHojeLocal(): string {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  form = this.fb.nonNullable.group({
    produto_id: [0, [Validators.required, Validators.min(1)]],
    data_producao: [this.getHojeLocal(), [Validators.required]],
    turno: [this.getTurnoAtual(), [Validators.required]],
    quantidade_planejada: [0, [Validators.required, Validators.min(1)]],
    data_validade: [''],
    sem_validade: [true],
    observacoes: [''],
    consumos: this.fb.array<FormGroup>([]),
  });

  /** Getter tipado para o FormArray de consumos */
  get consumosArray(): FormArray<FormGroup> {
    return this.form.controls.consumos;
  }

  /** Formata a data no padrão brasileiro para exibição */
  get dataFormatada(): string {
    const data = this.form.controls.data_producao.value;
    if (!data) return 'DD/MM/AAAA';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  /** Produto selecionado no dropdown */
  produtoSelecionado = computed(() => {
    const id = Number(this.form.controls.produto_id.value);
    return this.produtos().find(p => p.id === id) ?? null;
  });

  private getTurnoAtual(): 'manha' | 'tarde' | 'noite' {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) return 'manha';
    if (hora >= 12 && hora < 18) return 'tarde';
    return 'noite';
  }

  ngOnInit(): void {
    /** Reação automática para a validade */
    this.form.controls.sem_validade.valueChanges.subscribe(sem => {
      if (sem) {
        this.form.controls.data_validade.disable();
        this.form.controls.data_validade.setValue('');
      } else {
        this.form.controls.data_validade.enable();
      }
    });
    this.form.controls.data_validade.disable();

    /** Reação automática para recalcular quantidades sugeridas de consumo */
    this.form.controls.quantidade_planejada.valueChanges.subscribe(qtd => {
      const qtdPlanejada = Number(qtd) || 1;
      this.consumosArray.controls.forEach(ctrl => {
        const unidade = ctrl.get('unidade')?.value;
        const necessita = Number(ctrl.get('quantidade_necessaria')?.value) || 0;
        let novoValor = necessita * qtdPlanejada;
        
        if (unidade !== 'UN') {
          novoValor = Number(novoValor.toFixed(2));
        } else {
          novoValor = Math.floor(novoValor);
        }
        
        ctrl.get('quantidade_consumida')?.setValue(novoValor);
      });
    });
  }

  getInsumosParaMP(materiaPrimaId: number): InsumoEstoque[] {
    return this.insumosDisponiveis().get(materiaPrimaId) ?? [];
  }

  voltarParaLista(): void {
    this.router.navigate(['/app/lote']);
  }

  onSubmit(): void {
    this.erro.set(null);
    this.fieldErrors.set({});

    const formValue = this.form.getRawValue();

    try {
      // Validação rigorosa com Zod
      criarLoteSchema.parse(formValue);
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: Record<string, string> = {};
        err.issues.forEach((e: any) => {
          if (e.path[0]) {
            errors[e.path[0].toString()] = e.message;
          }
        });
        this.fieldErrors.set(errors);
        this.erro.set('Existem erros no formulário. Por favor, corrija-os.');
      }
      return;
    }

    this.salvando.set(true);

    const payload = {
      produto_id: Number(formValue.produto_id),
      data_producao: formValue.data_producao,
      turno: formValue.turno,
      quantidade_planejada: Number(formValue.quantidade_planejada),
      data_validade: formValue.sem_validade ? null : formValue.data_validade || null,
      observacoes: formValue.observacoes || '',
      consumos: formValue.consumos.map((c: any) => ({
        insumo_estoque_id: Number(c.insumo_estoque_id),
        quantidade_consumida: Number(c.quantidade_consumida),
      })),
    };

    this.loteService.createLote(payload)
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (loteGerado: any) => {
          this.router.navigate(['/app/lote', loteGerado.id]);
        },
        error: (err) => {
          this.erro.set(err.error?.message || 'Não foi possível criar o lote.');
        },
      });
  }
}
