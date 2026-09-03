import { Component, computed, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { PublicDeviceDto, VaultService, FolderDto } from '../../../api/index'
import { rxResource } from '@angular/core/rxjs-interop';
import { generateAndStoreDeviceKeysLocally, getCurrentDevicePublicKey, createSecretPackage, decryptSecret, loadPrivateKeyFromLocalStorage, decryptSecretWithKey, generateRecoveryCode, exportDeviceBackup, importDeviceBackup, recoverDeviceWithRecoveryCode, isDirectAccessMode, recoverDeviceWithRecoveryBackup, importPrivateKeyFromBase64, wrapSecretKeyForDevice, unwrapSecretKeyWithDevicePrivateKey } from './crypt.manager';
import { isPlatformBrowser } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AddDeviceData, AddDeviceDialog } from './add-device-dialog';
import { AddPasswordDialog } from './add-password-dialog';
import { ViewPasswordDialog } from './view-password-dialog';
import { RecoveryKeyDialog } from './recovery-key-dialog';
import { firstValueFrom } from 'rxjs';
import { pickFileText } from './list-file.utils';
import { ClonePayload, decryptClonePayload, encryptClonePayload, encryptPrivateKeyForLocalStorage } from './list-clone-crypto';
import { SecretPermission } from '../../../api/index';
import { GroupsDialog } from './groups-dialog';
import { ShareToUserDialog, ShareToUserDialogData } from './share-to-user-dialog';
import { ShareToGroupDialog, ShareToGroupDialogData } from './share-to-group-dialog';
import { ManageSharesDialog, ManageSharesDialogData } from './manage-shares-dialog';
import { AuthenticationService } from '../../../services/authentication.service';
import { FolderDialog } from './folder-dialog';
import { MoveToFolderDialog } from './move-to-folder-dialog';

@Component({
  selector: 'lib-list',
  imports: [MatSnackBarModule],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List {

  private readonly authenticationService = inject(AuthenticationService);
  private readonly platform = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platform);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  currentDevicePublicKey = signal<string | null>(null);
  currentDeviceId = signal<number | null>(null);
  currentDevice = signal<PublicDeviceDto | null>(null);
  devicePrivateKey = signal<CryptoKey | null>(null);
  isSessionUnlocked = signal<boolean>(false);
  isDirectAccessModeActive = signal<boolean>(false);
  searchTerm = signal<string>('');
  showDevices = signal<boolean>(false);
  selectedFolderId = signal<number | null>(null);
  viewMode = signal<'list' | 'folders'>('folders');

  // Verifica se questo dispositivo è autorizzato
  hasLocalDeviceKeys = computed(() => !!this.currentDevicePublicKey());

  vaultService = inject(VaultService);
  devices = rxResource({
    stream: () => this.vaultService.vaultDevicesGet()
  });
  secrets = rxResource({
    stream: () => this.vaultService.vaultSecretsGet()
  });
  folders = rxResource({
    stream: () => this.vaultService.vaultFoldersGet()
  });

  // Filtra le password in base al termine di ricerca e alla cartella selezionata
  filteredSecrets = computed(() => {
    const secrets = this.secrets.value();
    const term = this.searchTerm().toLowerCase().trim();
    const folderId = this.selectedFolderId();

    if (!secrets) return [];

    let filtered = secrets;

    // Filtra per cartella (se selezionata)
    if (folderId !== null) {
      filtered = filtered.filter((secret: any) => secret.folderId === folderId);
    } else if (this.viewMode() === 'folders' && !term) {
      // In modalità cartelle, mostra solo le password senza cartella quando nessuna cartella è selezionata
      filtered = filtered.filter((secret: any) => !secret.folderId);
    }

    // Filtra per termine di ricerca
    if (term) {
      filtered = filtered.filter((secret: any) =>
        (secret.title?.toLowerCase().includes(term) ?? false) ||
        (secret.username?.toLowerCase().includes(term) ?? false) ||
        (secret.url?.toLowerCase().includes(term) ?? false) ||
        (secret.notes?.toLowerCase().includes(term) ?? false)
      );
    }

    return filtered;
  });

  // Nome della cartella selezionata
  selectedFolderName = computed(() => {
    const folderId = this.selectedFolderId();
    if (folderId === null) return null;
    const folders = this.folders.value();
    if (!folders) return null;
    return folders.find(f => f.folderId === folderId)?.name || null;
  });


  constructor() {
    if (this.isBrowser) {
      this.currentDevicePublicKey.set(getCurrentDevicePublicKey());
      this.currentDeviceId.set(this.readStoredCurrentDeviceId());

      // Controlla se è in modalità accesso diretto
      this.isDirectAccessModeActive.set(isDirectAccessMode());

      // Se è in modalità accesso diretto, sblocca automaticamente all'avvio
      if (this.isDirectAccessModeActive()) {
        this.unlockSession();
      }
    }

    effect(() => {
      const currentPublicKey = this.currentDevicePublicKey();
      const currentDeviceId = this.currentDeviceId();
      const devices = this.devices.value();
      if (currentPublicKey && devices) {
        const deviceRegistered = devices.some(d => d.publicKeySpkiBase64 === currentPublicKey);
        if (deviceRegistered) {
          const currentDevice = devices.find(d => d.deviceId === currentDeviceId)
            || devices.find(d => d.publicKeySpkiBase64 === currentPublicKey)
            || null;
          this.currentDevice.set(currentDevice);
        }
      }

      // 🔑 NUOVO: Guida automatica al recupero quando l'utente accede da nuovo dispositivo
      if (!currentPublicKey && devices && devices.length > 0 && this.isBrowser) {
        // L'utente non ha chiavi locali ma ci sono dispositivi registrati sul backend
        setTimeout(() => this.offerDeviceRecovery(devices), 1000);
      }
    })
  }

  private readStoredCurrentDeviceId(): number | null {
    const raw = localStorage.getItem('vault_current_device_id');
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /** Verifica se l'utente corrente ha permessi di modifica/eliminazione sul secret */
  canEditSecret(secret: any): boolean {

    if (secret.ownerUserId === this.authenticationService.me()?.id)
      return true;

    const currentDeviceId = this.currentDeviceId();
    if (!currentDeviceId) return false;

    const envelopes = secret?.deviceEnvelopes || [];
    const myEnvelope = envelopes.find((e: any) => e.deviceId === currentDeviceId);

    // Permetti modifica/eliminazione solo se il permesso è ReadWrite o Owner
    return myEnvelope?.permission === SecretPermission.ReadWrite ||
      myEnvelope?.permission === SecretPermission.Owner;
  }

  private setCurrentDeviceIdentity(deviceId: number | null, publicKey: string | null) {
    this.currentDeviceId.set(deviceId);
    this.currentDevicePublicKey.set(publicKey);

    if (deviceId !== null) {
      localStorage.setItem('vault_current_device_id', String(deviceId));
    } else {
      localStorage.removeItem('vault_current_device_id');
    }
  }

  private saveRecoveryBackupLocally(recoveryBackupBase64?: string | null) {
    if (!recoveryBackupBase64) return;
    try {
      localStorage.setItem('vault_device_recovery_backup', atob(recoveryBackupBase64));
    } catch {
      // Ignora backup non valido
    }
  }

  private async registerClonedDevice(deviceName: string, clonePayload: ClonePayload): Promise<number> {
    const response = await firstValueFrom(this.vaultService.vaultDevicesPost({
      registerDeviceRequest: {
        deviceName,
        publicKeySpkiBase64: clonePayload.publicKeySpkiBase64,
        recoveryBackupBase64: clonePayload.recoveryBackupBase64 || undefined,
      }
    }));

    if (!response.deviceId) {
      throw new Error('Impossibile creare il nuovo dispositivo: il server non ha restituito un ID');
    }

    return response.deviceId;
  }

  private async persistClonedKeys(clonePayload: ClonePayload, directAccessMode: boolean, password: string | null) {
    localStorage.setItem('vault_device_public_key', clonePayload.publicKeySpkiBase64);
    this.saveRecoveryBackupLocally(clonePayload.recoveryBackupBase64);

    if (directAccessMode) {
      localStorage.setItem('vault_device_private_key', JSON.stringify(clonePayload.privateKeyData));
      localStorage.setItem('vault_direct_access_mode', 'true');
      return;
    }

    const privateKeyData = clonePayload.privateKeyData;
    const pkcs8Base64 = privateKeyData.pkcs8Base64;
    const saved = await encryptPrivateKeyForLocalStorage(pkcs8Base64, password!);

    localStorage.setItem('vault_device_private_key', JSON.stringify(saved));
    localStorage.removeItem('vault_direct_access_mode');
  }

  authorizeThisDevice() {
    // Usa la migrazione: crea nuove chiavi e ricifra le password
    this.migrateSecretsFromOldDevice();
  }

  private offerDeviceRecovery(devices: PublicDeviceDto[]) {
    // Verifica se l'utente ha già visto questo messaggio in questa sessione
    const hasSeenRecoveryOffer = sessionStorage.getItem('vault_recovery_offer_shown');
    if (hasSeenRecoveryOffer) return;

    sessionStorage.setItem('vault_recovery_offer_shown', 'true');

    const snackBarRef = this.snackBar.open(
      `🔐 Benvenuto! Hai ${devices.length} dispositivo${devices.length > 1 ? 'i' : ''} registrato${devices.length > 1 ? 'i' : ''}. Vuoi recuperare l'accesso?`,
      'Recupera',
      {
        duration: 0, // Non scade automaticamente
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: 'success-snack'
      }
    );

    snackBarRef.onAction().subscribe(() => {
      // 🚀 Usa recupero rapido con solo Recovery Code
      this.quickRecoverWithRecoveryCode();
    });
  }

  /**
   * 🚀 Recupero RAPIDO: inserisci solo il Recovery Code,
   * il sistema cerca automaticamente il dispositivo corrispondente
   * 
   * NOTA: Il Recovery Code viene usato per cifrare il backup sul server.
   * È più sicuro della password perché non viene mai salvato nel sistema.
   * Salvalo in un password manager o scrivilo su carta e conservalo al sicuro.
   */
  async quickRecoverWithRecoveryCode() {
    const recoveryCode = prompt(
      '🔓 Recupero Rapido\n\n' +
      '📝 Inserisci il Recovery Code che hai salvato quando hai creato il dispositivo.\n\n' +
      'Il sistema cercherà automaticamente il dispositivo corrispondente.\n\n' +
      'Formato: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX\n\n' +
      '💡 SUGGERIMENTO: Salva il Recovery Code nel tuo password manager,\n' +
      'così non devi ricordarlo!'
    );

    if (!recoveryCode) return;

    const devices = this.devices.value();
    if (!devices || devices.length === 0) {
      this.snackBar.open('Nessun dispositivo trovato sul server', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
      return;
    }

    // Filtra solo dispositivi con recovery backup disponibile
    const devicesWithRecovery = devices.filter(d => d.recoveryBackupBase64);

    if (devicesWithRecovery.length === 0) {
      this.snackBar.open(
        '❌ Nessun dispositivo ha il Recovery Backup sul server. Contatta l\'amministratore.',
        'Chiudi',
        {
          duration: 5000,
          panelClass: 'error-snack'
        }
      );
      return;
    }

    this.snackBar.open(
      `🔍 Cerco il dispositivo corrispondente tra ${devicesWithRecovery.length} disponibili...`,
      '',
      {
        duration: 2000,
        panelClass: 'success-snack'
      }
    );

    // Prova a decifrare con ogni dispositivo finché non trova quello giusto
    let recovered = false;
    for (const device of devicesWithRecovery) {
      try {
        // Chiedi modalità di accesso
        const snackBarRef = this.snackBar.open(
          '🔐 Vuoi utilizzare ACCESSO DIRETTO (senza password locale)?',
          'Accesso Diretto',
          {
            duration: 0,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: 'success-snack'
          }
        );

        const useDirectAccessMode = await new Promise<boolean>((resolve) => {
          snackBarRef.onAction().subscribe(() => {
            snackBarRef.dismiss();
            resolve(true);
          });

          snackBarRef.afterDismissed().subscribe((info) => {
            if (!info.dismissedByAction) {
              resolve(false);
            }
          });

          // Timeout dopo 10 secondi
          setTimeout(() => {
            snackBarRef.dismiss();
          }, 10000);
        });

        let password: string | null = null;
        if (!useDirectAccessMode) {
          password = prompt(
            'Inserisci una password per proteggere le chiavi localmente:\n\n' +
            '(Questa password verrà richiesta ad ogni accesso)'
          );

          if (password === null) return;
        }

        await recoverDeviceWithRecoveryBackup(
          device.publicKeySpkiBase64!,
          device.recoveryBackupBase64!,
          recoveryCode,
          password,
          useDirectAccessMode
        );

        // Se arriviamo qui, il recupero è andato a buon fine
        this.snackBar.open(
          `✅ Dispositivo "${device.deviceName}" recuperato! Modalità: ${useDirectAccessMode ? 'Accesso Diretto' : 'Sicura'}`,
          'Chiudi',
          {
            duration: 5000,
            panelClass: 'success-snack'
          }
        );

        // Aggiorna lo stato
        this.isDirectAccessModeActive.set(isDirectAccessMode());
        this.currentDevicePublicKey.set(getCurrentDevicePublicKey());

        // Ricarica i dati
        this.devices.reload();
        this.secrets.reload();

        recovered = true;
        break;
      } catch (error: any) {
        // Recovery Code non corrisponde a questo dispositivo, prova il prossimo
        console.log(`Recovery Code non valido per dispositivo ${device.deviceName}, provo il prossimo...`);
        continue;
      }
    }

    if (!recovered) {
      this.snackBar.open(
        '❌ Recovery Code non valido per nessun dispositivo disponibile. Verifica di averlo copiato correttamente.',
        'Chiudi',
        {
          duration: 7000,
          panelClass: 'error-snack'
        }
      );
    }
  }

  hasRecoveryBackup(): boolean {
    return !!localStorage.getItem('vault_device_recovery_backup');
  }

  createNew() {
    const dialogRef = this.dialog.open(AddDeviceDialog, {
      width: '1036px',
      disableClose: false,
      panelClass: 'overflow-hidden',
      maxWidth: '100%'
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        const { deviceName, password, directAccessMode } = result;

        // Salva le chiavi del dispositivo corrente (se esiste) prima di sovrascrriverle
        const oldPublicKey = localStorage.getItem('vault_device_public_key');
        const oldPrivateKey = localStorage.getItem('vault_device_private_key');
        const hadExistingDevice = !!oldPublicKey;

        // Genera recovery code
        const recoveryCode = generateRecoveryCode();

        try {
          const keys = await generateAndStoreDeviceKeysLocally(password, recoveryCode, directAccessMode);

          // Registra il nuovo dispositivo sul backend
          const deviceResponse = await firstValueFrom(this.vaultService.vaultDevicesPost({
            registerDeviceRequest: {
              deviceName: deviceName,
              publicKeySpkiBase64: keys.publicKeySpkiBase64,
              recoveryBackupBase64: keys.recoveryBackupBase64
            }
          }));

          // Mostra il dialog con la recovery key
          const recoveryDialog = this.dialog.open(RecoveryKeyDialog, {
            disableClose: true,
            panelClass: 'overflow-hidden',
            maxWidth: '100%',
            data: {
              deviceName,
              recoveryCode
            }
          });

          recoveryDialog.afterClosed().subscribe(async (confirmed) => {
            if (!confirmed) return;

            const existingSecrets = this.secrets.value();
            if (hadExistingDevice && existingSecrets && existingSecrets.length > 0) {
              const snackBarRef = this.snackBar.open(
                `✅ Dispositivo "${deviceName}" registrato! Ci sono ${existingSecrets.length} password già salvate. Vuoi condividerle con questo dispositivo?`,
                'Condividi',
                {
                  duration: 10000,
                  horizontalPosition: 'center',
                  verticalPosition: 'bottom',
                  panelClass: 'success-snack'
                }
              );

              snackBarRef.onAction().subscribe(async () => {
                localStorage.setItem('vault_device_public_key', oldPublicKey!);
                localStorage.setItem('vault_device_private_key', oldPrivateKey!);
                this.currentDevicePublicKey.set(oldPublicKey);

                this.devices.reload();
                await new Promise(resolve => setTimeout(resolve, 1000));

                const allDevices = (this.devices.value() || []).map(d => ({
                  deviceId: d.deviceId!,
                  publicKeySpkiBase64: d.publicKeySpkiBase64!
                }));

                if (!allDevices.some(d => d.deviceId === deviceResponse.deviceId)) {
                  allDevices.push({
                    deviceId: deviceResponse.deviceId!,
                    publicKeySpkiBase64: keys.publicKeySpkiBase64
                  });
                }

                await this.sharePasswordsWithNewDevice(allDevices);
                await generateAndStoreDeviceKeysLocally(password, recoveryCode, directAccessMode);
                this.currentDevicePublicKey.set(keys.publicKeySpkiBase64);
              });
            }

            this.currentDevicePublicKey.set(keys.publicKeySpkiBase64);
            this.setCurrentDeviceIdentity(deviceResponse.deviceId ?? null, keys.publicKeySpkiBase64);
            this.devices.reload();
            this.secrets.reload();
            this.isDirectAccessModeActive.set(directAccessMode);

            if (directAccessMode) {
              await this.unlockSession();
            }
          });

        } catch (error) {
          console.error("Error creating device:", error);
          this.snackBar.open('❌ Errore durante la creazione del dispositivo: ' + (error as any).message, 'Chiudi', {
            duration: 5000,
            panelClass: 'error-snack'
          });

          // Ripristina le vecchie chiavi in caso di errore
          if (hadExistingDevice && oldPublicKey && oldPrivateKey) {
            localStorage.setItem('vault_device_public_key', oldPublicKey);
            localStorage.setItem('vault_device_private_key', oldPrivateKey);
            this.currentDevicePublicKey.set(oldPublicKey);
          }
        }
      }
      //this.setCurrentDeviceIdentity(deviceResponse.deviceId ?? null, keys.publicKeySpkiBase64);
    });
  }

  async sharePasswordsWithNewDevice(targetDevices: { deviceId: number, publicKeySpkiBase64: string }[]) {
    try {
      // Chiedi di sbloccare un dispositivo esistente
      const unlocked = await this.unlockSession();
      if (!unlocked) {
        this.snackBar.open('⚠️ Operazione annullata. Le password non sono state condivise con il nuovo dispositivo.', 'Chiudi', {
          duration: 5000,
          panelClass: 'error-snack'
        });
        return;
      }

      const currentDeviceId = this.currentDevice()?.deviceId;
      if (!currentDeviceId) {
        this.snackBar.open('❌ Dispositivo corrente non trovato', 'Chiudi', {
          duration: 3000,
          panelClass: 'error-snack'
        });
        return;
      }

      const privateKey = this.devicePrivateKey();
      if (!privateKey) {
        this.snackBar.open('❌ Chiave privata non disponibile', 'Chiudi', {
          duration: 3000,
          panelClass: 'error-snack'
        });
        return;
      }

      const secrets = this.secrets.value();
      if (!secrets || secrets.length === 0) return;

      this.snackBar.open(`🔄 Condivisione in corso... ${secrets.length} password con ${targetDevices.length} dispositivi`, 'OK', {
        duration: 3000,
        panelClass: 'success-snack'
      });

      let successCount = 0;
      let errorCount = 0;

      for (const secret of secrets) {
        try {
          // Decifra la password con il dispositivo corrente
          const plainPassword = await decryptSecretWithKey(secret, privateKey, currentDeviceId);

          // Ri-crea il secret package includendo TUTTI i dispositivi target
          const secretPackage = await createSecretPackage({
            ownerUserId: secret.ownerUserId,
            title: secret.title,
            username: secret.username,
            plainPassword: plainPassword,
            ownerDevices: targetDevices,
          });

          // Aggiorna il secret sul backend
          await firstValueFrom(this.vaultService.vaultSecretsSecretIdPut({
            secretId: secret.secretId,
            updateSecretRequest: {
              title: secretPackage.title,
              username: secretPackage.username,
              ciphertextBase64: secretPackage.ciphertextBase64,
              nonceBase64: secretPackage.nonceBase64,
              tagBase64: secretPackage.tagBase64,
              aad: secretPackage.aad,
              ownerDeviceEnvelopes: secretPackage.ownerDeviceEnvelopes,
              recoveryEnvelopes: secretPackage.recoveryEnvelopes,
            }
          }));

          successCount++;
        } catch (error) {
          console.error(`Error sharing secret ${secret.secretId}:`, error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        this.snackBar.open(`✅ Condivisione completata! ${successCount} password accessibili`, 'Chiudi', {
          duration: 5000,
          panelClass: 'success-snack'
        });
      } else {
        this.snackBar.open(`⚠️ Condivise: ${successCount}, Errori: ${errorCount}`, 'Chiudi', {
          duration: 5000,
          panelClass: 'error-snack'
        });
      }

      this.secrets.reload();
    } catch (error: any) {
      console.error('Error sharing passwords with new device:', error);
      this.snackBar.open('❌ Errore durante la condivisione delle password: ' + error.message, 'Chiudi', {
        duration: 5000,
        panelClass: 'error-snack'
      });
    }
  }


  addPassword() {
    const dialogRef = this.dialog.open(AddPasswordDialog, {
      panelClass: 'overflow-hidden',
      disableClose: false,
      data: {
        folders: this.folders.value() || [],
        folderId: this.selectedFolderId()
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        const { title, username, password, notes, folderId } = result;

        // Recupera il recovery code se presente
        const recoveryCode = localStorage.getItem('vault_recovery_code') || undefined;

        const secretPackage = await createSecretPackage({
          ownerUserId: '',
          title,
          username,
          plainPassword: password,
          ownerDevices: this.devices.value()?.map(d => ({ deviceId: d.deviceId!, publicKeySpkiBase64: d.publicKeySpkiBase64! })) || [],
          recoveryCode, // Passa il recovery code per creare il recovery envelope
        }).then(secretPackage => {
          this.vaultService.vaultSecretsPost({
            createSecretRequest: {
              title: secretPackage.title,
              username: secretPackage.username,
              ciphertextBase64: secretPackage.ciphertextBase64,
              nonceBase64: secretPackage.nonceBase64,
              tagBase64: secretPackage.tagBase64,
              aad: secretPackage.aad,
              note: notes,
              folderId: folderId || null,
              ownerDeviceEnvelopes: secretPackage.ownerDeviceEnvelopes?.map(ode => ({
                wrappedSecretKeyBase64: ode.wrappedSecretKeyBase64!,
                permissions: ode.permission!,
                deviceId: ode.deviceId!,
              })) || [],
              recoveryEnvelopes: secretPackage.recoveryEnvelopes?.map(re => ({
                methodType: re.methodType! as any,
                saltBase64: re.saltBase64! as any,
                iterations: re.iterations! as any,
                ciphertextBase64: re.ciphertextBase64! as any,
                nonceBase64: re.nonceBase64! as any,
                tagBase64: re.tagBase64! as any,
                metadata: re.metadata!,
              })) || []
            }
          }).subscribe(() => {
            if(this.selectedFolderId())
              this.folders.reload();
            this.secrets.reload();
          })
          console.log('Created secret package:', secretPackage);
          // Qui chiamerai il servizio per salvare il secretPackage sul server
        }).catch(error => {
          console.error("Error creating secret package:", error);
        });
        // Qui andrà la logica per:
        // 1. Crittografare la password con la chiave del dispositivo
        // 2. Creare gli envelope per i dispositivi autorizzati
        // 3. Chiamare vaultSecretsPost
        // 4. Ricaricare la lista secrets
      }
    });
  }

  async unlockSession() {
    if (this.isSessionUnlocked()) return true;

    // Se è in modalità accesso diretto, carica automaticamente la chiave senza chiedere password
    if (isDirectAccessMode()) {
      try {
        const privateKey = await loadPrivateKeyFromLocalStorage(); // Nessuna password richiesta
        this.devicePrivateKey.set(privateKey);
        this.isSessionUnlocked.set(true);
        // In modalità accesso diretto non serve auto-lock (la chiave è sempre disponibile)
        return true;
      } catch (error: any) {
        this.snackBar.open('Errore nel caricamento della chiave: ' + error.message, 'Chiudi', {
          duration: 5000,
          panelClass: 'error-snack'
        });
        return false;
      }
    }

    // Modalità sicura: chiedi password
    const devicePassword = prompt('Inserisci la password del dispositivo per sbloccare la sessione:');
    if (!devicePassword) return false;

    try {
      const privateKey = await loadPrivateKeyFromLocalStorage(devicePassword);
      this.devicePrivateKey.set(privateKey);
      this.isSessionUnlocked.set(true);

      // Auto-lock dopo 30 minuti di inattività
      this.resetAutoLockTimer();

      return true;
    } catch (error: any) {
      this.snackBar.open('Password errata o chiave non trovata', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
      return false;
    }
  }

  private autoLockTimer: any;
  private resetAutoLockTimer() {
    if (this.autoLockTimer) clearTimeout(this.autoLockTimer);

    // Auto-lock dopo 30 minuti
    this.autoLockTimer = setTimeout(() => {
      this.lockSession();
    }, 30 * 60 * 1000);
  }

  lockSession() {
    this.devicePrivateKey.set(null);
    this.isSessionUnlocked.set(false);
    if (this.autoLockTimer) clearTimeout(this.autoLockTimer);
  }

  async viewPassword(secret: any) {
    const unlocked = await this.unlockSession();
    if (!unlocked) return;

    const currentDeviceId = this.currentDevice()?.deviceId;
    if (!currentDeviceId) {
      this.snackBar.open('Dispositivo corrente non trovato', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
      return;
    }

    const privateKey = this.devicePrivateKey();
    if (!privateKey) return;

    // Reset auto-lock timer ad ogni azione
    this.resetAutoLockTimer();

    const dialogRef = this.dialog.open(ViewPasswordDialog, {
      panelClass: 'overflow-hidden',
      data: {
        secret,
        mode: 'view',
        canEdit: this.canEditSecret(secret),
        onDecrypt: async (s: any) => {
          return await decryptSecretWithKey(s, privateKey, currentDeviceId);
        }
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'save') {
        this.updatePassword(secret, result.data);
      }
    });
  }

  async editPassword(secret: any) {
    const unlocked = await this.unlockSession();
    if (!unlocked) return;

    const currentDeviceId = this.currentDevice()?.deviceId;
    if (!currentDeviceId) {
      this.snackBar.open('Dispositivo corrente non trovato', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
      return;
    }

    const privateKey = this.devicePrivateKey();
    if (!privateKey) return;

    // Reset auto-lock timer ad ogni azione
    this.resetAutoLockTimer();

    const dialogRef = this.dialog.open(ViewPasswordDialog, {
      panelClass: 'overflow-hidden',
      data: {
        secret,
        mode: 'edit',
        canEdit: true,
        onDecrypt: async (s: any) => {
          return await decryptSecretWithKey(s, privateKey, currentDeviceId);
        }
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'save') {
        this.updatePassword(secret, result.data);
      }
    });
  }

  async updatePassword(secret: any, updatedData: any) {
    try {
      // Identifica i dispositivi condivisi (non owner) prima dell'aggiornamento
      const existingEnvelopes = secret.deviceEnvelopes || [];
      const ownerDeviceIds = new Set(
        this.devices.value()?.map(d => d.deviceId) || []
      );
      const sharedEnvelopes = existingEnvelopes.filter(
        (e: any) => !ownerDeviceIds.has(e.deviceId) && e.permission !== SecretPermission.Owner
      );

      // Ri-crittografa la password modificata
      const secretPackage = await createSecretPackage({
        ownerUserId: secret.ownerUserId,
        title: updatedData.title,
        username: updatedData.username,
        plainPassword: updatedData.password,
        ownerDevices: this.devices.value()?.map(d => ({
          deviceId: d.deviceId!,
          publicKeySpkiBase64: d.publicKeySpkiBase64!
        })) || [],
      });

      // Chiamata PUT per aggiornare il secret (solo owner envelopes)
      await firstValueFrom(this.vaultService.vaultSecretsSecretIdPut({
        secretId: secret.secretId,
        updateSecretRequest: {
          title: secretPackage.title,
          username: secretPackage.username,
          ciphertextBase64: secretPackage.ciphertextBase64,
          nonceBase64: secretPackage.nonceBase64,
          tagBase64: secretPackage.tagBase64,
          aad: secretPackage.aad,
          ownerDeviceEnvelopes: secretPackage.ownerDeviceEnvelopes,
          recoveryEnvelopes: secretPackage.recoveryEnvelopes,
          note: updatedData.notes
        }
      }));

      // Se c'erano condivisioni, ricrea gli envelope per i dispositivi condivisi
      if (sharedEnvelopes.length > 0) {
        await this.reshareSecretToDevices(secret.secretId, sharedEnvelopes, secretPackage.secretKey);
      }

      this.snackBar.open('Password aggiornata con successo!', 'Chiudi', {
        duration: 3000,
        panelClass: 'success-snack'
      });
      this.secrets.reload();
    } catch (error) {
      console.error('Error updating password:', error);
      this.snackBar.open('Errore durante l\'aggiornamento della password', 'Chiudi', {
        duration: 5000,
        panelClass: 'error-snack'
      });
    }
  }

  /**
   * Ricrea gli envelope per i dispositivi condivisi dopo un aggiornamento del secret.
   * Mantiene i permessi originali e distingue tra condivisioni utente e gruppo.
   */
  private async reshareSecretToDevices(
    secretId: number,
    sharedEnvelopes: { deviceId: number; permission: string; groupId?: number | null }[],
    secretKey: CryptoKey
  ) {
    try {
      // Ottieni tutti gli utenti con vault abilitato e i loro dispositivi
      const vaultUsers = await firstValueFrom(this.vaultService.vaultUsersVaultEnabledGet());

      // Crea una mappa deviceId -> { userId, publicKey }
      const deviceMap = new Map<number, { userId: number; publicKeySpkiBase64: string }>();
      for (const user of vaultUsers || []) {
        for (const device of user.devices || []) {
          if (device.deviceId && device.publicKeySpkiBase64) {
            deviceMap.set(device.deviceId, {
              userId: user.userId!,
              publicKeySpkiBase64: device.publicKeySpkiBase64
            });
          }
        }
      }

      // Separa le condivisioni per gruppo da quelle per singolo utente
      const userEnvelopes = sharedEnvelopes.filter(e => !e.groupId);
      const groupEnvelopes = sharedEnvelopes.filter(e => e.groupId);

      // --- Gestione condivisioni per utente singolo ---
      // Raggruppa i dispositivi condivisi per userId
      const userDevicesMap = new Map<number, { deviceId: number; permission: string; publicKeySpkiBase64: string }[]>();

      for (const envelope of userEnvelopes) {
        const deviceInfo = deviceMap.get(envelope.deviceId);
        if (deviceInfo) {
          if (!userDevicesMap.has(deviceInfo.userId)) {
            userDevicesMap.set(deviceInfo.userId, []);
          }
          userDevicesMap.get(deviceInfo.userId)!.push({
            deviceId: envelope.deviceId,
            permission: envelope.permission,
            publicKeySpkiBase64: deviceInfo.publicKeySpkiBase64
          });
        }
      }

      // Per ogni utente, crea nuovi envelope e condividi
      for (const [userId, devices] of userDevicesMap) {
        const newEnvelopes = [];
        for (const device of devices) {
          const wrappedKey = await wrapSecretKeyForDevice(secretKey, device.publicKeySpkiBase64);
          newEnvelopes.push({
            deviceId: device.deviceId,
            wrappedSecretKeyBase64: wrappedKey,
            permission: device.permission as SecretPermission
          });
        }

        // Chiama l'API per condividere con l'utente
        await firstValueFrom(this.vaultService.vaultSecretsSecretIdShareUserPost({
          secretId,
          shareSecretToUserRequest: {
            secretId,
            targetUserId: userId,
            deviceEnvelopes: newEnvelopes
          }
        }));
      }

      // --- Gestione condivisioni per gruppo ---
      // Raggruppa le envelope per groupId
      const groupDevicesMap = new Map<number, { deviceId: number; permission: string }[]>();
      for (const envelope of groupEnvelopes) {
        const groupId = envelope.groupId!;
        if (!groupDevicesMap.has(groupId)) {
          groupDevicesMap.set(groupId, []);
        }
        groupDevicesMap.get(groupId)!.push({
          deviceId: envelope.deviceId,
          permission: envelope.permission
        });
      }

      // Per ogni gruppo, crea nuovi envelope e condividi
      for (const [groupId, devices] of groupDevicesMap) {
        const newEnvelopes = [];
        for (const device of devices) {
          const deviceInfo = deviceMap.get(device.deviceId);
          if (deviceInfo) {
            const wrappedKey = await wrapSecretKeyForDevice(secretKey, deviceInfo.publicKeySpkiBase64);
            newEnvelopes.push({
              deviceId: device.deviceId,
              wrappedSecretKeyBase64: wrappedKey,
              permission: device.permission as SecretPermission,
              groupId: groupId
            });
          }
        }

        if (newEnvelopes.length > 0) {
          // Chiama l'API per condividere con il gruppo
          await firstValueFrom(this.vaultService.vaultSecretsSecretIdShareGroupPost({
            secretId,
            shareSecretToGroupRequest: {
              secretId,
              groupId,
              deviceEnvelopes: newEnvelopes
            }
          }));
        }
      }

      console.log(`Ricondiviso secret ${secretId} con ${userDevicesMap.size} utenti e ${groupDevicesMap.size} gruppi`);
    } catch (error) {
      console.error('Errore durante la ricondivisione:', error);
      // Non blocchiamo l'operazione principale, ma avvisiamo l'utente
      this.snackBar.open(
        'Password aggiornata, ma alcune condivisioni potrebbero necessitare di essere rifatte manualmente',
        'Chiudi',
        { duration: 5000, panelClass: 'warning-snack' }
      );
    }
  }

  async deletePassword(secret: any) {
    const snackBarRef = this.snackBar.open(
      `Sei sicuro di voler eliminare "${secret.title || 'senza titolo'}"? Questa azione non può essere annullata.`,
      'Elimina',
      {
        duration: 8000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: 'error-snack'
      }
    );

    snackBarRef.onAction().subscribe(async () => {
      try {
        await firstValueFrom(this.vaultService.vaultSecretsSecretIdDelete({
          secretId: secret.secretId
        }));

        this.snackBar.open('Password eliminata con successo!', 'Chiudi', {
          duration: 3000,
          panelClass: 'success-snack'
        });
        this.secrets.reload();
      } catch (error) {
        console.error('Error deleting password:', error);
        this.snackBar.open('Errore durante l\'eliminazione della password', 'Chiudi', {
          duration: 5000,
          panelClass: 'error-snack'
        });
      }
    });
  }

  async deleteDevice(device: any) {
    if (device.publicKeySpkiBase64 === this.currentDevicePublicKey()) {
      this.snackBar.open('Non puoi eliminare il dispositivo corrente!', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
      return;
    }

    const snackBarRef = this.snackBar.open(
      `Sei sicuro di voler eliminare "${device.deviceName || 'senza nome'}"? Questa azione non può essere annullata.`,
      'Elimina',
      {
        duration: 8000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: 'error-snack'
      }
    );

    snackBarRef.onAction().subscribe(async () => {
      try {
        await firstValueFrom(this.vaultService.vaultDevicesDeviceIdDelete({
          deviceId: device.deviceId
        }));

        this.snackBar.open('Dispositivo eliminato con successo!', 'Chiudi', {
          duration: 3000,
          panelClass: 'success-snack'
        });
        this.devices.reload();
      } catch (error) {
        console.error('Error deleting device:', error);
        this.snackBar.open('Errore durante l\'eliminazione del dispositivo', 'Chiudi', {
          duration: 5000,
          panelClass: 'error-snack'
        });
      }
    });
  }

  async revokeDevice(device: any) {
    if (device.publicKeySpkiBase64 === this.currentDevicePublicKey()) {
      this.snackBar.open('Non puoi revocare il dispositivo corrente!', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
      return;
    }

    const snackBarRef = this.snackBar.open(
      `Sei sicuro di voler revocare l'accesso di "${device.deviceName || 'senza nome'}"? Il dispositivo perderà l'accesso a tutte le password.`,
      'Revoca',
      {
        duration: 8000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: 'error-snack'
      }
    );

    snackBarRef.onAction().subscribe(async () => {
      // Revoca = elimina dispositivo
      await this.deleteDevice(device);
    });
  }

  editDevice(device: any) {
    if (device.publicKeySpkiBase64 === this.currentDevicePublicKey()) {
      this.snackBar.open('Non puoi modificare il dispositivo corrente!', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
      return;
    }

    this.snackBar.open('Funzione di modifica dispositivo non ancora implementata', 'Chiudi', {
      duration: 3000,
      panelClass: 'error-snack'
    });
  }

  async exportDeviceKeys() {
    try {
      const deviceName = prompt('Nome del dispositivo per il backup:', 'My Device');
      if (!deviceName) return;

      const backupJson = await exportDeviceBackup(deviceName);

      // Scarica il file JSON
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-device-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.snackBar.open('✅ Backup esportato! Salva il file in un posto sicuro.', 'Chiudi', {
        duration: 5000,
        panelClass: 'success-snack'
      });
    } catch (error: any) {
      console.error('Error exporting device keys:', error);
      this.snackBar.open('Errore durante l\'export del backup: ' + error.message, 'Chiudi', {
        duration: 5000,
        panelClass: 'error-snack'
      });
    }
  }

  async importDeviceKeys() {
    try {
      const backupJson = await pickFileText('.json');
      if (!backupJson) return;

      const password = prompt('Inserisci una nuova password per proteggere le chiavi localmente:');
      if (!password) return;

      const recoveryCode = prompt(
        'Inserisci il Recovery Code che hai salvato durante la creazione del dispositivo:\n\n' +
        '(Formato: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX)'
      );
      if (!recoveryCode) return;

      const result = await importDeviceBackup(backupJson, password, recoveryCode);
      this.snackBar.open(`✅ Backup importato! Dispositivo: ${result.deviceName}`, 'Chiudi', {
        duration: 5000,
        panelClass: 'success-snack'
      });

      this.devices.reload();
      this.secrets.reload();
    } catch (error: any) {
      console.error('Error importing device keys:', error);
      this.snackBar.open('Errore: ' + error.message, 'Chiudi', {
        duration: 5000,
        panelClass: 'error-snack'
      });
    }
  }


  async recoverDevice(device: any) {
    try {
      const devicePublicKey = device.publicKeySpkiBase64;
      const deviceName = device.deviceName || 'Dispositivo senza nome';
      const recoveryBackupBase64 = device.recoveryBackupBase64;

      // Verifica se il dispositivo ha un recovery backup sul backend
      if (!recoveryBackupBase64) {
        this.snackBar.open(
          '❌ Recovery Backup non disponibile per questo dispositivo. Contatta l\'amministratore o usa il backup locale.',
          'Chiudi',
          {
            duration: 7000,
            panelClass: 'error-snack'
          }
        );
        return;
      }

      // Chiedi recovery code con istruzioni chiare
      const recoveryCode = prompt(
        `🔓 Recupero Dispositivo: ${deviceName}\n\n` +
        `📝 IMPORTANTE: Ti serve il Recovery Code mostrato quando hai creato questo dispositivo.\n\n` +
        `Se l'hai salvato, inseriscilo ora.\n` +
        `Formato: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX\n\n` +
        `(Ogni gruppo di 4 caratteri separato da trattino)`
      );

      if (!recoveryCode) return;

      // Il dispositivo ha un recovery backup sul backend
      if (recoveryBackupBase64) {
        // Chiedi la modalità di recupero tramite snackBar
        const snackBarRef = this.snackBar.open(
          '🔐 Vuoi utilizzare ACCESSO DIRETTO (senza password)?',
          'Accesso Diretto',
          {
            duration: 0, // Non scade automaticamente
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: 'success-snack'
          }
        );

        // Aspetta la risposta
        const useDirectAccessMode = await new Promise<boolean>((resolve) => {
          snackBarRef.onAction().subscribe(() => {
            snackBarRef.dismiss();
            resolve(true);
          });

          snackBarRef.afterDismissed().subscribe((info) => {
            if (!info.dismissedByAction) {
              resolve(false);
            }
          });

          // Aggiungi pulsante "Modalità Sicura" manualmente cliccando dismiss dopo 5 secondi
          setTimeout(() => {
            if (!snackBarRef) return;
            // Se dopo 10 secondi non ha cliccato, chiudi automaticamente e usa modalità sicura
          }, 10000);
        });

        let password: string | null = null;
        if (!useDirectAccessMode) {
          password = prompt(
            `Inserisci una password per proteggere le chiavi localmente:\n\n` +
            `(Questa password verrà richiesta ad ogni accesso)`
          );

          if (password === null) return;
        }

        try {
          // Recupera usando il backup dal backend
          await recoverDeviceWithRecoveryBackup(
            devicePublicKey,
            recoveryBackupBase64,
            recoveryCode,
            password,
            useDirectAccessMode
          );

          this.snackBar.open(
            `✅ Dispositivo "${deviceName}" recuperato con successo! Modalità: ${useDirectAccessMode ? 'Accesso Diretto' : 'Sicura'}`,
            'Chiudi',
            {
              duration: 5000,
              panelClass: 'success-snack'
            }
          );

          // Aggiorna lo stato
          this.isDirectAccessModeActive.set(isDirectAccessMode());
          this.currentDevicePublicKey.set(getCurrentDevicePublicKey());

          // Ricarica i dati
          this.devices.reload();
          this.secrets.reload();

          return;
        } catch (error: any) {
          this.snackBar.open(`❌ Errore nel recupero: ${error.message}. Verifica il Recovery Code.`, 'Chiudi', {
            duration: 5000,
            panelClass: 'error-snack'
          });
          return;
        }
      }

    } catch (error: any) {
      console.error('Error in recoverDevice:', error);

      let errorMessage = 'Errore recupero dispositivo: ';

      // Fornisci messaggi di errore più specifici
      if (error.message.includes('decrypt')) {
        errorMessage += 'Recovery Code non valido. Verifica di averlo copiato correttamente.';
      } else if (error.message.includes('password')) {
        errorMessage += 'Password non valida.';
      } else {
        errorMessage += error.message;
      }

      this.snackBar.open('❌ ' + errorMessage, 'Chiudi', {
        duration: 7000,
        panelClass: 'error-snack'
      });
    }
  }

  showRecoverDeviceList() {
    const devices = this.devices.value();
    if (!devices || devices.length === 0) {
      this.snackBar.open('Nessun dispositivo disponibile', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
      return;
    }

    // Se c'è solo un dispositivo, recuperalo direttamente
    if (devices.length === 1) {
      this.recoverDevice(devices[0]);
      return;
    }

    // Crea lista dispositivi con informazioni più dettagliate
    let deviceList = '🔐 Recupero Dispositivo\n\n';
    deviceList += 'Hai più dispositivi registrati. Seleziona quale recuperare:\n\n';
    devices.forEach((device, index) => {
      const name = device.deviceName || 'Dispositivo senza nome';
      const hasRecovery = device.recoveryBackupBase64 ? '✅' : '❌';
      deviceList += `${index + 1}. ${name} ${hasRecovery}\n`;
    });
    deviceList += '\n✅ = Recovery disponibile sul server\n';
    deviceList += '❌ = Recovery non disponibile\n\n';
    deviceList += 'Inserisci il numero del dispositivo:';

    const selection = prompt(deviceList);
    if (!selection) return;

    const deviceIndex = parseInt(selection) - 1;
    if (deviceIndex >= 0 && deviceIndex < devices.length) {
      this.recoverDevice(devices[deviceIndex]);
    } else {
      this.snackBar.open('Selezione non valida', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
    }
  }

  async copyPasswordToClipboard(secret: any) {
    const unlocked = await this.unlockSession();
    if (!unlocked) return;

    const currentDeviceId = this.currentDevice()?.deviceId;
    if (!currentDeviceId) {
      this.snackBar.open('Dispositivo corrente non trovato', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
      return;
    }

    const privateKey = this.devicePrivateKey();
    if (!privateKey) return;

    // Reset auto-lock timer ad ogni azione
    this.resetAutoLockTimer();

    try {
      const decryptedPassword = await decryptSecretWithKey(secret, privateKey, currentDeviceId);
      await navigator.clipboard.writeText(decryptedPassword);
      this.snackBar.open('📋 Password copiata negli appunti!', 'Chiudi', {
        duration: 3000,
        panelClass: 'success-snack'
      });
    } catch (error) {
      console.error('Error copying password:', error);
      this.snackBar.open('Errore durante la copia della password', 'Chiudi', {
        duration: 5000,
        panelClass: 'error-snack'
      });
    }
  }

  toggleDevicesSection() {
    this.showDevices.set(!this.showDevices());
  }

  async exportDeviceKeysForCloning() {
    try {
      // Verifica che ci siano chiavi locali da clonare
      const publicKey = localStorage.getItem('vault_device_public_key');
      const privateKeyRaw = localStorage.getItem('vault_device_private_key');

      if (!publicKey || !privateKeyRaw) {
        this.snackBar.open('❌ Nessuna chiave trovata. Autorizza prima questo dispositivo.', 'Chiudi', {
          duration: 5000,
          panelClass: 'error-snack'
        });
        return;
      }

      const currentDeviceData = this.currentDevice();
      if (!currentDeviceData) {
        this.snackBar.open('❌ Dispositivo corrente non trovato', 'Chiudi', {
          duration: 3000,
          panelClass: 'error-snack'
        });
        return;
      }

      // Chiedi password temporanea per cifrare il trasferimento
      const transferPassword = prompt(
        '🔐 Clonazione Dispositivo\n\n' +
        'Crea una password temporanea per proteggere le chiavi durante il trasferimento.\n\n' +
        'Questa password servirà SOLO per importare le chiavi sul nuovo dispositivo e può essere diversa dalla password del vault.'
      );

      if (!transferPassword) return;

      const clonePayload: ClonePayload = {
        version: '1.0',
        deviceName: currentDeviceData.deviceName!,
        sourceDeviceId: currentDeviceData.deviceId ?? null,
        publicKeySpkiBase64: publicKey,
        privateKeyData: JSON.parse(privateKeyRaw),
        recoveryBackupBase64: currentDeviceData.recoveryBackupBase64 || btoa(localStorage.getItem('vault_device_recovery_backup') || ''),
        createdAt: new Date().toISOString(),
        cloneType: 'device-keys'
      };

      const payloadJson = await encryptClonePayload(clonePayload, transferPassword);

      // Aspetta che il documento riprenda il focus dopo il prompt
      await new Promise(resolve => setTimeout(resolve, 100));

      // Copia negli appunti con fallback
      try {
        await navigator.clipboard.writeText(payloadJson);
        this.snackBar.open(
          '✅ Chiavi copiate negli appunti! Incolla sul nuovo dispositivo per clonarlo. ATTENZIONE: condividi solo via canale sicuro.',
          'Chiudi',
          {
            duration: 8000,
            panelClass: 'success-snack'
          }
        );
      } catch {
        // Fallback: scarica come file
        const blob = new Blob([payloadJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clone-keys-${currentDeviceData.deviceName}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.snackBar.open(
          '✅ File scaricato! Trasferiscilo sul nuovo dispositivo e importalo.',
          'Chiudi',
          {
            duration: 8000,
            panelClass: 'success-snack'
          }
        );
      }
    } catch (error: any) {
      console.error('Error exporting keys for cloning:', error);
      this.snackBar.open('Errore export chiavi: ' + error.message, 'Chiudi', {
        duration: 5000,
        panelClass: 'error-snack'
      });
    }
  }

  async importClonedDeviceKeys() {
    try {
      // Verifica se ci sono già chiavi locali
      if (localStorage.getItem('vault_device_public_key')) {
        return new Promise<void>((resolve) => {
          const snackBarRef = this.snackBar.open(
            '⚠️ Questo dispositivo ha già chiavi. Sovrascriverle?',
            'Continua',
            {
              duration: 8000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom',
              panelClass: 'error-snack'
            }
          );

          snackBarRef.onAction().subscribe(() => {
            this.continueImportClonedKeys();
            resolve();
          });

          snackBarRef.afterDismissed().subscribe((info) => {
            if (!info.dismissedByAction) {
              resolve();
            }
          });
        });
      }

      await this.continueImportClonedKeys();
    } catch (error: any) {
      console.error('Error importing cloned keys:', error);
      this.snackBar.open('❌ Errore import chiavi: ' + error.message, 'Chiudi', {
        duration: 5000,
        panelClass: 'error-snack'
      });
    }
  }

  private async continueImportClonedKeys(deviceSetup?: AddDeviceData, isAuthorizationFlow = false) {
    try {
      // Prova a leggere dalla clipboard, altrimenti chiedi di caricare un file
      let payloadStr: string | null = null;

      try {
        payloadStr = await navigator.clipboard.readText();
        // Verifica che sia un JSON valido con la struttura attesa
        const test = JSON.parse(payloadStr);
        if (!test.encrypted || !test.salt || !test.nonce) {
          payloadStr = null;
        }
      } catch {
        payloadStr = null;
      }

      if (!payloadStr) {
        // Fallback: carica da file
        payloadStr = await pickFileText('.json');
      }

      if (!payloadStr) {
        this.snackBar.open('❌ Nessun dato di clonazione trovato. Copia il codice negli appunti o carica il file.', 'Chiudi', {
          duration: 5000,
          panelClass: 'error-snack'
        });
        return;
      }

      // Chiedi password temporanea
      const transferPassword = prompt(
        '🔐 Password Temporanea\n\n' +
        'Inserisci la password temporanea usata per cifrare il trasferimento:'
      );

      if (!transferPassword) return;

      const clonePayload = await decryptClonePayload(payloadStr, transferPassword);

      let finalSetup = deviceSetup;
      if (!finalSetup) {
        const dialogRef = this.dialog.open(AddDeviceDialog, {
          width: '1036px',
          disableClose: false,
          panelClass: 'overflow-hidden',
          maxWidth: '100%'
        });

        finalSetup = await firstValueFrom(dialogRef.afterClosed());
      }

      if (!finalSetup) return;

      await this.persistClonedKeys(clonePayload, finalSetup.directAccessMode, finalSetup.password);
      const registeredDeviceId = await this.registerClonedDevice(finalSetup.deviceName, clonePayload);
      this.setCurrentDeviceIdentity(registeredDeviceId, clonePayload.publicKeySpkiBase64);

      this.snackBar.open(
        `✅ ${isAuthorizationFlow ? 'Dispositivo autorizzato' : 'Dispositivo clonato'}! Nome: ${finalSetup.deviceName}. Modalità: ${finalSetup.directAccessMode ? 'Accesso Diretto' : 'Sicura'}`,
        'Chiudi',
        {
          duration: 5000,
          panelClass: 'success-snack'
        }
      );

      this.isDirectAccessModeActive.set(finalSetup.directAccessMode);

      this.devices.reload();
      this.secrets.reload();

    } catch (error: any) {
      console.error('Error importing cloned keys:', error);
      this.snackBar.open('❌ Errore import chiavi: ' + error.message + '. Verifica payload e password.', 'Chiudi', {
        duration: 6000,
        panelClass: 'error-snack'
      });
    }
  }

  /**
   * Migrazione password: crea un nuovo dispositivo con chiavi proprie
   * e ricifra tutte le password esistenti importando la chiave privata del vecchio dispositivo.
   * 
   * Questo approccio è più sicuro della clonazione perché ogni dispositivo ha chiavi uniche.
   */
  async migrateSecretsFromOldDevice() {
    try {
      // 1. Verifica che non ci siano già chiavi locali
      if (this.hasLocalDeviceKeys()) {
        this.snackBar.open('⚠️ Questo dispositivo ha già delle chiavi. Usa "Clona dispositivo" o elimina prima le chiavi esistenti.', 'Chiudi', {
          duration: 5000,
          panelClass: 'error-snack'
        });
        return;
      }

      // 2. Leggi il payload di clonazione dalla clipboard o file
      let payloadStr: string | null = null;
      try {
        payloadStr = await navigator.clipboard.readText();
        const test = JSON.parse(payloadStr);
        if (!test.encrypted || !test.salt || !test.nonce) {
          payloadStr = null;
        }
      } catch {
        payloadStr = null;
      }

      if (!payloadStr) {
        payloadStr = await pickFileText('.json');
      }

      if (!payloadStr) {
        this.snackBar.open('❌ Copia il codice di clonazione negli appunti o carica il file dal vecchio dispositivo.', 'Chiudi', {
          duration: 5000,
          panelClass: 'error-snack'
        });
        return;
      }

      // 3. Chiedi password temporanea per decifrare il payload
      const transferPassword = prompt(
        '🔐 Password Temporanea\n\n' +
        'Inserisci la password temporanea usata per cifrare il trasferimento:'
      );
      if (!transferPassword) return;

      const clonePayload = await decryptClonePayload(payloadStr, transferPassword);

      // 4. Importa la chiave privata del vecchio dispositivo
      const oldPrivateKey = await importPrivateKeyFromBase64(clonePayload.privateKeyData.pkcs8Base64);

      // 5. Chiedi configurazione per il nuovo dispositivo
      const dialogRef = this.dialog.open(AddDeviceDialog, {
        width: '1036px',
        disableClose: false,
        panelClass: 'overflow-hidden',
        maxWidth: '100%'
      });

      const deviceSetup = await firstValueFrom(dialogRef.afterClosed());
      if (!deviceSetup) return;

      // 6. Genera nuove chiavi per questo dispositivo
      const recoveryCode = generateRecoveryCode();
      const newKeys = await generateAndStoreDeviceKeysLocally(
        deviceSetup.password,
        recoveryCode,
        deviceSetup.directAccessMode
      );

      // 7. Registra il nuovo dispositivo sul backend
      const deviceResponse = await firstValueFrom(this.vaultService.vaultDevicesPost({
        registerDeviceRequest: {
          deviceName: deviceSetup.deviceName,
          publicKeySpkiBase64: newKeys.publicKeySpkiBase64,
          recoveryBackupBase64: newKeys.recoveryBackupBase64
        }
      }));

      const newDeviceId = deviceResponse.deviceId;
      if (!newDeviceId) {
        throw new Error('Il server non ha restituito un ID per il nuovo dispositivo');
      }

      // 8. Mostra recovery key dialog
      const recoveryDialog = this.dialog.open(RecoveryKeyDialog, {
        disableClose: true,
        maxWidth: '100%',
        panelClass: 'overflow-hidden',
        data: {
          deviceName: deviceSetup.deviceName,
          recoveryCode
        }
      });

      const confirmed = await firstValueFrom(recoveryDialog.afterClosed());
      if (!confirmed) return;

      // 9. Aggiorna identità corrente
      this.setCurrentDeviceIdentity(newDeviceId, newKeys.publicKeySpkiBase64);
      this.isDirectAccessModeActive.set(deviceSetup.directAccessMode);

      // 10. Ricifra tutte le password
      const secrets = this.secrets.value();
      if (!secrets || secrets.length === 0) {
        this.snackBar.open(`✅ Nuovo dispositivo "${deviceSetup.deviceName}" creato! Nessuna password da migrare.`, 'Chiudi', {
          duration: 5000,
          panelClass: 'success-snack'
        });
        this.devices.reload();
        return;
      }

      this.snackBar.open(`🔄 Migrazione di ${secrets.length} password in corso...`, '', {
        duration: 0,
        panelClass: 'success-snack'
      });

      let migratedCount = 0;
      let errorCount = 0;

      for (const secret of secrets) {
        try {
          // Trova un envelope del vecchio dispositivo
          const envelopes = secret.deviceEnvelopes || [];
          let secretKey: CryptoKey | null = null;

          for (const envelope of envelopes) {
            try {
              secretKey = await unwrapSecretKeyWithDevicePrivateKey(envelope.wrappedSecretKeyBase64, oldPrivateKey);
              break;
            } catch {
              // Prova prossimo envelope
            }
          }

          if (!secretKey) {
            console.warn(`Impossibile decifrare secret ${secret.secretId}: nessun envelope compatibile`);
            errorCount++;
            continue;
          }

          // Crea nuovo envelope per il nuovo dispositivo
          const newWrappedKey = await wrapSecretKeyForDevice(secretKey, newKeys.publicKeySpkiBase64);

          // Combina gli envelope esistenti con il nuovo
          const existingEnvelopes = envelopes.map((e: any) => ({
            deviceId: e.deviceId,
            wrappedSecretKeyBase64: e.wrappedSecretKeyBase64,
            permission: e.permission
          }));

          const newEnvelope = {
            deviceId: newDeviceId,
            wrappedSecretKeyBase64: newWrappedKey,
            permission: SecretPermission.Owner
          };

          // Aggiorna il secret sul server
          await firstValueFrom(this.vaultService.vaultSecretsSecretIdPut({
            secretId: secret.secretId,
            updateSecretRequest: {
              ownerDeviceEnvelopes: [...existingEnvelopes, newEnvelope]
            }
          }));

          migratedCount++;
        } catch (err) {
          console.error(`Errore migrazione secret ${secret.secretId}:`, err);
          errorCount++;
        }
      }

      this.snackBar.dismiss();

      if (errorCount === 0) {
        this.snackBar.open(
          `✅ Migrazione completata! ${migratedCount} password migrate al nuovo dispositivo "${deviceSetup.deviceName}".`,
          'Chiudi',
          {
            duration: 8000,
            panelClass: 'success-snack'
          }
        );
      } else {
        this.snackBar.open(
          `⚠️ Migrazione parziale: ${migratedCount} password migrate, ${errorCount} errori.`,
          'Chiudi',
          {
            duration: 8000,
            panelClass: 'error-snack'
          }
        );
      }

      this.devices.reload();
      this.secrets.reload();

    } catch (error: any) {
      console.error('Errore migrazione:', error);
      this.snackBar.open('❌ Errore migrazione: ' + error.message, 'Chiudi', {
        duration: 6000,
        panelClass: 'error-snack'
      });
    }
  }

  // === GESTIONE GRUPPI E CONDIVISIONE ===

  openGroupsDialog() {
    this.dialog.open(GroupsDialog, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'overflow-hidden',
      maxHeight: '90vh'
    });
  }

  async shareToUser(secret: any) {
    const unlocked = await this.unlockSession();
    if (!unlocked) return;

    const privateKey = this.devicePrivateKey();
    const currentDeviceId = this.currentDevice()?.deviceId;

    if (!privateKey || !currentDeviceId) {
      this.snackBar.open('Sessione non valida. Riprova.', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
      return;
    }

    const dialogRef = this.dialog.open(ShareToUserDialog, {
      width: '500px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'overflow-hidden',
      data: {
        secret,
        privateKey,
        currentDeviceId
      } as ShareToUserDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.secrets.reload();
      }
    });
  }

  async shareToGroup(secret: any) {
    const unlocked = await this.unlockSession();
    if (!unlocked) return;

    const privateKey = this.devicePrivateKey();
    const currentDeviceId = this.currentDevice()?.deviceId;

    if (!privateKey || !currentDeviceId) {
      this.snackBar.open('Sessione non valida. Riprova.', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
      return;
    }

    const dialogRef = this.dialog.open(ShareToGroupDialog, {
      width: '500px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'overflow-hidden',

      data: {
        secret,
        privateKey,
        currentDeviceId
      } as ShareToGroupDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.secrets.reload();
      }
    });
  }

  async manageShares(secret: any) {
    const dialogRef = this.dialog.open(ManageSharesDialog, {
      width: '550px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'overflow-hidden',
      data: {
        secret,
        ownerDeviceIds: this.devices.value()?.map(d => d.deviceId!) || []
      } as ManageSharesDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.secrets.reload();
      }
    });
  }

  // ============================================
  // Gestione Cartelle
  // ============================================

  selectFolder(folderId: number | null) {
    this.selectedFolderId.set(folderId);
  }

  toggleViewMode() {
    this.viewMode.set(this.viewMode() === 'list' ? 'folders' : 'list');
    if (this.viewMode() === 'list') {
      this.selectedFolderId.set(null);
    }
  }

  async createFolder() {
    const dialogRef = this.dialog.open(FolderDialog, {
      panelClass: 'overflow-hidden',
      data: { folder: null }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await firstValueFrom(this.vaultService.vaultFoldersPost({
            createFolderRequest: {
              name: result.name,
              description: result.description
            }
          }));

          this.snackBar.open('Cartella creata con successo', 'Chiudi', {
            duration: 3000,
            panelClass: 'success-snack'
          });

          this.folders.reload();
        } catch (error) {
          this.snackBar.open('Errore nella creazione della cartella', 'Chiudi', {
            duration: 3000,
            panelClass: 'error-snack'
          });
        }
      }
    });
  }

  async editFolder(folder: FolderDto) {
    const dialogRef = this.dialog.open(FolderDialog, {
      width: '500px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { folder }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result && folder.folderId) {
        try {
          await firstValueFrom(this.vaultService.vaultFoldersFolderIdPut({
            folderId: folder.folderId,
            updateFolderRequest: {
              name: result.name,
              description: result.description
            }
          }));

          this.snackBar.open('Cartella aggiornata con successo', 'Chiudi', {
            duration: 3000,
            panelClass: 'success-snack'
          });

          this.folders.reload();
        } catch (error) {
          this.snackBar.open('Errore nell\'aggiornamento della cartella', 'Chiudi', {
            duration: 3000,
            panelClass: 'error-snack'
          });
        }
      }
    });
  }

  async deleteFolder(folder: FolderDto) {
    if (!confirm(`Sei sicuro di voler eliminare la cartella "${folder.name}"?\n\nLe password contenute NON verranno eliminate, ma rimarranno senza cartella.`)) {
      return;
    }

    try {
      if (folder.folderId) {
        await firstValueFrom(this.vaultService.vaultFoldersFolderIdDelete({
          folderId: folder.folderId
        }));

        this.snackBar.open('Cartella eliminata con successo', 'Chiudi', {
          duration: 3000,
          panelClass: 'success-snack'
        });

        if (this.selectedFolderId() === folder.folderId) {
          this.selectedFolderId.set(null);
        }

        this.folders.reload();
        this.secrets.reload();
      }
    } catch (error) {
      this.snackBar.open('Errore nell\'eliminazione della cartella', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
    }
  }

  async moveToFolder(secret: any) {
    const folders = this.folders.value();
    if (!folders) {
      this.snackBar.open('Impossibile caricare le cartelle', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snack'
      });
      return;
    }

    const dialogRef = this.dialog.open(MoveToFolderDialog, {
      width: '500px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        folders,
        currentFolderId: secret.folderId,
        secretTitle: secret.title || 'Password senza titolo'
      }
    });

    dialogRef.afterClosed().subscribe(async (selectedFolderId) => {
      if (selectedFolderId !== undefined && selectedFolderId !== secret.folderId) {
        try {
          await firstValueFrom(this.vaultService.vaultSecretsSecretIdMoveToFolderFolderPut({
            secretId: secret.secretId,
            folder: selectedFolderId
          }));

          this.snackBar.open(
            selectedFolderId === null 
              ? 'Password rimossa dalla cartella' 
              : 'Password spostata nella cartella',
            'Chiudi',
            {
              duration: 3000,
              panelClass: 'success-snack'
            }
          );

          this.secrets.reload();
          this.folders.reload();
        } catch (error) {
          this.snackBar.open('Errore nello spostamento della password', 'Chiudi', {
            duration: 3000,
            panelClass: 'error-snack'
          });
        }
      }
    });
  }
}
