import {
  AUTHENTICATED_SESSION_VERSION,
  type AuthenticatedSession,
  type ClientCategory,
  type Department,
  type Role,
  type User,
} from '../entities';
import { DEFAULT_SESSION_DURATION_MS, REMEMBERED_SESSION_DURATION_MS } from '../policies';
import { resolveAccessPermissions } from './resolve-access-permissions';

interface CreateAuthenticatedSessionBaseInput {
  readonly sessionId: string;
  readonly userId: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly rememberDevice: boolean;
  readonly issuedAt?: Date;
}

export interface CreateEmployeeAuthenticatedSessionInput extends CreateAuthenticatedSessionBaseInput {
  readonly type: 'employee';
  readonly departments: readonly Department[];
  readonly roles: readonly Role[];
}

export interface CreateClientAuthenticatedSessionInput extends CreateAuthenticatedSessionBaseInput {
  readonly type: 'client';
  readonly clientCategory: ClientCategory;
}

export type CreateAuthenticatedSessionInput =
  CreateEmployeeAuthenticatedSessionInput | CreateClientAuthenticatedSessionInput;

function calculateExpirationDate(issuedAt: Date, rememberDevice: boolean): Date {
  const duration = rememberDevice ? REMEMBERED_SESSION_DURATION_MS : DEFAULT_SESSION_DURATION_MS;

  return new Date(issuedAt.getTime() + duration);
}

function createUser(input: CreateAuthenticatedSessionInput): User {
  if (input.type === 'client') {
    return {
      id: input.userId,
      name: input.name,
      type: 'client',
      departments: [],
      roles: [],
      permissions: resolveAccessPermissions({
        type: 'client',
        clientCategory: input.clientCategory,
      }),
      clientCategory: input.clientCategory,
      isActive: input.isActive,
    };
  }

  return {
    id: input.userId,
    name: input.name,
    type: 'employee',
    departments: input.departments,
    roles: input.roles,
    permissions: resolveAccessPermissions({
      type: 'employee',
      departments: input.departments,
      roles: input.roles,
    }),
    clientCategory: null,
    isActive: input.isActive,
  };
}

export function createAuthenticatedSession(
  input: CreateAuthenticatedSessionInput,
): AuthenticatedSession {
  const issuedAt = input.issuedAt ?? new Date();
  const expiresAt = calculateExpirationDate(issuedAt, input.rememberDevice);

  return {
    version: AUTHENTICATED_SESSION_VERSION,
    id: input.sessionId,
    user: createUser(input),
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    rememberDevice: input.rememberDevice,
  };
}
