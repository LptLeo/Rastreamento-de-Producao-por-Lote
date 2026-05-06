import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Insumos } from './insumos.js';
import { InsumosService } from './services/insumos.service.js';
import { AuthService } from '../../core/services/auth.service.js';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Insumos Component', () => {
  let component: Insumos;
  let fixture: ComponentFixture<Insumos>;
  let mockInsumosService: any;
  let mockAuthService: any;

  beforeEach(async () => {
    mockInsumosService = {
      getAll: jest.fn().mockReturnValue(of({ itens: [], meta: {} })),
      getMateriasPrimasPaginado: jest.fn().mockReturnValue(of({ itens: [], meta: {} })),
      getMateriasPrimas: jest.fn().mockReturnValue(of([])),
      getCategoriasMateriasPrimas: jest.fn().mockReturnValue(of([])),
      getContagem: jest.fn().mockReturnValue(of({ total: 0, comSaldo: 0, esgotados: 0 })),
    };

    mockAuthService = {
      usuario: signal({ id: 1, perfil: 'gestor' }),
    };

    await TestBed.configureTestingModule({
      imports: [Insumos, HttpClientTestingModule],
      providers: [
        { provide: InsumosService, useValue: mockInsumosService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Insumos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve trocar a aba ativa ao chamar setAba', () => {
    component.setAba('catalogo');
    expect(component.abaAtiva()).toBe('catalogo');
    expect(component.termoPesquisa()).toBe('');
  });

  it('deve limpar filtros de estoque no método dedicado', () => {
    component.filtroEsgotado.set(true);
    component.filtroFornecedor.set('Fornecedor XPTO');
    component.ordenarPor.set('menor_estoque');
    component.currentPageEstoque.set(3);

    component.limparFiltrosEstoque();

    expect(component.filtroEsgotado()).toBe(false);
    expect(component.filtroFornecedor()).toBe('');
    expect(component.ordenarPor()).toBe('mais_recente');
    expect(component.currentPageEstoque()).toBe(1);
  });
});
