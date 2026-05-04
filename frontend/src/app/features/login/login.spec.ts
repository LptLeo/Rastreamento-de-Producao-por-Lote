import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login.js';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service.js';
import { of, throwError } from 'rxjs';
import { FormsModule } from '@angular/forms';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let mockAuthService: any;
  let mockRouter: any;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn()
    };
    mockRouter = { navigate: jest.fn() };
    mockActivatedRoute = { queryParams: of({}) };

    await TestBed.configureTestingModule({
      imports: [Login, FormsModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve chamar o servico de login ao submeter dados validos', () => {
    component.email = 'admin@t.com';
    component.password = '123';
    mockAuthService.login.mockReturnValue(of({ id: 1 }));

    component.login();

    expect(mockAuthService.login).toHaveBeenCalledWith({ email: 'admin@t.com', senha: '123' });
  });

  it('deve exibir mensagem de erro se as credenciais forem invalidas', () => {
    component.email = 'erro@t.com';
    component.password = '000';
    mockAuthService.login.mockReturnValue(throwError(() => ({ error: { message: 'Credenciais inválidas' } })));

    component.login();

    expect(component.errorMessage).toBe('Credenciais inválidas');
  });
});
