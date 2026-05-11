import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../../services/auth.service.js';

/**
 * Guard para rotas de convidados (ex: Login).
 * Se o usuário já estiver logado, redireciona para o Dashboard.
 *
 * Assim como o authGuard, aguarda a inicialização da sessão para evitar
 * redirecionamentos errados durante o recarregamento (F5).
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.sessaoCarregada$.pipe(
    take(1),
    map(() => {
      if (authService.isLoggedIn()) {
        return router.parseUrl('/app/dashboard');
      }
      return true;
    }),
  );
};
