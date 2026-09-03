import { SecretPermission, RecoveryMethodType } from '../../../api/index';

const output = document.getElementById("output");

function log(obj: any) {
  console.log(obj);
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function utf8ToBytes(text: string) {
  return new TextEncoder().encode(text);
}

function bytesToUtf8(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

function randomBytes(length: number) {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
}

async function deriveAesKeyFromPassword(password: string, saltBytes: Uint8Array, iterations = 100000) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    utf8ToBytes(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes as any,
      iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
}

async function aesGcmEncryptRaw(aesKey: CryptoKey, plaintextBytes: Uint8Array, aadText = "") {
  const iv = randomBytes(12);

  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: aadText ? utf8ToBytes(aadText) : undefined,
      tagLength: 128
    },
    aesKey,
    plaintextBytes as any
  ));

  const tag = encrypted.slice(encrypted.length - 16);
  const ciphertext = encrypted.slice(0, encrypted.length - 16);

  return {
    nonceBase64: bytesToBase64(iv),
    ciphertextBase64: bytesToBase64(ciphertext),
    tagBase64: bytesToBase64(tag)
  };
}

async function aesGcmDecryptRaw(aesKey: CryptoKey, nonceBase64: string, ciphertextBase64: string, tagBase64: string, aadText = "") {
  const iv = base64ToBytes(nonceBase64);
  const ciphertext = base64ToBytes(ciphertextBase64);
  const tag = base64ToBytes(tagBase64);

  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: aadText ? utf8ToBytes(aadText) : undefined,
      tagLength: 128
    },
    aesKey,
    combined
  );

  return new Uint8Array(plain);
}

async function generateDeviceKeyPair() {
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 3072,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["wrapKey", "unwrapKey"]
  );
}

async function exportPublicKeySpkiBase64(publicKey: CryptoKey) {
  const spki = await crypto.subtle.exportKey("spki", publicKey);
  return bytesToBase64(new Uint8Array(spki));
}

async function exportPrivateKeyPkcs8Base64(privateKey: CryptoKey) {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
  return bytesToBase64(new Uint8Array(pkcs8));
}

async function importPublicKeyFromBase64(spkiBase64: string) {
  return crypto.subtle.importKey(
    "spki",
    base64ToBytes(spkiBase64),
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    true,
    ["wrapKey"]
  );
}

export async function importPrivateKeyFromBase64(pkcs8Base64: string) {
  return crypto.subtle.importKey(
    "pkcs8",
    base64ToBytes(pkcs8Base64),
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    true,
    ["unwrapKey"]
  );
}

async function protectPrivateKeyForLocalStorage(privateKey: CryptoKey, password: string) {
  const pkcs8Base64 = await exportPrivateKeyPkcs8Base64(privateKey);
  const salt = randomBytes(16);
  const wrappingKey = await deriveAesKeyFromPassword(password, salt, 100000);

  const enc = await aesGcmEncryptRaw(
    wrappingKey,
    base64ToBytes(pkcs8Base64),
    "local-device-private-key"
  );

  return {
    saltBase64: bytesToBase64(salt),
    iterations: 100000,
    ...enc
  };
}

// Salva la chiave privata senza cifratura (modalità accesso diretto)
async function storePrivateKeyUnencrypted(privateKey: CryptoKey) {
  const pkcs8Base64 = await exportPrivateKeyPkcs8Base64(privateKey);
  return {
    unencrypted: true,
    pkcs8Base64
  };
}

// Carica la chiave privata non cifrata (modalità accesso diretto)
async function loadPrivateKeyUnencrypted(saved: any): Promise<CryptoKey> {
  return importPrivateKeyFromBase64(saved.pkcs8Base64);
}

export async function loadPrivateKeyFromLocalStorage(password?: string) {
  const raw = localStorage.getItem("vault_device_private_key");
  if (!raw) throw new Error("Private key locale non trovata.");

  const saved = JSON.parse(raw);

  // Se è salvata in modalità accesso diretto (non cifrata)
  if (saved.unencrypted) {
    return loadPrivateKeyUnencrypted(saved);
  }

  // Modalità sicura: richiede password
  if (!password) throw new Error("Password richiesta per decifrare la chiave");

  const aesKey = await deriveAesKeyFromPassword(
    password,
    base64ToBytes(saved.saltBase64),
    saved.iterations
  );

  const pkcs8Bytes = await aesGcmDecryptRaw(
    aesKey,
    saved.nonceBase64,
    saved.ciphertextBase64,
    saved.tagBase64,
    "local-device-private-key"
  );

  return importPrivateKeyFromBase64(bytesToBase64(pkcs8Bytes));
}

// Verifica se il dispositivo è in modalità accesso diretto
export function isDirectAccessMode(): boolean {
  const raw = localStorage.getItem("vault_device_private_key");
  if (!raw) return false;
  const saved = JSON.parse(raw);
  return saved.unencrypted === true;
}

// **Device Recovery Functions**
// Cifra la chiave privata del dispositivo con il recovery code per il backup
async function protectPrivateKeyWithRecoveryCode(privateKey: CryptoKey, recoveryCode: string) {
  const pkcs8Base64 = await exportPrivateKeyPkcs8Base64(privateKey);
  const salt = randomBytes(16);
  const iterations = 100000;
  const wrappingKey = await deriveAesKeyFromPassword(recoveryCode, salt, iterations);

  const enc = await aesGcmEncryptRaw(
    wrappingKey,
    base64ToBytes(pkcs8Base64),
    "device-recovery-backup"
  );

  return {
    saltBase64: bytesToBase64(salt),
    iterations,
    ...enc
  };
}

// Recupera la chiave privata dal backup cifrato con recovery code
async function recoverPrivateKeyFromRecoveryCode(recoveryBackup: any, recoveryCode: string) {
  const aesKey = await deriveAesKeyFromPassword(
    recoveryCode,
    base64ToBytes(recoveryBackup.saltBase64),
    recoveryBackup.iterations
  );

  const pkcs8Bytes = await aesGcmDecryptRaw(
    aesKey,
    recoveryBackup.nonceBase64,
    recoveryBackup.ciphertextBase64,
    recoveryBackup.tagBase64,
    "device-recovery-backup"
  );

  return importPrivateKeyFromBase64(bytesToBase64(pkcs8Bytes));
}

// Esporta il backup del dispositivo come JSON scaricabile
export async function exportDeviceBackup(deviceName: string): Promise<string> {
  const publicKey = localStorage.getItem("vault_device_public_key");
  const privateKeyEncrypted = localStorage.getItem("vault_device_private_key");
  const recoveryBackup = localStorage.getItem("vault_device_recovery_backup");

  if (!publicKey || !privateKeyEncrypted || !recoveryBackup) {
    throw new Error("Dati del dispositivo non completi per l'export");
  }

  const backupData = {
    version: "1.0",
    deviceName,
    exportDate: new Date().toISOString(),
    publicKeySpkiBase64: publicKey,
    privateKeyEncrypted: JSON.parse(privateKeyEncrypted),
    recoveryBackup: JSON.parse(recoveryBackup)
    // NOTA: Il recovery code NON viene incluso per sicurezza.
    // L'utente deve averlo salvato separatamente.
  };

  return JSON.stringify(backupData, null, 2);
}

// Recupera un dispositivo specifico usando il recovery code, cercando prima in localStorage
// Recupera un dispositivo usando recovery code e backup dal backend
export async function recoverDeviceWithRecoveryBackup(
  devicePublicKey: string, 
  recoveryBackupBase64: string, 
  recoveryCode: string, 
  password: string | null,
  directAccessMode: boolean = false
): Promise<void> {
  try {
    // Decodifica il backup dal backend
    const recoveryBackup = JSON.parse(atob(recoveryBackupBase64));
    
    // Recupera la chiave privata usando il recovery code
    const privateKey = await recoverPrivateKeyFromRecoveryCode(recoveryBackup, recoveryCode);
    
    // Salva in localStorage (cifrata o non cifrata in base alla modalità)
    let protectedPrivateKey;
    if (directAccessMode) {
      protectedPrivateKey = await storePrivateKeyUnencrypted(privateKey);
    } else {
      if (!password) throw new Error("Password richiesta per modalità sicura");
      protectedPrivateKey = await protectPrivateKeyForLocalStorage(privateKey, password);
    }
    
    localStorage.setItem("vault_device_public_key", devicePublicKey);
    localStorage.setItem("vault_device_private_key", JSON.stringify(protectedPrivateKey));
  } catch (error: any) {
    throw new Error(`Recovery code errato o dati corrotti: ${error.message}`);
  }
}

export async function recoverDeviceWithRecoveryCode(devicePublicKey: string, password: string, recoveryCode: string): Promise<boolean> {
  // Prima verifica se il recovery backup è ancora in localStorage
  const localRecoveryBackup = localStorage.getItem("vault_device_recovery_backup");
  const localPublicKey = localStorage.getItem("vault_device_public_key");

  if (localRecoveryBackup && localPublicKey === devicePublicKey) {
    // Il backup è in localStorage, uso quello
    try {
      const recoveryBackup = JSON.parse(localRecoveryBackup);
      const privateKey = await recoverPrivateKeyFromRecoveryCode(recoveryBackup, recoveryCode);
      
      // Ri-cifra con la nuova password
      const protectedPrivateKey = await protectPrivateKeyForLocalStorage(privateKey, password);
      localStorage.setItem("vault_device_private_key", JSON.stringify(protectedPrivateKey));
      // NON salviamo il recovery code nel localStorage
      
      return true;
    } catch (error) {
      console.error("Error recovering from localStorage:", error);
      throw new Error("Recovery code errato o dati corrotti");
    }
  }

  return false; // Non trovato in localStorage, serve il file backup
}

// Importa un backup del dispositivo e ripristina le chiavi
export async function importDeviceBackup(backupJson: string, password: string, recoveryCode?: string) {
  const backup = JSON.parse(backupJson);
  
  if (!backup.version || !backup.publicKeySpkiBase64 || !backup.recoveryBackup) {
    throw new Error("Formato backup non valido");
  }

  // Prova a recuperare la chiave privata dal recovery backup
  if (!recoveryCode) {
    throw new Error("Recovery code necessario per importare il backup");
  }

  const privateKey = await recoverPrivateKeyFromRecoveryCode(backup.recoveryBackup, recoveryCode);

  // Ri-cifra la chiave privata con la nuova password
  const protectedPrivateKey = await protectPrivateKeyForLocalStorage(privateKey, password);

  // Salva tutto in localStorage (SENZA il recovery code)
  localStorage.setItem("vault_device_public_key", backup.publicKeySpkiBase64);
  localStorage.setItem("vault_device_private_key", JSON.stringify(protectedPrivateKey));
  localStorage.setItem("vault_device_recovery_backup", JSON.stringify(backup.recoveryBackup));

  return {
    publicKeySpkiBase64: backup.publicKeySpkiBase64,
    deviceName: backup.deviceName
  };
}

export async function generateAndStoreDeviceKeysLocally(password: string | null, recoveryCode?: string, directAccessMode: boolean = false) {
  const keyPair = await generateDeviceKeyPair();
  const publicKeySpkiBase64 = await exportPublicKeySpkiBase64(keyPair.publicKey);
  
  let protectedPrivateKey;
  if (directAccessMode) {
    // Modalità accesso diretto: salva chiave non cifrata
    protectedPrivateKey = await storePrivateKeyUnencrypted(keyPair.privateKey);
  } else {
    // Modalità sicura: cifra con password
    if (!password) throw new Error("Password richiesta per modalità sicura");
    protectedPrivateKey = await protectPrivateKeyForLocalStorage(keyPair.privateKey, password);
  }

  localStorage.setItem("vault_device_public_key", publicKeySpkiBase64);
  localStorage.setItem("vault_device_private_key", JSON.stringify(protectedPrivateKey));

  // Se viene fornito un recovery code, crea il backup cifrato (da salvare sul backend)
  let recoveryBackupBase64: string | undefined;
  if (recoveryCode) {
    const recoveryBackup = await protectPrivateKeyWithRecoveryCode(keyPair.privateKey, recoveryCode);
    recoveryBackupBase64 = btoa(JSON.stringify(recoveryBackup));
  }

  return {
    publicKeySpkiBase64,
    recoveryBackupBase64
  };
}

export function getCurrentDevicePublicKey(): string | null {
  const publicKeySpkiBase64 = localStorage.getItem("vault_device_public_key");
  return publicKeySpkiBase64;
}

async function generateSecretKey() {
  return crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
}

async function exportAesRawBase64(aesKey: CryptoKey) {
  const raw = await crypto.subtle.exportKey("raw", aesKey);
  return bytesToBase64(new Uint8Array(raw));
}

async function importAesRawBase64(rawBase64: string, usages: KeyUsage[] = ["encrypt", "decrypt"]) {
  return crypto.subtle.importKey(
    "raw",
    base64ToBytes(rawBase64),
    { name: "AES-GCM" },
    true,
    usages
  );
}

async function encryptSecretValue(plainText: string, aad: string) {
  const secretKey = await generateSecretKey();
  const enc = await aesGcmEncryptRaw(secretKey, utf8ToBytes(plainText), aad);
  return {
    secretKey,
    ...enc
  };
}

export async function wrapSecretKeyForDevice(secretKey: CryptoKey, devicePublicKeyBase64: string) {
  const publicKey = await importPublicKeyFromBase64(devicePublicKeyBase64);

  const wrapped = await crypto.subtle.wrapKey(
    "raw",
    secretKey,
    publicKey,
    { name: "RSA-OAEP" }
  );

  return bytesToBase64(new Uint8Array(wrapped));
}

export async function unwrapSecretKeyWithDevicePrivateKey(wrappedSecretKeyBase64: string, privateKey: CryptoKey) {
  return crypto.subtle.unwrapKey(
    "raw",
    base64ToBytes(wrappedSecretKeyBase64),
    privateKey,
    { name: "RSA-OAEP" },
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
}

export async function createRecoveryCodeEnvelope(secretKey: CryptoKey, recoveryCode: string, secretIdForAad: string = "") {
  const salt = randomBytes(16);
  const iterations = 100000;
  const recoveryAesKey = await deriveAesKeyFromPassword(recoveryCode, salt, iterations);

  const rawSecretKeyBase64 = await exportAesRawBase64(secretKey);
  const enc = await aesGcmEncryptRaw(
    recoveryAesKey,
    base64ToBytes(rawSecretKeyBase64),
    `recovery:${secretIdForAad}`
  );

  return {
    methodType: RecoveryMethodType.RecoveryCode,
    saltBase64: bytesToBase64(salt),
    iterations,
    ...enc,
    metadata: "Recovery code"
  };
}

export async function createAdminEscrowEnvelope(secretKey: CryptoKey, adminPublicKeyBase64: string) {
  const wrappedSecretKeyBase64 = await wrapSecretKeyForDevice(secretKey, adminPublicKeyBase64);

  return {
    methodType: RecoveryMethodType.AdminEscrow,
    saltBase64: null,
    iterations: null,
    ciphertextBase64: wrappedSecretKeyBase64,
    nonceBase64: "",
    tagBase64: "",
    metadata: "Admin escrow"
  };
}

export async function createServerEscrowEnvelope(secretKey: CryptoKey) {
  // in questo MVP il server escrow lo simuli inviando al server la raw key
  // e facendola proteggere lato server se vuoi aggiungere un endpoint dedicato.
  // qui lascio il payload già pronto.
  const rawSecretKeyBase64 = await exportAesRawBase64(secretKey);

  return {
    methodType: RecoveryMethodType.ServerEscrow,
    saltBase64: null,
    iterations: null,
    ciphertextBase64: rawSecretKeyBase64,
    nonceBase64: "",
    tagBase64: "",
    metadata: "Server escrow raw payload da proteggere lato server"
  };
}

export async function createSecretPackage({ ownerUserId, title, username, plainPassword, ownerDevices, recoveryCode }: { ownerUserId: string, title: string, username: string, plainPassword: string, ownerDevices: { deviceId: number, publicKeySpkiBase64: string }[], recoveryCode?: string }) {
  const tempSecretId = crypto.randomUUID();
  const aad = `secret:${tempSecretId}|owner:${ownerUserId}`;

  const encryptedSecret = await encryptSecretValue(plainPassword, aad);

  const ownerDeviceEnvelopes = [];
  for (const device of ownerDevices) {
    ownerDeviceEnvelopes.push({
      deviceId: device.deviceId,
      wrappedSecretKeyBase64: await wrapSecretKeyForDevice(encryptedSecret.secretKey, device.publicKeySpkiBase64),
      permission: SecretPermission.Owner
    });
  }

  const recoveryEnvelopes = [];
  if (recoveryCode) {
    recoveryEnvelopes.push(await createRecoveryCodeEnvelope(encryptedSecret.secretKey, recoveryCode, tempSecretId));
  }

  return {
    ownerUserId,
    title,
    username,
    ciphertextBase64: encryptedSecret.ciphertextBase64,
    nonceBase64: encryptedSecret.nonceBase64,
    tagBase64: encryptedSecret.tagBase64,
    aad,
    ownerDeviceEnvelopes,
    recoveryEnvelopes,
    // Espone la secretKey per poter creare envelope aggiuntivi (es. ricondivisione)
    secretKey: encryptedSecret.secretKey
  };
}

async function decryptSecretForCurrentDevice(secretResponse: any, privateKey: CryptoKey, currentDeviceId: number) {
  const envelopes = secretResponse.deviceEnvelopes || [];
  const matchingEnvelope = envelopes.find((x: any) => x.deviceId === currentDeviceId);
  const candidateEnvelopes = matchingEnvelope ? [matchingEnvelope, ...envelopes.filter((x: any) => x.deviceId !== currentDeviceId)] : envelopes;

  for (const envelope of candidateEnvelopes) {
    try {
      const secretKey = await unwrapSecretKeyWithDevicePrivateKey(envelope.wrappedSecretKeyBase64, privateKey);

      const plainBytes = await aesGcmDecryptRaw(
        secretKey,
        secretResponse.nonceBase64,
        secretResponse.ciphertextBase64,
        secretResponse.tagBase64,
        secretResponse.aad
      );

      return bytesToUtf8(plainBytes);
    } catch {
      // Prova envelope successivo: utile per dispositivi clonati con stessa chiave privata ma deviceId diverso
    }
  }

  throw new Error("Envelope compatibile con questo device non trovato.");
}

export function generateRecoveryCode(): string {
  // Genera 6 gruppi di 4 caratteri alfanumerici (24 caratteri totali)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Senza caratteri ambigui (0, O, 1, I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 4; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (i < 5) code += '-';
  }
  return code;
}

export async function decryptSecret(secret: any, devicePassword: string, currentDeviceId: number): Promise<string> {
  const privateKey = await loadPrivateKeyFromLocalStorage(devicePassword);
  return decryptSecretForCurrentDevice(secret, privateKey, currentDeviceId);
}

export async function decryptSecretWithKey(secret: any, privateKey: CryptoKey, currentDeviceId: number): Promise<string> {
  return decryptSecretForCurrentDevice(secret, privateKey, currentDeviceId);
}

// document.getElementById("registerDeviceBtn").addEventListener("click", async () => {
//   try {
//     const password = document.getElementById("loginPassword").value;
//     if (!password) throw new Error("Inserisci la password locale.");

//     const result = await generateAndStoreDeviceKeysLocally(password);
//     log({
//       message: "Chiavi device generate e salvate localmente",
//       publicKeySpkiBase64: result.publicKeySpkiBase64
//     });
//   } catch (err) {
//     log(err.message);
//   }
// });

// document.getElementById("registerDeviceServerBtn").addEventListener("click", async () => {
//   try {
//     const apiBase = document.getElementById("apiBase").value;
//     const userId = document.getElementById("userId").value;
//     const deviceName = document.getElementById("deviceName").value;
//     const publicKeySpkiBase64 = localStorage.getItem("vault_device_public_key");

//     if (!publicKeySpkiBase64) throw new Error("Genera prima le chiavi device.");

//     const result = await apiPost(`${apiBase}/api/users/devices`, {
//       userId,
//       deviceName,
//       publicKeySpkiBase64
//     });

//     localStorage.setItem("vault_current_device_id", result.deviceId);
//     log({ message: "Device registrato", deviceId: result.deviceId });
//   } catch (err) {
//     log(err.message);
//   }
// });

// document.getElementById("createSecretBtn").addEventListener("click", async () => {
//   try {
//     const apiBase = document.getElementById("apiBase").value;
//     const userId = document.getElementById("userId").value;
//     const title = document.getElementById("secretTitle").value;
//     const username = document.getElementById("secretUsername").value;
//     const plainPassword = document.getElementById("secretPassword").value;
//     const recoveryCode = document.getElementById("recoveryCode").value;

//     const ownerDevices = await apiGet(`${apiBase}/api/users/${userId}/devices`);

//     const payload = await createSecretPackage({
//       ownerUserId: userId,
//       title,
//       username,
//       plainPassword,
//       ownerDevices,
//       recoveryCode
//     });

//     const secretId = await apiPost(`${apiBase}/api/secrets`, payload);
//     log({ message: "Secret creato", secretId, payloadPreview: payload });
//   } catch (err) {
//     log(err.message);
//   }
// });

// document.getElementById("readSecretBtn").addEventListener("click", async () => {
//   try {
//     const apiBase = document.getElementById("apiBase").value;
//     const secretId = document.getElementById("readSecretId").value;
//     const localPassword = document.getElementById("loginPassword").value;
//     const currentDeviceId = localStorage.getItem("vault_current_device_id");

//     if (!currentDeviceId) throw new Error("Device id locale non trovato.");

//     const privateKey = await loadPrivateKeyFromLocalStorage(localPassword);
//     const secretResponse = await apiGet(`${apiBase}/api/secrets/${secretId}`);

//     const password = await decryptSecretForCurrentDevice(secretResponse, privateKey, currentDeviceId);

//     log({
//       secretId,
//       title: secretResponse.title,
//       username: secretResponse.username,
//       password
//     });
//   } catch (err) {
//     log(err.message);
//   }
// });