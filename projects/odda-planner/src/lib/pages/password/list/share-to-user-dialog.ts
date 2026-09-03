import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { rxResource } from '@angular/core/rxjs-interop';
import { VaultService, VaultUserDto, SecretPermission } from '../../../api/index';
import { firstValueFrom } from 'rxjs';
import { wrapSecretKeyForDevice, unwrapSecretKeyWithDevicePrivateKey } from './crypt.manager';

export interface ShareToUserDialogData {
  secret: any;
  privateKey: CryptoKey;
  currentDeviceId: number;
}

@Component({
  selector: 'lib-share-to-user-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Condividi Password con Utente</h2>
    <mat-dialog-content class="dialog-content">
      <div class="secret-info">
        <strong>{{ data.secret.title }}</strong>
        <span class="username">{{ data.secret.username }}</span>
      </div>

      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Seleziona Utente</mat-label>
          <mat-select formControlName="targetUserId">
            @if (vaultUsers.isLoading()) {
              <mat-option disabled>Caricamento utenti...</mat-option>
            } @else if (availableUsers().length === 0) {
              <mat-option disabled>Nessun utente con vault disponibile</mat-option>
            } @else {
              @for (user of availableUsers(); track user.userId) {
                <mat-option [value]="user.userId">
                  {{ user.fullName || user.email }} ({{ user.deviceCount }} dispositivi)
                </mat-option>
              }
            }
          </mat-select>
          @if (form.get('targetUserId')?.hasError('required')) {
            <mat-error>Seleziona un utente</mat-error>
          }
        </mat-form-field>
      </form>

      @if (selectedUser()) {
        <div class="user-devices">
          <h4>Dispositivi dell'utente:</h4>
          @if (selectedUser()?.devices?.length === 0) {
            <p class="empty-message">Nessun dispositivo registrato</p>
          } @else {
            <ul>
              @for (device of selectedUser()?.devices; track device.deviceId) {
                <li>{{ device.deviceName }}</li>
              }
            </ul>
          }
        </div>
      }

      <div class="info-box info">
        <mat-icon>lock</mat-icon>
        <div>
          <strong>Crittografia End-to-End</strong>
          <p>
            La password verrà cifrata con le chiavi pubbliche di tutti i dispositivi dell'utente selezionato.
            Solo i suoi dispositivi potranno decifrarla.
          </p>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annulla</button>
      <button mat-raised-button color="primary" (click)="onShare()" 
              [disabled]="form.invalid || isLoading() || !selectedUser()?.devices?.length">
        @if (isLoading()) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          Condividi
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      padding: 20px 24px;
      min-width: 450px;
      max-height: 60vh;
      overflow-y: auto;
      display: block;
    }

    .secret-info {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .username {
      color: #666;
      font-size: 14px;
    }

    .full-width {
      width: 100%;
    }

    .user-devices {
      background: #e3f2fd;
      padding: 16px;
      border-radius: 8px;
      margin-top: 16px;
    }

    .user-devices h4 {
      margin: 0 0 8px 0;
    }

    .user-devices ul {
      margin: 0;
      padding-left: 20px;
    }

    .empty-message {
      color: #666;
      font-style: italic;
      margin: 0;
    }

    .info-box {
      display: flex;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      margin-top: 16px;
    }

    .info-box.info {
      background: #e8f5e9;
      border: 1px solid #81c784;
    }

    .info-box mat-icon {
      color: #388e3c;
    }

    .info-box p {
      margin: 8px 0 0 0;
      font-size: 14px;
      color: #666;
    }
  `],
})
export class ShareToUserDialog {
  private dialogRef = inject(MatDialogRef<ShareToUserDialog>);
  private vaultService = inject(VaultService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  data = inject<ShareToUserDialogData>(MAT_DIALOG_DATA);
  isLoading = signal(false);
  selectedUser = signal<VaultUserDto | null>(null);

  vaultUsers = rxResource({
    stream: () => this.vaultService.vaultUsersVaultEnabledGet()
  });

  // Filtra gli utenti che hanno già accesso tramite gruppo
  availableUsers = computed(() => {
    const allUsers = this.vaultUsers.value() || [];
    const envelopes = this.data.secret.deviceEnvelopes || [];
    
    // Trova i device IDs che hanno accesso via gruppo
    const groupDeviceIds = new Set(
      envelopes
        .filter((e: any) => e.groupId)
        .map((e: any) => e.deviceId)
    );
    
    if (groupDeviceIds.size === 0) return allUsers;
    
    // Trova gli user IDs che hanno questi device
    const userIdsWithGroupAccess = new Set<number>();
    for (const user of allUsers) {
      for (const device of user.devices || []) {
        if (groupDeviceIds.has(device.deviceId)) {
          userIdsWithGroupAccess.add(user.userId!);
          break;
        }
      }
    }
    
    // Filtra gli utenti
    return allUsers.filter(u => !userIdsWithGroupAccess.has(u.userId!));
  });

  form: FormGroup = this.fb.group({
    targetUserId: [null, [Validators.required]],
  });

  constructor() {
    this.form.get('targetUserId')?.valueChanges.subscribe(userId => {
      const user = this.vaultUsers.value()?.find(u => u.userId === userId) || null;
      this.selectedUser.set(user);
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  async onShare() {
    if (this.form.invalid) return;

    const user = this.selectedUser();
    if (!user?.devices?.length) {
      this.snackBar.open('L\'utente non ha dispositivi registrati', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
      return;
    }

    this.isLoading.set(true);
    try {
      // 1. Decifra la secret key del secret corrente
      const envelopes = this.data.secret.deviceEnvelopes || [];
      let secretKey: CryptoKey | null = null;

      for (const envelope of envelopes) {
        try {
          secretKey = await unwrapSecretKeyWithDevicePrivateKey(
            envelope.wrappedSecretKeyBase64,
            this.data.privateKey
          );
          break;
        } catch {
          // Prova prossimo envelope
        }
      }

      if (!secretKey) {
        throw new Error('Impossibile decifrare la password. Nessun envelope compatibile trovato.');
      }

      // 2. Crea envelope per ogni dispositivo dell'utente destinatario
      const deviceEnvelopes = [];
      for (const device of user.devices!) {
        if (!device.publicKeySpkiBase64) continue;
        
        const wrappedKey = await wrapSecretKeyForDevice(secretKey, device.publicKeySpkiBase64);
        deviceEnvelopes.push({
          deviceId: device.deviceId!,
          wrappedSecretKeyBase64: wrappedKey,
          permission: SecretPermission.Read
        });
      }

      if (deviceEnvelopes.length === 0) {
        throw new Error('Nessun dispositivo dell\'utente ha una chiave pubblica valida');
      }

      // 3. Invia al backend
      await firstValueFrom(this.vaultService.vaultSecretsSecretIdShareUserPost({
        secretId: this.data.secret.secretId,
        shareSecretToUserRequest: {
          secretId: this.data.secret.secretId,
          targetUserId: user.userId,
          deviceEnvelopes
        }
      }));

      this.snackBar.open(`Password condivisa con ${user.fullName || user.email}!`, 'Chiudi', {
        duration: 5000,
        panelClass: 'success-snack'
      });
      this.dialogRef.close(true);

    } catch (error: any) {
      console.error('Errore condivisione:', error);
      this.snackBar.open('Errore: ' + error.message, 'Chiudi', {
        duration: 5000,
        panelClass: 'error-snack'
      });
    } finally {
      this.isLoading.set(false);
    }
  }
}
