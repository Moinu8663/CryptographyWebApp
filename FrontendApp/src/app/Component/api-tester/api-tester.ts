import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';

export interface KeyValue { key: string; value: string; enabled: boolean; }

@Component({
  selector: 'app-api-tester',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule,
            MatSelectModule, MatFormFieldModule, MatInputModule, MatTabsModule,
            MatSnackBarModule, MatChipsModule],
  templateUrl: './api-tester.html',
  styleUrl: './api-tester.css',
})
export class ApiTester {
  private readonly http   = inject(HttpClient);
  private readonly snack  = inject(MatSnackBar);

  methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  method  = signal('GET');
  url     = signal('');
  body    = signal('');
  loading = signal(false);

  headers: KeyValue[] = [{ key: 'Content-Type', value: 'application/json', enabled: true }];
  params:  KeyValue[] = [{ key: '', value: '', enabled: true }];

  response = signal<{ status: number; statusText: string; time: number; size: string; body: string } | null>(null);
  error    = signal('');

  addHeader() { this.headers.push({ key: '', value: '', enabled: true }); }
  removeHeader(i: number) { this.headers.splice(i, 1); }

  addParam() { this.params.push({ key: '', value: '', enabled: true }); }
  removeParam(i: number) { this.params.splice(i, 1); }

  get methodColor() {
    const map: Record<string, string> = {
      GET: '#22c55e', POST: '#3b82f6', PUT: '#f59e0b',
      PATCH: '#a78bfa', DELETE: '#ef4444'
    };
    return map[this.method()] ?? '#fff';
  }

  get fullUrl(): string {
    const active = this.params.filter(p => p.enabled && p.key);
    if (!active.length) return this.url();
    const qs = active.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
    return `${this.url()}?${qs}`;
  }

  private normalizeProxyTarget(rawUrl: string): string {
    // If user enters a full proxy url, leave it.
    // Otherwise, treat it as the target and wrap with our proxy endpoint.
    // Expected frontend proxy endpoint:
    //   /backend-api/Proxy/forward?target=<url>&method=<HTTP_METHOD>
    const trimmed = rawUrl.trim();
    if (!trimmed) return trimmed;

    // Heuristic: if it already starts with the backend proxy URL, keep as-is.
    if (trimmed.startsWith('/backend-api/Proxy/forward') || trimmed.startsWith('backend-api/Proxy/forward')) return trimmed;
    if (trimmed.includes('/backend-api/Proxy/forward')) return trimmed;

    const m = encodeURIComponent(this.method());
    const t = encodeURIComponent(trimmed);
    return `/backend-api/Proxy/forward?target=${t}&method=${m}`;
  }


  private get effectiveUrlForRequest(): string {
    // Always call through our backend proxy to avoid CORS for external targets.
    // If user enters a URL already pointing to your backend, proxy still works.
    return this.normalizeProxyTarget(this.url());
  }


  send() {
    if (!this.url()) return;
    this.loading.set(true); this.error.set(''); this.response.set(null);

    let hdrs = new HttpHeaders();
    this.headers.filter(h => h.enabled && h.key).forEach(h => { hdrs = hdrs.set(h.key, h.value); });

    const start = Date.now();
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(this.method());
    let bodyPayload: any = undefined;

    if (hasBody && this.body()) {
      try { bodyPayload = JSON.parse(this.body()); }
      catch { bodyPayload = this.body(); }
    }

      this.http.request(this.method(), this.effectiveUrlForRequest, {
      headers: hdrs,
      body: bodyPayload,
      observe: 'response',
      responseType: 'text',
    }).subscribe({
      next: (res: HttpResponse<string>) => {
        const elapsed = Date.now() - start;
        const raw = res.body ?? '';
        let pretty = raw;
        try { pretty = JSON.stringify(JSON.parse(raw), null, 2); } catch {}
        const bytes = new Blob([raw]).size;
        const size  = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
        this.response.set({ status: res.status, statusText: res.statusText, time: elapsed, size, body: pretty });
        this.loading.set(false);
      },
      error: err => {
        const elapsed = Date.now() - start;
        const raw = err.error ?? '';
        let pretty = raw;
        try { pretty = JSON.stringify(JSON.parse(raw), null, 2); } catch {}
        this.response.set({ status: err.status, statusText: err.statusText, time: elapsed, size: '—', body: pretty || err.message });
        this.loading.set(false);
      }
    });
  }

  copy(text: string) {
    navigator.clipboard.writeText(text).then(() =>
      this.snack.open('Copied!', '', { duration: 1800 })
    );
  }

  get statusClass() {
    const s = this.response()?.status ?? 0;
    if (s >= 200 && s < 300) return 'status-ok';
    if (s >= 400 && s < 500) return 'status-warn';
    return 'status-err';
  }
}
