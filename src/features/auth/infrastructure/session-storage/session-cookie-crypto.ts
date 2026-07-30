import { EncryptJWT, jwtDecrypt } from 'jose';

import { AUTHENTICATED_SESSION_VERSION, type AuthenticatedSession } from '../../domain';

const SESSION_TOKEN_ISSUER = 'milenium-platform-web';
const SESSION_TOKEN_AUDIENCE = 'milenium-platform-session';
const SESSION_KEY_MANAGEMENT_ALGORITHM = 'dir';
const SESSION_CONTENT_ENCRYPTION_ALGORITHM = 'A256GCM';
const MINIMUM_SESSION_SECRET_BYTES = 32;

const textEncoder = new TextEncoder();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAuthenticatedSession(value: unknown): value is AuthenticatedSession {
  if (!isRecord(value) || !isRecord(value.user)) {
    return false;
  }

  const { user } = value;
  const hasValidClientCategory =
    (user.type === 'employee' && user.clientCategory === null) ||
    (user.type === 'client' &&
      (user.clientCategory === 'continuous-charter' || user.clientCategory === 'eventual-charter'));

  return (
    value.version === AUTHENTICATED_SESSION_VERSION &&
    typeof value.id === 'string' &&
    typeof value.issuedAt === 'string' &&
    typeof value.expiresAt === 'string' &&
    typeof value.rememberDevice === 'boolean' &&
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    (user.type === 'employee' || user.type === 'client') &&
    isStringArray(user.departments) &&
    isStringArray(user.permissions) &&
    hasValidClientCategory &&
    typeof user.isActive === 'boolean'
  );
}

function sanitizeAuthenticatedSession(session: AuthenticatedSession): AuthenticatedSession {
  const sharedUser = {
    id: session.user.id,
    name: session.user.name,
    permissions: [...session.user.permissions],
    isActive: session.user.isActive,
  };

  return {
    version: session.version,
    id: session.id,
    user:
      session.user.type === 'employee'
        ? {
            ...sharedUser,
            type: 'employee',
            departments: [...session.user.departments],
            clientCategory: null,
          }
        : {
            ...sharedUser,
            type: 'client',
            departments: [],
            clientCategory: session.user.clientCategory,
          },
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
    rememberDevice: session.rememberDevice,
  };
}

function parseNumericDate(value: string, fieldName: string): number {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw new Error(`Authenticated session has an invalid ${fieldName}.`);
  }

  return Math.floor(timestamp / 1000);
}

async function deriveSessionEncryptionKey(secret: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(secret));

  return new Uint8Array(digest);
}

export function assertSessionSecret(secret: string): void {
  if (textEncoder.encode(secret).byteLength < MINIMUM_SESSION_SECRET_BYTES) {
    throw new Error(`SESSION_SECRET must contain at least ${MINIMUM_SESSION_SECRET_BYTES} bytes.`);
  }
}

export async function encryptAuthenticatedSession(
  session: AuthenticatedSession,
  secret: string,
): Promise<string> {
  assertSessionSecret(secret);

  const encryptionKey = await deriveSessionEncryptionKey(secret);
  const issuedAt = parseNumericDate(session.issuedAt, 'issuedAt');
  const expiresAt = parseNumericDate(session.expiresAt, 'expiresAt');

  return new EncryptJWT({
    session: JSON.stringify(session),
  })
    .setProtectedHeader({
      alg: SESSION_KEY_MANAGEMENT_ALGORITHM,
      enc: SESSION_CONTENT_ENCRYPTION_ALGORITHM,
    })
    .setIssuer(SESSION_TOKEN_ISSUER)
    .setAudience(SESSION_TOKEN_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .encrypt(encryptionKey);
}

export async function decryptAuthenticatedSession(
  encryptedSession: string,
  secret: string,
): Promise<AuthenticatedSession | null> {
  assertSessionSecret(secret);

  try {
    const encryptionKey = await deriveSessionEncryptionKey(secret);
    const { payload } = await jwtDecrypt(encryptedSession, encryptionKey, {
      issuer: SESSION_TOKEN_ISSUER,
      audience: SESSION_TOKEN_AUDIENCE,
      keyManagementAlgorithms: [SESSION_KEY_MANAGEMENT_ALGORITHM],
      contentEncryptionAlgorithms: [SESSION_CONTENT_ENCRYPTION_ALGORITHM],
    });

    if (typeof payload.session !== 'string') {
      return null;
    }

    const session: unknown = JSON.parse(payload.session);

    return isAuthenticatedSession(session) ? sanitizeAuthenticatedSession(session) : null;
  } catch {
    return null;
  }
}
