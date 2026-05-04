import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service.js';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve realizar login e salvar o token na memoria', () => {
    const mockResponse = {
      tokenAcesso: 'jwt-123',
      usuario: { id: 1, nome: 'Teste', perfil: 'gestor' }
    };

    service.login('admin@t.com', '123').subscribe(user => {
      expect(user.id).toBe(1);
      expect(service.tokenAcesso()).toBe('jwt-123');
      expect(service.usuario()?.nome).toBe('Teste');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('deve limpar os dados no logout', () => {
    // Simula estado logado
    (service as any).tokenAcesso.set('token');
    (service as any).usuario.set({ id: 1, nome: 'Teste', perfil: 'gestor' });

    service.logout();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
    expect(req.request.method).toBe('POST');
    req.flush({});

    expect(service.tokenAcesso()).toBeNull();
    expect(service.usuario()).toBeNull();
  });
});
