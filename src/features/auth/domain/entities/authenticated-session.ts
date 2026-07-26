import type { User } from './user';

export const AUTHENTICATED_SESSION_VERSION = 1 as const;

export interface AuthenticatedSession {
  readonly version: typeof AUTHENTICATED_SESSION_VERSION;
  readonly id: string;
  readonly user: User;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly rememberDevice: boolean;
}
