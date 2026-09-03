import { Component, inject, signal, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { rxResource } from '@angular/core/rxjs-interop';
import { VaultService, SecretPermission } from '../../../api/index';
import { firstValueFrom } from 'rxjs';

export interface ManageSharesDialogData {
  secret: any;
  ownerDeviceIds: number[]; // Device IDs of the owner
}

interface SharedUser {
  userId: number;
  email: string;
  fullName: string;
  permission: string;
  deviceCount: number;
}

interface SharedGroup {
  groupId: number;
  name: string;
  memberCount: number;
}

@Component({
  selector: 'lib-manage-shares-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
  ],
  template: `
    <h2 mat-dialog-title>Gestisci Condivisioni</h2>
    <mat-dialog-content class="dialog-content">
      <div class="secret-info">
        <strong>{{ data.secret.title }}</strong>
        @if (data.secret.username) {
          <span class="username">{{ data.secret.username }}</span>
        }
      </div>

      <!-- Utenti condivisi -->
      <div class="shares-section">
        <h3>
          <mat-icon>person</mat-icon>
          Condiviso con Utenti
        </h3>
        
        @if (isLoading()) {
          <div class="loading">
            <mat-spinner diameter="24"></mat-spinner>
            <span>Caricamento...</span>
          </div>
        } @else if (sharedUsers().length === 0) {
          <p class="empty-message">Non condiviso con nessun utente</p>
        } @else {
          <div class="shares-list">
            @for (user of sharedUsers(); track user.userId) {
              <div class="share-item">
                <div class="share-info">
                  <div class="share-name">
                    <strong>{{ user.fullName || user.email }}</strong>
                    <mat-chip-set>
                      <mat-chip [highlighted]="user.permission === 'ReadWrite'">
                        {{ user.permission === 'ReadWrite' ? 'Lettura/Scrittura' : 'Solo Lettura' }}
                      </mat-chip>
                    </mat-chip-set>
                  </div>
                  <span class="share-detail">{{ user.email }} ({{ user.deviceCount }} dispositivi)</span>
                </div>
                <button mat-icon-button color="warn" (click)="removeUserShare(user)" 
                        [disabled]="removingUserId() === user.userId"
                        title="Rimuovi condivisione">
                  @if (removingUserId() === user.userId) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <mat-icon>person_remove</mat-icon>
                  }
                </button>
              </div>
            }
          </div>
        }
      </div>

      <!-- Gruppi condivisi -->
      <div class="shares-section">
        <h3>
          <mat-icon>group</mat-icon>
          Condiviso con Gruppi
        </h3>
        
        @if (isLoading()) {
          <div class="loading">
            <mat-spinner diameter="24"></mat-spinner>
            <span>Caricamento...</span>
          </div>
        } @else if (sharedGroups().length === 0) {
          <p class="empty-message">Non condiviso con nessun gruppo</p>
        } @else {
          <div class="shares-list">
            @for (group of sharedGroups(); track group.groupId) {
              <div class="share-item">
                <div class="share-info">
                  <div class="share-name">
                    <strong>{{ group.name }}</strong>
                  </div>
                  <span class="share-detail">{{ group.memberCount }} membri</span>
                </div>
                <button mat-icon-button color="warn" (click)="removeGroupShare(group)"
                        [disabled]="removingGroupId() === group.groupId"
                        title="Rimuovi condivisione">
                  @if (removingGroupId() === group.groupId) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <mat-icon>group_remove</mat-icon>
                  }
                </button>
              </div>
            }
          </div>
        }
      </div>

      <div class="info-box">
        <mat-icon>info</mat-icon>
        <p>Rimuovendo una condivisione, l'utente o i membri del gruppo non potranno più accedere a questa password.</p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onClose()">Chiudi</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      padding: 20px 24px;
      min-width: 500px;
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

    .shares-section {
      margin-bottom: 24px;
    }

    .shares-section h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px 0;
      color: #333;
      font-size: 16px;
    }

    .shares-section h3 mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .loading {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      color: #666;
    }

    .empty-message {
      color: #666;
      font-style: italic;
      padding: 8px 0;
      margin: 0;
    }

    .shares-list {
      display: flex;
      flex-direction: column;
    }

    .share-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .share-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .share-name {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .share-detail {
      font-size: 12px;
      color: #666;
    }

    mat-chip-set {
      display: inline-flex;
    }

    .info-box {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #fff3e0;
      border: 1px solid #ffb74d;
      border-radius: 8px;
      margin-top: 16px;
    }

    .info-box mat-icon {
      color: #f57c00;
    }

    .info-box p {
      margin: 0;
      font-size: 14px;
      color: #666;
    }
  `],
})
export class ManageSharesDialog {
  private dialogRef = inject(MatDialogRef<ManageSharesDialog>);
  private vaultService = inject(VaultService);
  private snackBar = inject(MatSnackBar);

  data = inject<ManageSharesDialogData>(MAT_DIALOG_DATA);
  
  isLoading = signal(true);
  removingUserId = signal<number | null>(null);
  removingGroupId = signal<number | null>(null);
  sharedUsers = signal<SharedUser[]>([]);
  sharedGroups = signal<SharedGroup[]>([]);

  vaultUsers = rxResource({
    stream: () => this.vaultService.vaultUsersVaultEnabledGet()
  });

  groups = rxResource({
    stream: () => this.vaultService.vaultGroupsGet()
  });

  constructor() {
    // Calcola le condivisioni quando i dati sono caricati
    this.computeShares();
  }

  private async computeShares() {
    // Attendi che i dati siano caricati
    await this.waitForData();
    
    const envelopes = this.data.secret.deviceEnvelopes || [];
    const ownerDeviceIds = new Set(this.data.ownerDeviceIds);
    const vaultUsers = this.vaultUsers.value() || [];
    const allGroups = this.groups.value() || [];

    // Trova gli envelope non-owner (condivisioni) senza groupId (condivisioni dirette a utente)
    const sharedEnvelopes = envelopes.filter(
      (e: any) => !ownerDeviceIds.has(e.deviceId) && e.permission !== SecretPermission.Owner && !e.groupId
    );

    // Mappa deviceId -> userId
    const deviceToUser = new Map<number, { userId: number; email: string; fullName: string }>();
    for (const user of vaultUsers) {
      for (const device of user.devices || []) {
        if (device.deviceId) {
          deviceToUser.set(device.deviceId, {
            userId: user.userId!,
            email: user.email || '',
            fullName: user.fullName || ''
          });
        }
      }
    }

    // Raggruppa per userId
    const userSharesMap = new Map<number, { user: any; permission: string; deviceCount: number }>();
    const sharedDeviceIds = new Set<number>();

    for (const envelope of sharedEnvelopes) {
      const userInfo = deviceToUser.get(envelope.deviceId);
      if (userInfo) {
        sharedDeviceIds.add(envelope.deviceId);
        if (userSharesMap.has(userInfo.userId)) {
          const existing = userSharesMap.get(userInfo.userId)!;
          existing.deviceCount++;
          // Usa il permesso più alto
          if (envelope.permission === 'ReadWrite') {
            existing.permission = 'ReadWrite';
          }
        } else {
          userSharesMap.set(userInfo.userId, {
            user: userInfo,
            permission: envelope.permission || 'Read',
            deviceCount: 1
          });
        }
      }
    }

    const sharedUsersList: SharedUser[] = [];
    for (const [userId, data] of userSharesMap) {
      sharedUsersList.push({
        userId,
        email: data.user.email,
        fullName: data.user.fullName,
        permission: data.permission,
        deviceCount: data.deviceCount
      });
    }

    // Identifica i gruppi condivisi direttamente dalle envelope con groupId
    const sharedGroupsList: SharedGroup[] = [];
    const groupIdsWithShares = new Set<number>();
    
    // Trova tutti i groupId unici dalle envelope
    for (const envelope of envelopes) {
      if (envelope.groupId && !ownerDeviceIds.has(envelope.deviceId)) {
        groupIdsWithShares.add(envelope.groupId);
      }
    }
    
    // Per ogni groupId trovato, aggiungi il gruppo alla lista
    for (const groupId of groupIdsWithShares) {
      const group = allGroups.find(g => g.groupId === groupId);
      if (group) {
        sharedGroupsList.push({
          groupId: group.groupId!,
          name: group.name || 'Gruppo senza nome',
          memberCount: group.members?.length || 0
        });
      }
    }

    this.sharedUsers.set(sharedUsersList);
    this.sharedGroups.set(sharedGroupsList);
    this.isLoading.set(false);
  }

  private async waitForData(): Promise<void> {
    // Attende che entrambe le risorse siano caricate
    return new Promise((resolve) => {
      const checkLoaded = () => {
        if (!this.vaultUsers.isLoading() && !this.groups.isLoading()) {
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
    });
  }

  async removeUserShare(user: SharedUser) {
    this.removingUserId.set(user.userId);
    try {
      await firstValueFrom(this.vaultService.vaultSecretsSecretIdShareUserUserIdDelete({
        secretId: this.data.secret.secretId,
        userId: user.userId
      }));

      // Rimuovi l'utente dalla lista
      this.sharedUsers.update(users => users.filter(u => u.userId !== user.userId));
      
      this.snackBar.open(`Condivisione con ${user.fullName || user.email} rimossa`, 'Chiudi', {
        duration: 3000
      });
    } catch (error: any) {
      console.error('Errore rimozione condivisione:', error);
      this.snackBar.open('Errore: ' + (error.message || 'Impossibile rimuovere la condivisione'), 'Chiudi', {
        duration: 5000
      });
    } finally {
      this.removingUserId.set(null);
    }
  }

  async removeGroupShare(group: SharedGroup) {
    this.removingGroupId.set(group.groupId);
    try {
      // Chiama l'API per rimuovere la condivisione del gruppo
      await firstValueFrom(this.vaultService.vaultSecretsSecretIdShareGroupGroupIdDelete({
        secretId: this.data.secret.secretId,
        groupId: group.groupId
      }));

      // Rimuovi il gruppo dalla lista
      this.sharedGroups.update(groups => groups.filter(g => g.groupId !== group.groupId));
      
      // Aggiorna anche la lista utenti
      await this.computeShares();
      
      this.snackBar.open(`Condivisione con gruppo "${group.name}" rimossa`, 'Chiudi', {
        duration: 3000
      });
    } catch (error: any) {
      console.error('Errore rimozione condivisione gruppo:', error);
      this.snackBar.open('Errore: ' + (error.message || 'Impossibile rimuovere la condivisione'), 'Chiudi', {
        duration: 5000
      });
    } finally {
      this.removingGroupId.set(null);
    }
  }

  onClose(): void {
    this.dialogRef.close(true); // true indica che potrebbero esserci state modifiche
  }
}
