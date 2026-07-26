/** @jest-environment node */

import {
  AUTHENTICATED_SESSION_VERSION,
  type AuthenticatedSession,
  type Permission,
} from '../../domain';
import {
  CookieSessionStorage,
  getSessionCookieChunkName,
  MAX_SESSION_COOKIE_CHUNKS,
  SESSION_COOKIE_CHUNK_SIZE,
  SESSION_COOKIE_NAME,
  type SessionCookieOptions,
  type SessionCookieStore,
} from './cookie-session-storage';

const SESSION_SECRET = 'test-session-secret-with-more-than-thirty-two-bytes';

interface StoredCookie {
  readonly name: string;
  readonly options: SessionCookieOptions;
  readonly value: string;
}

class MemorySessionCookieStore implements SessionCookieStore {
  private readonly cookies = new Map<string, string>();

  lastSetCookie: StoredCookie | null = null;

  get(name: string): { readonly value: string } | undefined {
    const value = this.cookies.get(name);

    return value === undefined ? undefined : { value };
  }

  set(name: string, value: string, options: SessionCookieOptions): void {
    this.cookies.set(name, value);
    this.lastSetCookie = { name, options, value };
  }

  delete(name: string): void {
    this.cookies.delete(name);
  }

  setRaw(name: string, value: string): void {
    this.cookies.set(name, value);
  }

  names(): string[] {
    return Array.from(this.cookies.keys());
  }
}

function createValidSession(): AuthenticatedSession {
  const issuedAt = new Date(Date.now() - 60_000);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  return {
    version: AUTHENTICATED_SESSION_VERSION,
    id: 'session-employee-001',
    user: {
      id: 'employee-001',
      name: 'Maria',
      type: 'employee',
      departments: ['commercial'],
      roles: ['manager'],
      permissions: ['dashboard:view', 'commercial:view'],
      clientCategory: null,
      isActive: true,
    },
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    rememberDevice: false,
  };
}

function createLargeSession(): AuthenticatedSession {
  return {
    ...createValidSession(),
    user: {
      ...createValidSession().user,
      permissions: Array.from(
        { length: 180 },
        (_, index) => `future-operational-module-${index}:manage` as Permission,
      ),
    },
  };
}

describe('CookieSessionStorage', () => {
  it('stores an encrypted session using secure cookie options', async () => {
    const cookieStore = new MemorySessionCookieStore();
    const sessionStorage = new CookieSessionStorage(cookieStore, SESSION_SECRET, { secure: true });
    const session = createValidSession();

    await sessionStorage.save(session);

    expect(cookieStore.lastSetCookie).toEqual({
      name: SESSION_COOKIE_NAME,
      options: {
        expires: new Date(session.expiresAt),
        httpOnly: true,
        path: '/',
        priority: 'high',
        sameSite: 'lax',
        secure: true,
      },
      value: expect.any(String),
    });
    expect(cookieStore.lastSetCookie?.value).not.toContain(session.id);
    expect(cookieStore.lastSetCookie?.value).not.toContain(session.user.name);
  });

  it('decrypts and returns the stored authenticated session', async () => {
    const cookieStore = new MemorySessionCookieStore();
    const sessionStorage = new CookieSessionStorage(cookieStore, SESSION_SECRET);
    const session = createValidSession();

    await sessionStorage.save(session);

    await expect(sessionStorage.get()).resolves.toEqual(session);
  });

  it('splits a large encrypted session into browser-safe cookie chunks', async () => {
    const cookieStore = new MemorySessionCookieStore();
    const sessionStorage = new CookieSessionStorage(cookieStore, SESSION_SECRET);
    const session = createLargeSession();

    await sessionStorage.save(session);

    expect(cookieStore.get(SESSION_COOKIE_NAME)?.value.length).toBeLessThanOrEqual(
      SESSION_COOKIE_CHUNK_SIZE,
    );
    expect(cookieStore.get(getSessionCookieChunkName(SESSION_COOKIE_NAME, 1))).toBeDefined();
    expect(cookieStore.names().length).toBeGreaterThan(1);
    await expect(sessionStorage.get()).resolves.toEqual(session);
  });

  it('returns null when the session cookie does not exist', async () => {
    const sessionStorage = new CookieSessionStorage(new MemorySessionCookieStore(), SESSION_SECRET);

    await expect(sessionStorage.get()).resolves.toBeNull();
  });

  it('rejects a tampered session cookie', async () => {
    const cookieStore = new MemorySessionCookieStore();
    const sessionStorage = new CookieSessionStorage(cookieStore, SESSION_SECRET);

    await sessionStorage.save(createValidSession());

    const encryptedSession = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (encryptedSession === undefined) {
      throw new Error('Expected the session cookie to be stored.');
    }

    const tokenParts = encryptedSession.split('.');
    const ciphertext = tokenParts[3];

    if (tokenParts.length !== 5 || ciphertext === undefined) {
      throw new Error('Expected a compact JWE session token.');
    }

    const replacement = ciphertext.startsWith('a') ? 'b' : 'a';
    tokenParts[3] = `${replacement}${ciphertext.slice(1)}`;

    cookieStore.setRaw(SESSION_COOKIE_NAME, tokenParts.join('.'));

    await expect(sessionStorage.get()).resolves.toBeNull();
  });

  it('removes the session cookie', async () => {
    const cookieStore = new MemorySessionCookieStore();
    const sessionStorage = new CookieSessionStorage(cookieStore, SESSION_SECRET);

    await sessionStorage.save(createValidSession());
    await sessionStorage.remove();

    for (let index = 0; index < MAX_SESSION_COOKIE_CHUNKS; index += 1) {
      expect(
        cookieStore.get(getSessionCookieChunkName(SESSION_COOKIE_NAME, index)),
      ).toBeUndefined();
    }
  });

  it('rejects secrets shorter than thirty-two bytes', () => {
    expect(() => new CookieSessionStorage(new MemorySessionCookieStore(), 'short-secret')).toThrow(
      'SESSION_SECRET must contain at least 32 bytes.',
    );
  });

  it('rejects sessions with an invalid expiration date', async () => {
    const sessionStorage = new CookieSessionStorage(new MemorySessionCookieStore(), SESSION_SECRET);
    const invalidSession: AuthenticatedSession = {
      ...createValidSession(),
      expiresAt: 'invalid-date',
    };

    await expect(sessionStorage.save(invalidSession)).rejects.toThrow(
      'Cannot save an authenticated session with an invalid expiration date.',
    );
  });
});
