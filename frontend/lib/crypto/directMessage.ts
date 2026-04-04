'use client';

function b64encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64decode(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

function strToArrayBuffer(s: string): ArrayBuffer {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
  return buf;
}

export async function generateEcdhKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
}

export async function exportEcdhPublicKey(publicKey: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey('spki', publicKey);
  return b64encode(spki);
}

export async function importEcdhPublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('spki', b64decode(b64), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
}

async function hkdfDerive(sharedBits: ArrayBuffer, salt: ArrayBuffer, info: string): Promise<{ key: CryptoKey; iv: ArrayBuffer }> {
  const baseKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode(info) },
    baseKey, 44 * 8
  );
  const derivedBytes = new Uint8Array(derived);
  const keyBuf = derived.slice(0, 32);
  const ivBuf = derived.slice(32, 44);
  const key = await crypto.subtle.importKey('raw', keyBuf, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return { key, iv: ivBuf };
}

export interface DmEncryptResult {
  ciphertextRecipient: string;
  ciphertextSender: string;
  ephemeralPublicKey: string;
}

export async function encryptDM(
  plaintext: string, messageId: string,
  senderStaticPublicKey: CryptoKey, recipientStaticPublicKey: CryptoKey
): Promise<DmEncryptResult> {
  const encoder = new TextEncoder();
  const salt = strToArrayBuffer(messageId);
  const info = 'arcadehub-dm-v1';

  const ephemeral = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);

  const sharedForRecipient = await crypto.subtle.deriveBits({ name: 'ECDH', public: recipientStaticPublicKey }, ephemeral.privateKey, 256);
  const { key: keyR, iv: ivR } = await hkdfDerive(sharedForRecipient, salt, info);
  const aad = encoder.encode(messageId);
  const ciphertextRecipientBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivR, additionalData: aad }, keyR, encoder.encode(plaintext));

  const sharedForSender = await crypto.subtle.deriveBits({ name: 'ECDH', public: senderStaticPublicKey }, ephemeral.privateKey, 256);
  const { key: keyS, iv: ivS } = await hkdfDerive(sharedForSender, salt, `${info}-sender`);
  const ciphertextSenderBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivS, additionalData: aad }, keyS, encoder.encode(plaintext));

  const ephemeralPubSpki = await crypto.subtle.exportKey('spki', ephemeral.publicKey);

  return {
    ciphertextRecipient: b64encode(ciphertextRecipientBuf),
    ciphertextSender: b64encode(ciphertextSenderBuf),
    ephemeralPublicKey: b64encode(ephemeralPubSpki),
  };
}

export async function decryptDMAsRecipient(
  ciphertextRecipientB64: string, ephemeralPublicKeyB64: string,
  messageId: string, recipientStaticPrivateKey: CryptoKey
): Promise<string> {
  const salt = strToArrayBuffer(messageId);
  const ephemeralPublicKey = await importEcdhPublicKey(ephemeralPublicKeyB64);
  const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: ephemeralPublicKey }, recipientStaticPrivateKey, 256);
  const { key, iv } = await hkdfDerive(sharedBits, salt, 'arcadehub-dm-v1');
  const aad = new TextEncoder().encode(messageId);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, b64decode(ciphertextRecipientB64));
  return new TextDecoder().decode(plainBuf);
}

export async function decryptDMAsSender(
  ciphertextSenderB64: string, ephemeralPublicKeyB64: string,
  messageId: string, senderStaticPrivateKey: CryptoKey
): Promise<string> {
  const salt = strToArrayBuffer(messageId);
  const ephemeralPublicKey = await importEcdhPublicKey(ephemeralPublicKeyB64);
  const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: ephemeralPublicKey }, senderStaticPrivateKey, 256);
  const { key, iv } = await hkdfDerive(sharedBits, salt, 'arcadehub-dm-v1-sender');
  const aad = new TextEncoder().encode(messageId);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, b64decode(ciphertextSenderB64));
  return new TextDecoder().decode(plainBuf);
}
