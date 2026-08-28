import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../Environment/environment';

export interface AiChatRequest {
  prompt: string;
}

export interface AiChatResponse {
  reply: string;
}

@Injectable({ providedIn: 'root' })
export class AiChatService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  chat(prompt: string): Observable<AiChatResponse> {
    // ApiTester uses responseType:'text' to simplify showing JSON,
    // but the chat bot expects a typed object. Using default JSON parsing.
    return this.http.post<AiChatResponse>(`${this.base}AiChat/chat`, { prompt });
  }

}

