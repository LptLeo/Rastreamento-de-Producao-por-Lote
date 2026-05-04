import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoteNovo } from './lote-novo.js';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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

  beforeEach(async () => {
    mockRouter = { navigate: jest.fn() };
    mockAuthService = { usuario: signal({ id: 1, perfil: 'operador' }) };
    mockLoteService = {
      getProdutos: jest.fn().mockReturnValue(of([])),
      getInsumosDisponiveis: jest.fn().mockReturnValue(of([])),
      createLote: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [LoteNovo, ReactiveFormsModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: LoteFeatureService, useValue: mockLoteService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoteNovo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
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
        data_producao: '2026-01-01'
      });
      
      component.onSubmit();
      expect(component.fieldErrors()['quantidade_planejada']).toBe('A quantidade deve ser maior que zero.');
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
        consumos: [
          { materia_prima_id: 1, insumo_estoque_id: 10, quantidade_consumida: 10 }
        ]
      };

      // Mock de produtos carregados para passar na validação interna se houver
      component.produtosResource.set([{ id: 1, nome: 'Teste', receita: [] }] as any);

      component.form.patchValue({
        produto_id: 1,
        quantidade_planejada: 100,
        turno: 'manha',
        data_producao: '2026-01-01',
        sem_validade: true
      });

      // Simula adição de um consumo no FormArray
      const fb = (component as any).fb;
      const consumosArray = component.consumosArray;
      consumosArray.push(fb.group({
        materia_prima_id: [1],
        insumo_estoque_id: [10],
        quantidade_consumida: [10]
      }));

      mockLoteService.createLote.mockReturnValue(of({ id: 99 }));

      component.onSubmit();

      expect(mockLoteService.createLote).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/app/lote', 99]);
    });
  });
});
