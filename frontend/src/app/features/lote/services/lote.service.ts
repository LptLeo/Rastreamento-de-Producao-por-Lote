import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LoteDetalhe } from '../../../shared/models/lote.models';

const API_URL = 'http://localhost:3000/api';

@Injectable({
  providedIn: 'root',
})
export class LoteFeatureService {
  private http = inject(HttpClient);

  /** Busca os detalhes completos de um lote (insumos + inspeção). */
  getLoteById(id: number): Observable<LoteDetalhe> {
    return this.http.get<LoteDetalhe>(`${API_URL}/lotes/${id}`);
  }
}
