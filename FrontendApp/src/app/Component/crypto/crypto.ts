import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Cryptoservice } from '../../Services/Crypto/cryptoservice';

@Component({
  selector: 'app-crypto',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule,
            MatTabsModule, MatProgressSpinnerModule, MatIconModule, MatTooltipModule,
            MatSnackBarModule, CdkTextareaAutosize],
  templateUrl: './crypto.html',
  styleUrl: './crypto.css',
})
export class Crypto {
  private readonly svc   = inject(Cryptoservice);
  private readonly snack = inject(MatSnackBar);

  masterKey  = signal('');
  showKey    = signal(false);
  plainText  = signal('');
  cipherText = signal('');
  encResult  = signal('');
  decResult  = signal('');
  loading    = signal(false);
  error      = signal('');

  encrypt() {
    if (!this.plainText() || !this.masterKey()) return;
    this.loading.set(true); this.error.set(''); this.encResult.set('');
    this.svc.encrypt({ masterKey: this.masterKey(), data: this.plainText() }).subscribe({
      next: res  => { this.encResult.set(res.data); this.loading.set(false); },
      error: err => { this.error.set(err.message ?? 'Encryption failed'); this.loading.set(false); }
    });
  }

  decrypt() {
    if (!this.cipherText() || !this.masterKey()) return;
    this.loading.set(true); this.error.set(''); this.decResult.set('');
    this.svc.decrypt({ masterKey: this.masterKey(), data: this.cipherText() }).subscribe({
      next: res  => { this.decResult.set(typeof res === 'string' ? res : JSON.stringify(res, null, 2)); this.loading.set(false); },
      error: err => { this.error.set(err.message ?? 'Decryption failed'); this.loading.set(false); }
    });
  }

  copy(text: string) {
    navigator.clipboard.writeText(text).then(() =>
      this.snack.open('Copied to clipboard', '', { duration: 2000, panelClass: 'snack-success' })
    );
  }

  clear(tab: 'enc' | 'dec') {
    if (tab === 'enc') { this.plainText.set('');  this.encResult.set(''); }
    else               { this.cipherText.set(''); this.decResult.set(''); }
    this.error.set('');
  }
}
