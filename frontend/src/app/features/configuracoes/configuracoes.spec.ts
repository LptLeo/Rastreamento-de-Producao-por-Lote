import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Configuracoes } from './configuracoes.js';
import { ConfiguracoesService } from '../../core/services/configuracoes.service.js';
import { signal } from '@angular/core';

describe('Configuracoes', () => {
  let component: Configuracoes;
  let fixture: ComponentFixture<Configuracoes>;
  let mockConfigService: any;

  beforeEach(async () => {
    mockConfigService = {
      settings: signal({
        lote: { producaoTotalPeriodo: 'mes', atividadeTempoRealBase: 5 },
        dashboard: { autoRefresh: true },
      }),
      updateSettings: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Configuracoes],
      providers: [{ provide: ConfiguracoesService, useValue: mockConfigService }],
    }).compileComponents();

    fixture = TestBed.createComponent(Configuracoes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });
});
