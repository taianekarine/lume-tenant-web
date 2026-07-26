import 'server-only';

import { cookies } from 'next/headers';

import type { ApiTokenStorage } from '../../application';
import { CookieApiTokenStorage } from './cookie-api-token-storage';

function getSessionSecret(): string {
  const sessionSecret = process.env.SESSION_SECRET;

  if (sessionSecret === undefined) {
    throw new Error('SESSION_SECRET is required to create the API token storage.');
  }

  return sessionSecret;
}

export async function createCookieApiTokenStorage(): Promise<ApiTokenStorage> {
  const cookieStore = await cookies();

  return new CookieApiTokenStorage(cookieStore, getSessionSecret());
}
