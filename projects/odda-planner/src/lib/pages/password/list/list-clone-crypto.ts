export interface ClonePayload {
  version: '1.0';
  deviceName: string;
  sourceDeviceId?: number | null;
  publicKeySpkiBase64: string;
  privateKeyData: any;
  recoveryBackupBase64?: string | null;
  createdAt: string;
  cloneType: 'device-keys';
}

interface EncryptedClonePayload {
  encrypted: number[];
  salt: number[];
  nonce: number[];
  iterations: number;
}

export const encryptClonePayload = async (payload: ClonePayload, transferPassword: string): Promise<string> => {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(transferPassword),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const dataBytes = encoder.encode(JSON.stringify(payload));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    dataBytes
  );

  const finalPayload: EncryptedClonePayload = {
    encrypted: Array.from(new Uint8Array(encrypted)),
    salt: Array.from(salt),
    nonce: Array.from(nonce),
    iterations,
  };

  return JSON.stringify(finalPayload);
};

export const decryptClonePayload = async (payloadStr: string, transferPassword: string): Promise<ClonePayload> => {
  const payload = JSON.parse(payloadStr) as EncryptedClonePayload;
  const salt = new Uint8Array(payload.salt);
  const nonce = new Uint8Array(payload.nonce);
  const encrypted = new Uint8Array(payload.encrypted);

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(transferPassword),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: payload.iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    encrypted
  );

  const decoder = new TextDecoder();
  const clonePayload = JSON.parse(decoder.decode(decrypted)) as ClonePayload;

  if (clonePayload.version !== '1.0' || clonePayload.cloneType !== 'device-keys') {
    throw new Error('Formato payload non valido');
  }

  return clonePayload;
};

export const encryptPrivateKeyForLocalStorage = async (pkcs8Base64: string, password: string) => {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const pkcs8Bytes = Uint8Array.from(atob(pkcs8Base64), c => c.charCodeAt(0));

  const encryptedBytes = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: encoder.encode('local-device-private-key') },
    aesKey,
    pkcs8Bytes
  );

  const ciphertext = new Uint8Array(encryptedBytes.slice(0, -16));
  const tag = new Uint8Array(encryptedBytes.slice(-16));

  return {
    saltBase64: btoa(String.fromCharCode(...salt)),
    iterations,
    nonceBase64: btoa(String.fromCharCode(...nonce)),
    ciphertextBase64: btoa(String.fromCharCode(...ciphertext)),
    tagBase64: btoa(String.fromCharCode(...tag)),
  };
};
