import type { ClientCategory, Department, Permission, Role } from '../entities';
import { resolveClientPermissions } from './resolve-client-permissions';
import { resolveUserPermissions } from './resolve-user-permissions';

export interface ResolveEmployeeAccessPermissionsInput {
  readonly type: 'employee';
  readonly departments: readonly Department[];
  readonly roles: readonly Role[];
}

export interface ResolveClientAccessPermissionsInput {
  readonly type: 'client';
  readonly clientCategory: ClientCategory;
}

export type ResolveAccessPermissionsInput =
  ResolveEmployeeAccessPermissionsInput | ResolveClientAccessPermissionsInput;

export function resolveAccessPermissions(input: ResolveAccessPermissionsInput): Permission[] {
  if (input.type === 'client') {
    return resolveClientPermissions(input.clientCategory);
  }

  return resolveUserPermissions({
    departments: input.departments,
    roles: input.roles,
  });
}
