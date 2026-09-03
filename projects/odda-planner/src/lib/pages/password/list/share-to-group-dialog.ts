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
import { VaultService, GroupDto, VaultUserDto, SecretPermission } from '../../../api/index';
import { firstValueFrom } from 'rxjs';
import { unwrapSecretKeyWithDevicePrivateKey, wrapSecretKeyForDevice } from './crypt.manager';

export interface ShareToGroupDialogData {
  secret: any;
  privateKey: CryptoKey;
  currentDeviceId: number;
}

interface MemberWithDevices {
  userId: number;
  displayName: string;
  email: string;
  devices: { deviceId: number; deviceName: string; publicKeySpkiBase64: string }[];
}

@Component({
  selector: 'lib-share-to-group-dialog',
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
    <h2 mat-dialog-title>Condividi Password con Gruppo</h2>
    <mat-dialog-content class="dialog-content">
      <div class="secret-info">
        <strong>{{ data.secret.title }}</strong>
        <span class="username">{{ data.secret.username }}</span>
      </div>

      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Seleziona Gruppo</mat-label>
          <mat-select formControlName="groupId">
            @if (groups.isLoading()) {
              <mat-option disabled>Caricamento...</mat-option>
            } @else if (groups.value()?.length === 0) {
              <mat-option disabled>Nessun gruppo disponibile</mat-option>
            } @else {
              @for (group of groups.value(); track group.groupId) {
                <mat-option [value]="group.groupId">
                  {{ group.name }} ({{ group.members?.length || 0 }} membri)
                </mat-option>
              }
            }
          </mat-select>
          @if (form.get('groupId')?.hasError('required')) {
            <mat-error>Seleziona un gruppo</mat-error>
          }
        </mat-form-field>
      </form>

      @if (selectedGroup()) {
        <div class="group-members">
          <h4>Membri del gruppo con dispositivi:</h4>
          @if (membersWithDevices().length === 0) {
            <p class="empty-message">Nessun membro con dispositivi vault registrati</p>
          } @else {
            <ul>
              @for (member of membersWithDevices(); track member.userId) {
                <li>
                  <strong>{{ member.displayName || member.email }}</strong>
                  <span class="device-count">({{ member.devices.length }} dispositivi)</span>
                </li>
              }
            </ul>
          }
          @if (membersWithoutDevices().length > 0) {
            <p class="warning-text">
              ⚠️ {{ membersWithoutDevices().length }} membri non hanno dispositivi registrati e non riceveranno la password.
            </p>
          }
        </div>
      }

      <div class="info-box info">
        <mat-icon>lock</mat-icon>
        <div>
          <strong>Crittografia End-to-End</strong>
          <p>
            La password verrà cifrata per ogni dispositivo di ogni membro del gruppo.
            Solo i dispositivi registrati potranno decifrarla.
          </p>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annulla</button>
      <button mat-raised-button color="primary" (click)="onShare()" 
              [disabled]="form.invalid || isLoading() || membersWithDevices().length === 0">
        @if (isLoading()) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          Condividi con Gruppo
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

    .group-members {
      background: #e3f2fd;
      padding: 16px;
      border-radius: 8px;
      margin-top: 16px;
    }

    .group-members h4 {
      margin: 0 0 8px 0;
    }

    .group-members ul {
      margin: 0;
      padding-left: 20px;
    }

    .device-count {
      color: #666;
      font-size: 12px;
      margin-left: 8px;
    }

    .warning-text {
      color: #f57c00;
      font-size: 12px;
      margin-top: 12px;
      margin-bottom: 0;
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
export class ShareToGroupDialog {
  private dialogRef = inject(MatDialogRef<ShareToGroupDialog>);
  private vaultService = inject(VaultService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  data = inject<ShareToGroupDialogData>(MAT_DIALOG_DATA);
  isLoading = signal(false);
  selectedGroup = signal<GroupDto | null>(null);

  groups = rxResource({
    stream: () => this.vaultService.vaultGroupsGet()
  });

  vaultUsers = rxResource({
    stream: () => this.vaultService.vaultUsersVaultEnabledGet()
  });

  // Calcola i membri che hanno dispositivi vault
  membersWithDevices = computed<MemberWithDevices[]>(() => {
    const group = this.selectedGroup();
    const users = this.vaultUsers.value();
    if (!group?.members || !users) return [];

    const result: MemberWithDevices[] = [];
    for (const member of group.members) {
      const vaultUser = users.find(u => u.userId === member.userId);
      if (vaultUser?.devices?.length) {
        result.push({
          userId: member.userId!,
          displayName: member.userDisplayName || '',
          email: member.userEmail || '',
          devices: vaultUser.devices.filter(d => d.publicKeySpkiBase64).map(d => ({
            deviceId: d.deviceId!,
            deviceName: d.deviceName || 'Dispositivo',
            publicKeySpkiBase64: d.publicKeySpkiBase64!
          }))
        });
      }
    }
    return result;
  });

  // Membri senza dispositivi
  membersWithoutDevices = computed(() => {
    const group = this.selectedGroup();
    const users = this.vaultUsers.value();
    if (!group?.members || !users) return [];

    return group.members.filter(member => {
      const vaultUser = users.find(u => u.userId === member.userId);
      return !vaultUser?.devices?.length;
    });
  });

  form: FormGroup = this.fb.group({
    groupId: [null, [Validators.required]],
  });

  constructor() {
    this.form.get('groupId')?.valueChanges.subscribe(groupId => {
      const group = this.groups.value()?.find(g => g.groupId === groupId) || null;
      this.selectedGroup.set(group);
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  async onShare() {
    if (this.form.invalid) return;

    const members = this.membersWithDevices();
    if (members.length === 0) {
      this.snackBar.open('Nessun membro del gruppo ha dispositivi registrati', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
      return;
    }

    this.isLoading.set(true);
    try {
      const groupId = this.form.value.groupId;

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

      // 2. Crea envelope per ogni dispositivo di ogni membro (con groupId per tracciare la condivisione al gruppo)
      const deviceEnvelopes = [];
      for (const member of members) {
        for (const device of member.devices) {
          const wrappedKey = await wrapSecretKeyForDevice(secretKey, device.publicKeySpkiBase64);
          deviceEnvelopes.push({
            deviceId: device.deviceId,
            wrappedSecretKeyBase64: wrappedKey,
            permission: SecretPermission.Read,
            groupId: groupId
          });
        }
      }

      if (deviceEnvelopes.length === 0) {
        throw new Error('Nessun dispositivo valido trovato nei membri del gruppo');
      }

      // 3. Invia al backend
      await firstValueFrom(this.vaultService.vaultSecretsSecretIdShareGroupPost({
        secretId: this.data.secret.secretId,
        shareSecretToGroupRequest: {
          secretId: this.data.secret.secretId,
          groupId: groupId,
          deviceEnvelopes
        }
      }));

      const totalDevices = deviceEnvelopes.length;
      this.snackBar.open(
        `Password condivisa con ${members.length} membri (${totalDevices} dispositivi)!`,
        'Chiudi',
        {
          duration: 5000,
          panelClass: 'success-snack'
        }
      );
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
