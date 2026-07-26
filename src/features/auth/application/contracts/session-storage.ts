import type { AuthenticatedSession } from '../../domain/entities';

export interface SessionStorage {
  save(session: AuthenticatedSession): Promise<void>;

  get(): Promise<AuthenticatedSession | null>;

  remove(): Promise<void>;
}
