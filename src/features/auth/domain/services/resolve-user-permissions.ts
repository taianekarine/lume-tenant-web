import type { Department, Permission, Role } from '../entities';
import { DEFAULT_DEPARTMENT_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../policies';

export interface ResolveUserPermissionsInput {
  readonly departments: readonly Department[];
  readonly roles: readonly Role[];
}

export function resolveUserPermissions({
  departments,
  roles,
}: ResolveUserPermissionsInput): Permission[] {
  const resolvedPermissions = new Set<Permission>();
  const departmentPermissionsByCode = DEFAULT_DEPARTMENT_PERMISSIONS as Partial<
    Readonly<Record<string, readonly Permission[]>>
  >;

  for (const department of departments) {
    const departmentPermissions = departmentPermissionsByCode[department] ?? [];

    for (const permission of departmentPermissions) {
      resolvedPermissions.add(permission);
    }
  }

  for (const role of roles) {
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role];

    for (const permission of rolePermissions) {
      resolvedPermissions.add(permission);
    }
  }

  return Array.from(resolvedPermissions);
}
