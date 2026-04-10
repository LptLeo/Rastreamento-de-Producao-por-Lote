import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { Lote } from './features/lote/lote';
import { Rastreabilidade } from './features/rastreabilidade/rastreabilidade';
import { Configuracoes } from './features/configuracoes/configuracoes';
import { authGuard } from './core/guards/auth/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'app/dashboard',
    component: Dashboard,
    canActivate: [authGuard],
    pathMatch: 'full'
  },
  {
    path: 'app/lote',
    component: Lote,
    canActivate: [authGuard],
    pathMatch: 'full'
  },
  {
    path: 'app/rastreabilidade',
    component: Rastreabilidade,
    canActivate: [authGuard],
    pathMatch: 'full'
  },
  {
    path: 'app/configuracoes',
    component: Configuracoes,
    canActivate: [authGuard],
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
