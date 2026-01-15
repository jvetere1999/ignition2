"use client";

/**
 * Lightweight E2EE helpers for string payloads.
 * AES-GCM with PBKDF2-derived key from user passphrase.
 */

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = "SHA-256";
const AES_ALGO = "AES-GCM";

export interface EncryptedPayload {
  iv: string; // base64
  salt: string; // base64
  cipher: string; // base64
  version: string;
}

export interface EncryptedBytes {
  iv: string;
  salt: string;
  cipher: ArrayBuffer;
  version: string;
}

function toBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    { name: AES_ALGO, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptString(plaintext: string, passphrase: string): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt(
    { name: AES_ALGO, iv: iv as BufferSource },
    key,
    enc.encode(plaintext)
  );
  return {
    iv: toBase64(iv.buffer),
    salt: toBase64(salt.buffer),
    cipher: toBase64(cipherBuf),
    version: "v1",
  };
}

export async function decryptString(payload: EncryptedPayload, passphrase: string): Promise<string> {
  const iv = fromBase64(payload.iv);
  const salt = fromBase64(payload.salt);
  const key = await deriveKey(passphrase, salt);
  const cipherBytes = fromBase64(payload.cipher);
  const plainBuf = await crypto.subtle.decrypt(
    { name: AES_ALGO, iv: iv as BufferSource },
    key,
    cipherBytes as BufferSource
  );
  const dec = new TextDecoder();
  return dec.decode(plainBuf);
}

export function isEncryptedPayload(data: unknown): data is EncryptedPayload {
  if (!data || typeof data !== "object") return false;
  const maybe = data as Record<string, unknown>;
  return typeof maybe.iv === "string" && typeof maybe.salt === "string" && typeof maybe.cipher === "string";
}

export async function encryptBytes(data: ArrayBuffer, passphrase: string): Promise<EncryptedBytes> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: AES_ALGO, iv: iv as BufferSource },
    key,
    data
  );
  return {
    iv: toBase64(iv.buffer),
    salt: toBase64(salt.buffer),
    cipher: cipherBuf,
    version: "v1",
  };
}

export async function decryptBytes(payload: EncryptedBytes, passphrase: string): Promise<ArrayBuffer> {
  const iv = fromBase64(payload.iv);
  const salt = fromBase64(payload.salt);
  const key = await deriveKey(passphrase, salt);
  return crypto.subtle.decrypt(
    { name: AES_ALGO, iv: iv as BufferSource },
    key,
    payload.cipher
  );
}
