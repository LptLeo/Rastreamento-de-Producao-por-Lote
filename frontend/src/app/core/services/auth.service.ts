import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';

export interface UserInfo {
  id: number;
  nome: string;
  perfil: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/api/auth/login';

  // Sinal reativo para armazenar o usuário logado
  usuario = signal<UserInfo | null>(null);

  constructor() {
    this.carregarUsuarioDoToken();
  }

  login(credentials: { email: string, senha: string }) {
    return this.http.post<{ token: string, usuario: any }>(this.API_URL, credentials).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        this.carregarUsuarioDoToken();
      })
    )
  }

  private carregarUsuarioDoToken() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        this.usuario.set(null);
        return;
      }

      const partes = token.split('.');
      if (partes.length !== 3) return;

      const payload = JSON.parse(atob(partes[1]));
      
      // Verifica expiração
      if (payload.exp < Date.now() / 1000) {
        this.logout();
        return;
      }

      this.usuario.set({
        id: payload.id,
        nome: payload.nome,
        perfil: payload.perfil
      });
    } catch (error) {
      console.error('Erro ao carregar usuário do token:', error);
      this.usuario.set(null);
    }
  }

  isLoggedIn() {
    try {
      const token = localStorage.getItem("token");

      if (!token) return false;

      // atob decodifica o base64
      // split('.') divide o token em 3 partes
      // [1] pega a segunda parte (payload)
      const partes = token.split('.');

      if (partes.length !== 3) return false;

      const payload = JSON.parse(atob(partes[1]));
      const tokenExpirado = payload.exp < Date.now() / 1000;

      if (tokenExpirado) {
        this.logout();
      }

      return !tokenExpirado;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  logout() {
    localStorage.removeItem('token');
    this.usuario.set(null);
  }
}
