import 'server-only';

import { cookies } from 'next/headers';

import type { SessionStorage } from '../../application';
import { CookieSessionStorage } from './cookie-session-storage';

function getSessionSecret(): string {
  const sessionSecret = process.env.SESSION_SECRET;

  if (sessionSecret === undefined) {
    throw new Error('SESSION_SECRET is required to create the session storage.');
  }

  return sessionSecret;
}

export async function createCookieSessionStorage(): Promise<SessionStorage> {
  const cookieStore = await cookies();

  return new CookieSessionStorage(cookieStore, getSessionSecret());
}
