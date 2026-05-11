import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoteNovo } from './lote-novo.js';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service.js';
import { LoteFeatureService } from '../../services/lote.service.js';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

describe('LoteNovo Component', () => {
  let component: LoteNovo;
  let fixture: ComponentFixture<LoteNovo>;
  let mockRouter: any;
  let mockAuthService: any;
  let mockLoteService: any;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockRouter = { navigate: jest.fn() };
    mockAuthService = { usuario: signal({ id: 1, perfil: 'operador' }) };
    mockLoteService = {
      getProdutos: jest.fn().mockReturnValue(of([])),
      getInsumosDisponiveis: jest.fn().mockReturnValue(of([])),
      createLote: jest.fn(),
    };
    mockActivatedRoute = {
      snapshot: {
        queryParamMap: convertToParamMap({})
      }
    };

    await TestBed.configureTestingModule({
      imports: [LoteNovo, ReactiveFormsModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: LoteFeatureService, useValue: mockLoteService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoteNovo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve pré-selecionar o produto se produtoId vier nos query params', async () => {
    // Recria o componente com o mock configurado com ID
    mockActivatedRoute.snapshot.queryParamMap = convertToParamMap({ produtoId: '42' });
    
    // Precisamos reinicializar para o ngOnInit ler o novo valor do mock
    component.ngOnInit();
    
    expect(component.form.controls.produto_id.value).toBe(42);
  });

  describe('Validação com Zod', () => {
    it('deve mostrar erro se o formulário estiver vazio ao submeter', () => {
      component.onSubmit();
      expect(component.erro()).toBe('Existem erros no formulário. Por favor, corrija-os.');
      expect(component.fieldErrors()['produto_id']).toBeDefined();
    });

    it('deve validar que quantidade_planejada deve ser positiva', () => {
      component.form.patchValue({
        produto_id: 1,
        quantidade_planejada: -5,
        turno: 'manha',
        data_producao: '2026-01-01',
      });

      component.onSubmit();
      expect(component.fieldErrors()['quantidade_planejada']).toBe(
        'A quantidade deve ser maior que zero.',
      );
    });
  });

  describe('Criação de Lote', () => {
    it('deve chamar o serviço se os dados forem válidos', () => {
      const payloadValido = {
        produto_id: 1,
        quantidade_planejada: 100,
        turno: 'manha',
        data_producao: '2026-01-01',
        sem_validade: true,
        consumos: [{ materia_prima_id: 1, insumo_estoque_id: 10, quantidade_consumida: 10 }],
      };

      // Mock de produtos carregados para passar na validação interna se houver
      component.produtosResource.set([{ id: 1, nome: 'Teste', receita: [] }] as any);

      component.form.patchValue({
        produto_id: 1,
        quantidade_planejada: 100,
        turno: 'manha',
        data_producao: '2026-01-01',
        sem_validade: true,
      });

      // Simula adição de um consumo no FormArray
      const fb = (component as any).fb;
      const consumosArray = component.consumosArray;
      consumosArray.push(
        fb.group({
          materia_prima_id: [1],
          insumo_estoque_id: [10],
          quantidade_consumida: [10],
        }),
      );

      mockLoteService.createLote.mockReturnValue(of({ id: 99 }));

      component.onSubmit();

      expect(mockLoteService.createLote).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/app/lote', 99]);
    });
  });

  it('deve recalcular quantidade consumida sem casas decimais para unidade UN', () => {
    const fb = (component as any).fb;
    component.consumosArray.clear();
    component.consumosArray.push(
      fb.group({
        materia_prima_id: [1],
        materia_prima_nome: ['Tampa'],
        quantidade_necessaria: [1.8],
        unidade: ['UN'],
        insumo_estoque_id: [10],
        quantidade_consumida: [1],
      }),
    );

    component.form.controls.quantidade_planejada.setValue(3);

    expect(component.consumosArray.at(0).get('quantidade_consumida')?.value).toBe(5);
  });
});
