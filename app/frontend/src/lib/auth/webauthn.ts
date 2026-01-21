/**
 * WebAuthn helpers
 *
 * Normalizes options returned by the backend and serializes credentials into
 * JSON-safe payloads (ArrayBuffer -> base64url) for transport.
 */

type Base64String = string;

function toBase64(buffer: ArrayBuffer | null): Base64String | null {
  if (!buffer) return null;
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

export function normalizeRequestOptions(
  raw: any
): PublicKeyCredentialRequestOptions {
  const publicKey = raw?.publicKey ?? raw;
  if (!publicKey?.challenge) {
    throw new Error("Missing WebAuthn request challenge");
  }

  return {
    ...publicKey,
    challenge: fromBase64(publicKey.challenge),
    allowCredentials: publicKey.allowCredentials?.map((cred: any) => ({
      ...cred,
      id: fromBase64(typeof cred.id === "string" ? cred.id : ""),
    })),
  };
}

export function normalizeCreationOptions(
  raw: any
): PublicKeyCredentialCreationOptions {
  const publicKey = raw?.publicKey ?? raw;
  if (!publicKey?.challenge || !publicKey?.user?.id) {
    throw new Error("Missing WebAuthn registration options");
  }

  return {
    ...publicKey,
    challenge: fromBase64(publicKey.challenge),
    user: {
      ...publicKey.user,
      id:
        typeof publicKey.user.id === "string"
          ? fromBase64(publicKey.user.id)
          : publicKey.user.id,
    },
    excludeCredentials: publicKey.excludeCredentials?.map((cred: any) => ({
      ...cred,
      id: fromBase64(typeof cred.id === "string" ? cred.id : ""),
    })),
  };
}

export function serializeAssertionResponse(
  credential: PublicKeyCredential
): Record<string, unknown> {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: toBase64(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      authenticatorData: toBase64(response.authenticatorData),
      clientDataJSON: toBase64(response.clientDataJSON),
      signature: toBase64(response.signature),
      userHandle: toBase64(response.userHandle),
    },
  };
}

export function serializeAttestationResponse(
  credential: PublicKeyCredential
): Record<string, unknown> {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: toBase64(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      attestationObject: toBase64(response.attestationObject),
      clientDataJSON: toBase64(response.clientDataJSON),
    },
  };
}
