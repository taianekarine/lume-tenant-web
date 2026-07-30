import type { Department, Permission } from '../entities';
import { DEFAULT_DEPARTMENT_PERMISSIONS, EMPLOYEE_SELF_SERVICE_PERMISSIONS } from '../policies';

export interface ResolveUserPermissionsInput {
  readonly departments: readonly Department[];
}

export function resolveUserPermissions({ departments }: ResolveUserPermissionsInput): Permission[] {
  const resolvedPermissions = new Set<Permission>(EMPLOYEE_SELF_SERVICE_PERMISSIONS);
  const departmentPermissionsByCode = DEFAULT_DEPARTMENT_PERMISSIONS as Partial<
    Readonly<Record<string, readonly Permission[]>>
  >;

  for (const department of departments) {
    const departmentPermissions = departmentPermissionsByCode[department] ?? [];

    for (const permission of departmentPermissions) {
      resolvedPermissions.add(permission);
    }
  }

  return Array.from(resolvedPermissions);
}
