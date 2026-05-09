import { Login } from './login';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

let component: Login;
let fixture: ComponentFixture<Login>;

// Definindo mock com a mesma estrutura que o componente espera
const authServiceMock = { login: jest.fn() }
// Dublê do Router
const routerMock = { navigate: jest.fn() };

beforeEach(async () => {
    await TestBed.configureTestingModule({
        imports: [Login],
        providers: [
            // Substituindo os serviços reais pelos dublês
            { provide: AuthService, useValue: authServiceMock },
            { provide: Router, useValue: routerMock }
        ]
    }).compileComponents();

    // O fixture é como uma "caixa" que envolve o componente para podermos inspecioná-lo
    fixture = TestBed.createComponent(Login);
    // O Componente é uma instancia da classe fake escrita em login.ts
    component = fixture.componentInstance;

    fixture.detectChanges();
});

it('Deve iniciar com o formulário inválido', () => {
    // ARRANGE
    // Verificamos se a propriedade valid é falsa
    expect(component.loginForm.valid).toBe(false);

    // ACT
    // Adicionando valores válidos
    component.loginForm.patchValue({ email: 'teste@email.com', senha: 'senha123' });

    // ARRANGE
    // Verificando se a propriedade valid é true
    expect(component.loginForm.valid).toBe(true);
});

it('Deve chamar o authService.login quando o formulário for válido', () => {
    // ARRANGE
    const credentials = {
        email: 'teste@email.com',
        senha: 'senha123'
    }

    component.loginForm.patchValue(credentials);

    // Simulando o comportamento do método login do AuthService para retornar um Observable de sucesso
    authServiceMock.login.mockReturnValue(of({ tokenAcesso: 'example' }));

    // ACT
    component.login();

    // ASSERT
    expect(authServiceMock.login).toHaveBeenCalledWith(credentials);
    expect(component.isLoading()).toBe(false);
    expect(component.loginForm.getRawValue().email).toBe('');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/app/dashboard']);
});

it('Deve exibir mensagem no erro quando o login falhar', () => {
    // ARRANGE
    const erroMock = { status: 401, error: { message: 'E-mail ou senha incorretos.' } };
    authServiceMock.login.mockReturnValue(throwError(() => erroMock)); // Simulando erro vindo do servidor

    // ACT
    component.loginForm.patchValue({ email: 'teste@email.com', senha: 'senha123' });
    component.login();

    // ASSERT
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('E-mail ou senha incorretos.');
});

it('Deve exibir mensagem no erro quando o login falhar em conectar-se', () => {
    // ARRANGE
    const erroMock = { status: 0, error: { message: 'Erro de conexão. Verifique sua internet ou se o servidor está online.' } };
    authServiceMock.login.mockReturnValue(throwError(() => erroMock)); // Simulando erro vindo do servidor

    // ACT
    component.loginForm.patchValue({ email: 'teste@email.com', senha: 'senha123' });
    component.login();

    // ASSERT
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('Erro de conexão. Verifique sua internet ou se o servidor está online.');
});

it('Deve limpar a mensagem de erro quando o usuário digitar nos inputs', () => {
    // ARRANGE
    component.errorMessage.set('Erro') // Simula erro

    // ACT
    component.loginForm.get('email')?.setValue('a'); // Simula digitação
    fixture.detectChanges(); // Garante a detecção da mudança

    // ASSERT
    expect(component.errorMessage()).toBe(''); // Verifica se foi limpo
});

it('Deve desabilitar o botão quando o formulário for inválido ou estiver carregando', () => {
    // ARRANGE
    const botao = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    // Cenário 1: Formulário inválido
    // ACT & ASSERT
    fixture.detectChanges();
    expect(botao.disabled).toBe(true);

    // Cenário 2: Formulário válido, isLoading: true
    // ACT
    component.loginForm.patchValue({ email: 'teste@email.com', senha: 'senha123' });
    component.isLoading.set(true);
    fixture.detectChanges();

    // ASSERT
    expect(botao.disabled).toBe(true);

    // Cenário 3: Tudo pronto para login
    // ACT
    component.isLoading.set(false);
    fixture.detectChanges();

    // ASSERT
    expect(botao.disabled).toBe(false);
});

it('Deve exibir a mensagem "o email é obrigatório" quando o campo é tocado e está vazio', () => {
    // ARRANGE
    const emailControl = component.loginForm.get('email');
    emailControl?.setValue('');
    emailControl?.markAsTouched();

    // ACT
    fixture.detectChanges();

    // ASSERT
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('O email é obrigatório');
});

it('Não deve exibir a mensagem "o email é obrigatório" quando o campo está intocado ou contendo algo', () => {
    // ARRANGE
    const emailControl = component.loginForm.get('email');
    const compiled = fixture.nativeElement as HTMLElement;

    // ACT & ASSERT - Cenário 1: Campo vazio mas intocado
    emailControl?.setValue('');
    emailControl?.markAsUntouched();
    fixture.detectChanges();
    expect(compiled.textContent).not.toContain('O email é obrigatório');

    // ACT & ASSERT - Cenário 2: Campo preenchido e tocado
    emailControl?.setValue('teste@email.com');
    emailControl?.markAsTouched();
    fixture.detectChanges();
    expect(compiled.textContent).not.toContain('O email é obrigatório');
});

it('Deve aplicar a classe de borda vermelha apenas quando o campo for inválido e tocado', () => {
    // ARRANGE
    const emailInput = fixture.nativeElement.querySelector('#usuario') as HTMLInputElement;
    const emailControl = component.loginForm.get('email');

    // ACT & ASSERT - Cenário 1: Inválido mas NÃO tocado
    fixture.detectChanges();
    expect(emailInput.classList).not.toContain('border-red-500');

    // ACT & ASSERT - Cenário 2: Inválido e tocado
    emailControl?.setValue('');
    emailControl?.markAsTouched();
    fixture.detectChanges();
    expect(emailInput.classList).toContain('border-red-500');

    // ACT & ASSERT - Cenário 3: Valido e tocado
    emailControl?.setValue('teste@email.com');
    emailControl?.markAsTouched();
    fixture.detectChanges();
    expect(emailInput.classList).not.toContain('border-red-500');
});

it('Deve exibir mensagem de erro genérica quando o backend não envia uma mensagem específica', () => {
    // ARRANGE
    const erroSemMensagem = { status: 500, error: {} };
    authServiceMock.login.mockReturnValue(throwError(() => erroSemMensagem));

    // ACT
    component.loginForm.patchValue({ email: 'teste@email.com', senha: 'senha123' });
    component.login();

    // ASSERT
    expect(component.errorMessage()).toBe('Ocorreu um erro inesperado ao fazer login.');
});

it('Deve dar um return vazio se o formulário for inválido', () => {
    // ARRANGE
    component.loginForm.patchValue({ email: '', senha: '' });
    authServiceMock.login.mockClear();

    // ACT
    component.login();

    // ASSERT
    expect(authServiceMock.login).not.toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);
});