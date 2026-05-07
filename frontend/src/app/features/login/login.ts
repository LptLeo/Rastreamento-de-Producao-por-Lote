import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service.js';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})

export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  errorMessage = signal('');
  isLoading = signal(false);

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(8)]]
  })

  constructor() {
    this.loginForm.valueChanges
      .pipe(takeUntilDestroyed()) // Evita vazamento de memmória, cancelando a inscrição quando o componente for destruído.
      .subscribe(() => this.errorMessage.set('')); // Limpa a mensagem de erro sempre que o usuário digitar algo no formulário.
  }

  login(): void {
    if (this.loginForm.invalid) return; // Para o usuário não apertar Enter e tentar logar mesmo com o botão desabilitado.

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { email, senha } = this.loginForm.getRawValue();
    const credentials = { email, senha };

    this.authService.login(credentials).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.loginForm.reset();
        this.router.navigate(['/app/dashboard']);
      },

      error: (err) => {
        this.isLoading.set(false);

        if (err.status === 0) {
          this.errorMessage.set('Erro de conexão. Verifique sua internet ou se o servidor está online.');
          return;
        }

        const mensagemDoBackend = err.error?.message;

        if (mensagemDoBackend) {
          this.errorMessage.set(mensagemDoBackend);
        } else {
          this.errorMessage.set('Ocorreu um erro inesperado ao fazer login.');
        }
      }
    });
  }
}
