import { EncryptJWT, jwtDecrypt } from 'jose';

import type { ApiAuthenticationTokens } from '../../application';
import { assertSessionSecret } from '../session-storage/session-cookie-crypto';

const TOKEN_COOKIE_ISSUER = 'milenium-platform-web';
const TOKEN_COOKIE_AUDIENCE = 'tenant-api-credentials';
const KEY_MANAGEMENT_ALGORITHM = 'dir';
const CONTENT_ENCRYPTION_ALGORITHM = 'A256GCM';

const textEncoder = new TextEncoder();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isApiAuthenticationTokens(value: unknown): value is ApiAuthenticationTokens {
  return (
    isRecord(value) &&
    typeof value.accessToken === 'string' &&
    value.accessToken.length > 0 &&
    typeof value.refreshToken === 'string' &&
    value.refreshToken.length >= 40 &&
    isIsoDate(value.accessTokenExpiresAt) &&
    isIsoDate(value.refreshTokenExpiresAt)
  );
}

async function deriveEncryptionKey(secret: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(secret));

  return new Uint8Array(digest);
}

export async function encryptApiAuthenticationTokens(
  tokens: ApiAuthenticationTokens,
  secret: string,
): Promise<string> {
  assertSessionSecret(secret);

  const encryptionKey = await deriveEncryptionKey(secret);
  const expirationTime = Math.floor(Date.parse(tokens.refreshTokenExpiresAt) / 1_000);

  if (!Number.isFinite(expirationTime)) {
    throw new Error('Cannot encrypt API tokens with an invalid expiration date.');
  }

  return new EncryptJWT({
    tokens: JSON.stringify(tokens),
  })
    .setProtectedHeader({
      alg: KEY_MANAGEMENT_ALGORITHM,
      enc: CONTENT_ENCRYPTION_ALGORITHM,
    })
    .setIssuer(TOKEN_COOKIE_ISSUER)
    .setAudience(TOKEN_COOKIE_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .encrypt(encryptionKey);
}

export async function decryptApiAuthenticationTokens(
  encryptedTokens: string,
  secret: string,
): Promise<ApiAuthenticationTokens | null> {
  assertSessionSecret(secret);

  try {
    const encryptionKey = await deriveEncryptionKey(secret);
    const { payload } = await jwtDecrypt(encryptedTokens, encryptionKey, {
      issuer: TOKEN_COOKIE_ISSUER,
      audience: TOKEN_COOKIE_AUDIENCE,
      keyManagementAlgorithms: [KEY_MANAGEMENT_ALGORITHM],
      contentEncryptionAlgorithms: [CONTENT_ENCRYPTION_ALGORITHM],
    });

    if (typeof payload.tokens !== 'string') {
      return null;
    }

    const tokens: unknown = JSON.parse(payload.tokens);

    return isApiAuthenticationTokens(tokens) ? tokens : null;
  } catch {
    return null;
  }
}
