import type { ClientCategory, Department, Permission } from '../entities';
import { resolveClientPermissions } from './resolve-client-permissions';
import { resolveUserPermissions } from './resolve-user-permissions';

export interface ResolveEmployeeAccessPermissionsInput {
  readonly type: 'employee';
  readonly departments: readonly Department[];
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
  });
}
