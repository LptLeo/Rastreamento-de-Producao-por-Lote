import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../../services/auth.service.js';

/**
 * Guard que protege rotas privadas.
 *
 * Aguarda o `sessaoCarregada$` (ReplaySubject) antes de decidir redirecionar.
 * Isso evita o race condition do F5: quando o usuário recarrega a página, o
 * silent refresh é assíncrono — sem aguardar, o guard vê `isLoggedIn() = false`
 * e redireciona para /login antes da resposta do servidor chegar.
 *
 * ReplaySubject(1) garante que:
 * - Se o refresh ainda está em andamento: aguarda a emissão.
 * - Se o refresh já completou: recebe a emissão imediatamente (replay).
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.sessaoCarregada$.pipe(
    take(1), // Pega apenas a primeira chamada e depois corta a conexão
    map(() => {
      if (authService.isLoggedIn()) return true;

      /**
       * Usamos parseUrl em vez de navigate().
       * O parseUrl retorna uma UrlTree (um objeto/bilhete), sendo a forma declarativa do Angular
       * lidar com redirecionamentos em Guards. Isso evita efeitos colaterais de navegação
       * simultânea (race conditions) que o navigate() poderia causar aqui.
       */
      return router.parseUrl('/login');
    }),
  );
};
