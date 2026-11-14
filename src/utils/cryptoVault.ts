// Pure Web Crypto API AES-256-GCM encryption + RFC 6238 TOTP 2FA utilities

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function getCrypto(): Crypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto;
  }
  throw new Error('Web Crypto API is not available in this environment.');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export interface EncryptedEnvelope {
  cipherTextB64: string;
  ivB64: string;
  saltB64: string;
  alg: 'AES-GCM-256';
}

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const cryptoObj = getCrypto();
  const enc = new TextEncoder();
  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 120000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptVaultPayload(
  plaintext: string,
  passphrase: string
): Promise<EncryptedEnvelope> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Vault passphrase must be at least 4 characters.');
  }
  const cryptoObj = getCrypto();
  const salt = cryptoObj.getRandomValues(new Uint8Array(16));
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encoded as unknown as BufferSource
  );

  return {
    cipherTextB64: bytesToBase64(new Uint8Array(cipherBuffer)),
    ivB64: bytesToBase64(iv),
    saltB64: bytesToBase64(salt),
    alg: 'AES-GCM-256',
  };
}

export async function decryptVaultPayload(
  envelope: EncryptedEnvelope,
  passphrase: string
): Promise<string> {
  const cryptoObj = getCrypto();
  const salt = base64ToBytes(envelope.saltB64);
  const iv = base64ToBytes(envelope.ivB64);
  const cipherBytes = base64ToBytes(envelope.cipherTextB64);
  const key = await deriveAesKey(passphrase, salt);

  const plainBuffer = await cryptoObj.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    cipherBytes as unknown as BufferSource
  );
  return new TextDecoder().decode(plainBuffer);
}

export function generateBase32Secret(byteLength = 20): string {
  const cryptoObj = getCrypto();
  const bytes = cryptoObj.getRandomValues(new Uint8Array(byteLength));
  let secret = '';
  let buffer = 0;
  let bitsLeft = 0;

  for (let i = 0; i < bytes.length; i += 1) {
    buffer = (buffer << 8) | bytes[i];
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      const idx = (buffer >> (bitsLeft - 5)) & 31;
      bitsLeft -= 5;
      secret += BASE32_ALPHABET[idx];
    }
  }
  if (bitsLeft > 0) {
    const idx = (buffer << (5 - bitsLeft)) & 31;
    secret += BASE32_ALPHABET[idx];
  }
  return secret;
}

export function base32ToBytes(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let buffer = 0;
  let bitsLeft = 0;
  const output: number[] = [];

  for (let i = 0; i < clean.length; i += 1) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      output.push((buffer >> (bitsLeft - 8)) & 0xff);
      bitsLeft -= 8;
    }
  }
  return new Uint8Array(output);
}

export function buildTotpUri(secret: string, accountLabel: string, issuer = 'TabiGuide'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedLabel = encodeURIComponent(`${issuer}:${accountLabel}`);
  return `otpauth://totp/${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

export async function generateTotpCode(
  secret: string,
  timestampMs = Date.now(),
  stepSeconds = 30
): Promise<string> {
  const cryptoObj = getCrypto();
  const keyBytes = base32ToBytes(secret);
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);

  const counterBytes = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i -= 1) {
    counterBytes[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  const hmacKey = await cryptoObj.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const sig = new Uint8Array(
    await cryptoObj.subtle.sign('HMAC', hmacKey, counterBytes as unknown as BufferSource)
  );

  const offset = sig[sig.length - 1] & 0x0f;
  const binary =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);

  const otp = binary % 1_000_000;
  return otp.toString().padStart(6, '0');
}

export async function verifyTotpCode(
  secret: string,
  candidateCode: string,
  timestampMs = Date.now(),
  windowSteps = 1
): Promise<boolean> {
  const normalized = candidateCode.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;

  for (let offset = -windowSteps; offset <= windowSteps; offset += 1) {
    const checkTime = timestampMs + offset * 30_000;
    const expected = await generateTotpCode(secret, checkTime, 30);
    if (expected === normalized) return true;
  }
  return false;
}
