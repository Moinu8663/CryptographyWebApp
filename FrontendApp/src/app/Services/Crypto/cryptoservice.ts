import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../Environment/environment';


@Injectable({ providedIn: 'root' })
export class Cryptoservice {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  encrypt(data: any): Observable<any> {
    return this.http.post<any>(`${this.base}Crypto/encrypt`, data).pipe(
      catchError(err => throwError(() => err))
    );
  }

  decrypt(data: any): Observable<any> {
    return this.http.post<any>(`${this.base}Crypto/decrypt`, data).pipe(
      catchError(err => throwError(() => err))
    );
  }
}
