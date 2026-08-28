import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { Cryptoservice } from '../../Services/Crypto/cryptoservice';
import { environment } from '../../Environment/environment';


interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

interface QuickAction {
  label: string;
  prompt: string;
}

@Component({
  selector: 'app-ai-chat-bot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatCardModule,
  ],
  templateUrl: './ai-chat-bot.html',
  styleUrl: './ai-chat-bot.css',
})
export class AiChatBotComponent {
  private readonly crypto = inject(Cryptoservice);
  private readonly http = inject(HttpClient);

  private readonly initialMessages: ChatMessage[] = [
    {
      role: 'ai',
      text: 'Ask me to encrypt, decrypt, test an API, or format JSON. Example: format {"name":"Moin"}',
    },
  ];

  prompt = signal('');
  loading = signal(false);
  error = signal('');
  isOpen = signal(false);

  messages = signal<ChatMessage[]>([...this.initialMessages]);

  quickActions: QuickAction[] = [
    { label: 'Encrypt', prompt: 'encrypt text "hello" key "my-secret-key"' },
    { label: 'Decrypt', prompt: 'decrypt data "paste-encrypted-text" key "my-secret-key"' },
    { label: 'API Test', prompt: 'test GET https://jsonplaceholder.typicode.com/posts/1' },
  ];

  private pushMessage(role: 'user' | 'ai', text: string) {
    this.messages.update(m => [...m, { role, text }]);
  }

  togglePopup() {
    this.isOpen.update(open => !open);
  }

  closePopup() {
    this.isOpen.set(false);
  }

  clearChat() {
    this.prompt.set('');
    this.error.set('');
    this.loading.set(false);
    this.messages.set([...this.initialMessages]);
  }

  useQuickAction(prompt: string) {
    this.isOpen.set(true);
    this.prompt.set(prompt);
    this.send();
  }

  send() {
    const p = this.prompt().trim();
    if (!p || this.loading()) return;

    this.error.set('');
    this.loading.set(true);
    this.pushMessage('user', p);
    this.prompt.set('');

    if (this.tryApiPrompt(p)) return;
    if (this.tryCryptoPrompt(p)) return;
    if (this.tryJsonPrompt(p)) return;

    this.pushMessage('ai', this.helpText());
    this.loading.set(false);
  }

  private tryJsonPrompt(prompt: string): boolean {
    const lower = prompt.toLowerCase();
    const isJsonTask = /(json|format|minify|validate|pretty)/.test(lower);
    const jsonText = this.extractJson(prompt);

    if (!isJsonTask && !jsonText) return false;

    if (!jsonText) {
      this.pushMessage('ai', 'Paste JSON with your request. Example: format {"name":"Moin","active":true}');
      this.loading.set(false);
      return true;
    }

    try {
      const parsed = JSON.parse(jsonText);
      const output = lower.includes('minify')
        ? JSON.stringify(parsed)
        : JSON.stringify(parsed, null, 2);

      this.pushMessage('ai', `JSON is valid.\n\n${output}`);
    } catch (e: any) {
      this.pushMessage('ai', `JSON is not valid.\n\n${e.message}`);
    }

    this.loading.set(false);
    return true;
  }

  private tryCryptoPrompt(prompt: string): boolean {
    const lower = prompt.toLowerCase();
    const action = lower.includes('decrypt') ? 'decrypt' : lower.includes('encrypt') ? 'encrypt' : '';
    if (!action) return false;

    const masterKey = this.extractPromptField(prompt, ['master key', 'masterkey', 'key']);
    const rawData = this.extractPromptField(prompt, ['ciphertext', 'cipher', 'data', 'text', 'value', 'message'])
      ?? this.extractCryptoFallback(prompt, action);
    const data = action === 'decrypt' && rawData ? this.normalizeCipherText(rawData) : rawData;

    if (!masterKey || !data) {
      this.pushMessage('ai', [
        `I can ${action}, but I need both data and a key.`,
        `Example: ${action} text "hello" key "my-secret-key"`,
      ].join('\n'));
      this.loading.set(false);
      return true;
    }

    const request$ = action === 'encrypt'
      ? this.crypto.encrypt({ masterKey, data })
      : this.crypto.decrypt({ masterKey, data });

    request$.subscribe({
      next: res => {
        const result = action === 'encrypt'
          ? res?.data
          : typeof res === 'string' ? res : JSON.stringify(res, null, 2);

        this.pushMessage('ai', `${this.titleCase(action)} result:\n\n${result}`);
        this.loading.set(false);
      },
      error: err => {
        this.pushMessage('ai', err?.error?.message ?? err?.message ?? `${this.titleCase(action)} failed`);
        this.loading.set(false);
      },
    });

    return true;
  }

  private tryApiPrompt(prompt: string): boolean {
    const methodMatch = prompt.match(/\b(GET|POST|PUT|PATCH|DELETE)\b/i);
    const urlMatch = prompt.match(/https?:\/\/[^\s"']+/i);
    const lower = prompt.toLowerCase();

    if (!methodMatch && !urlMatch && !lower.includes('api')) return false;

    if (!methodMatch || !urlMatch) {
      this.pushMessage('ai', 'Give me an HTTP method and full URL. Example: test GET https://jsonplaceholder.typicode.com/posts/1');
      this.loading.set(false);
      return true;
    }

    const method = methodMatch[1].toUpperCase();
    const target = urlMatch[0];
    const bodyText = this.extractBody(prompt);
    let body: any = undefined;

    if (bodyText && ['POST', 'PUT', 'PATCH'].includes(method)) {
      try { body = JSON.parse(bodyText); }
      catch { body = bodyText; }
    }

    const isLocalBackend = this.isLocalBackendTarget(target);
    if (isLocalBackend && body && typeof body === 'object' && !Array.isArray(body)) {
      const maybeUrl = this.normalizeLocalBackendUrl(target);
      if (this.isCryptoEndpoint(maybeUrl) && !('masterKey' in body)) {
        body = { masterKey: environment.masterkey, ...body };
      }
    }

    const start = Date.now();
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const requestUrl = isLocalBackend
      ? this.normalizeLocalBackendUrl(target)
      : `/backend-api/Proxy/forward?target=${encodeURIComponent(target)}&method=${encodeURIComponent(method)}`;
    const responseType = isLocalBackend ? 'json' : 'text';

    this.http.request(method, requestUrl, {
      headers,
      body,
      observe: 'response',
      responseType,
    }).subscribe({
      next: (res: HttpResponse<any>) => {
        const responseBody = typeof res.body === 'string'
          ? res.body
          : res.body != null
            ? JSON.stringify(res.body, null, 2)
            : '';

        this.pushMessage('ai', this.apiResult(res.status, res.statusText, Date.now() - start, responseBody));
        this.loading.set(false);
      },
      error: err => {
        const raw = err?.error ?? err?.message ?? '';
        this.pushMessage('ai', this.apiResult(err?.status ?? 0, err?.statusText ?? 'Request failed', Date.now() - start, raw));
        this.loading.set(false);
      },
    });

    return true;
  }

  private isLocalBackendTarget(target: string): boolean {
    return /(^https?:\/\/localhost:4200\/backend-api\/)|(^\/backend-api\/)/i.test(target);
  }

  private normalizeLocalBackendUrl(target: string): string {
    try {
      const url = new URL(target, window.location.origin);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return target.replace(/^https?:\/\/localhost:4200/i, '');
    }
  }

  private isCryptoEndpoint(target: string): boolean {
    return /\/backend-api\/Crypto\/(encrypt|decrypt)/i.test(target);
  }

  private extractJson(text: string): string | null {
    const objectStart = text.indexOf('{');
    const arrayStart = text.indexOf('[');
    const starts = [objectStart, arrayStart].filter(i => i >= 0);
    if (!starts.length) return null;

    const start = Math.min(...starts);
    const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
    return end > start ? text.slice(start, end + 1).trim() : null;
  }

  private extractPromptField(text: string, names: string[]): string | null {
    for (const name of names) {
      const pattern = this.fieldPattern(name);
      const match = pattern.exec(text);
      if (!match?.index) {
        if (!match || match.index !== 0) continue;
      }

      const valueStart = match.index + match[0].length;
      const value = this.readFieldValue(text, valueStart);
      if (value) return value;
    }

    return null;
  }

  private extractNamedValue(text: string, names: string[]): string | null {
    for (const name of names) {
      const escaped = name.replace(/\s+/g, '\\s+');
      const match = text.match(new RegExp(`\\b${escaped}\\b\\s*(?:is|=|:)?\\s*("[^"]+"|'[^']+'|[^\\n]+)`, 'i'));
      if (match?.[1]) return this.cleanValue(this.trimAtNextField(match[1]));
    }

    return null;
  }

  private extractCryptoFallback(text: string, action: string): string | null {
    const withoutAction = text.replace(new RegExp(`\\b${action}\\b`, 'i'), '');
    const withoutKey = withoutAction.replace(/\b(?:with\s+)?(?:master\s*key|masterkey|key)\s*(?:is|=|:)?\s*("[^"]+"|'[^']+'|\S+)/i, '');
    const cleaned = this.cleanValue(withoutKey);
    return cleaned || null;
  }

  private extractBody(text: string): string | null {
    const bodyLabel = text.search(/\bbody\b/i);
    if (bodyLabel < 0) return this.extractJson(text);

    const afterBody = text.slice(bodyLabel);
    return this.extractJson(afterBody) ?? afterBody.replace(/\bbody\s*(?:is|=|:)?/i, '').trim();
  }

  private cleanValue(value: string): string {
    return value.trim().replace(/^["']|["']$/g, '').trim();
  }

  private fieldPattern(name: string): RegExp {
    const escaped = name.trim().replace(/\s+/g, '\\s*');
    return new RegExp(`\\b${escaped}\\b\\s*(?:is|=|:)?\\s*`, 'i');
  }

  private readFieldValue(text: string, start: number): string | null {
    const source = text.slice(start).trimStart();
    if (!source) return null;

    const quote = source[0];
    if (quote === '"' || quote === "'") {
      const close = source.indexOf(quote, 1);
      if (close > 0) return this.cleanValue(source.slice(0, close + 1));
    }

    const nextField = source.search(/\s(?:with\s+)?(?:master\s*key|masterkey|key|ciphertext|cipher|data|text|value|message|body)\b\s*(?:is|=|:)?/i);
    const value = nextField > 0 ? source.slice(0, nextField) : source;
    return this.cleanValue(value);
  }

  private normalizeCipherText(value: string): string {
    return value
      .replace(/\\r|\\n/g, '')
      .replace(/[\r\n\t\s]/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '');
  }

  private trimAtNextField(value: string): string {
    const field = value.search(/\s(?:with\s+)?(?:master\s*key|masterkey|key|data|text|value|message|cipher|ciphertext|body)\s*(?:is|=|:)?/i);
    return field > 0 ? value.slice(0, field) : value;
  }

  private apiResult(status: number, statusText: string, time: number, body: string): string {
    let formatted = body;
    try { formatted = JSON.stringify(JSON.parse(body), null, 2); } catch {}

    return [
      `API response: ${status} ${statusText}`.trim(),
      `Time: ${time} ms`,
      '',
      formatted || '(empty response)',
    ].join('\n');
  }

  private helpText(): string {
    return [
      'I can help with this project in three ways:',
      '1. encrypt text "hello" key "my-key"',
      '2. decrypt data "encrypted-value" key "my-key"',
      '3. test GET https://jsonplaceholder.typicode.com/posts/1',
      '4. format {"name":"Moin","active":true}',
    ].join('\n');
  }

  private titleCase(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

