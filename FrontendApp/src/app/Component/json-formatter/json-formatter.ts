import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-json-formatter',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './json-formatter.html',
  styleUrl: './json-formatter.css',
})
export class JsonFormatter {
  private readonly snack = inject(MatSnackBar);

  input  = signal('');
  output = signal('');
  error  = signal('');

  autoResize(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  format() {
    this.error.set('');
    try {
      const parsed = JSON.parse(this.input());
      this.output.set(JSON.stringify(parsed, null, 2));
    } catch (e: any) {
      this.error.set(e.message);
      this.output.set('');
    }
  }

  minify() {
    this.error.set('');
    try {
      const parsed = JSON.parse(this.input());
      this.output.set(JSON.stringify(parsed));
    } catch (e: any) {
      this.error.set(e.message);
      this.output.set('');
    }
  }

  clear() {
    this.input.set('');
    this.output.set('');
    this.error.set('');
  }

  copy() {
    if (!this.output()) return;
    navigator.clipboard.writeText(this.output()).then(() =>
      this.snack.open('Copied to clipboard', '', { duration: 2000 })
    );
  }
}
