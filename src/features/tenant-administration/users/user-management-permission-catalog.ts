import type { PermissionCatalog } from '../domain';

export function withoutLicenseManagement(catalog: PermissionCatalog): PermissionCatalog {
  return {
    ...catalog,
    resources: catalog.resources.filter((resource) => resource !== 'license'),
    actionsByResource: Object.fromEntries(
      Object.entries(catalog.actionsByResource).filter(([resource]) => resource !== 'license'),
    ),
    permissions: catalog.permissions.filter((permission) => !permission.startsWith('license:')),
    permissionsByDepartment: Object.fromEntries(
      Object.entries(catalog.permissionsByDepartment ?? {}).map(([department, permissions]) => [
        department,
        permissions.filter((permission) => !permission.startsWith('license:')),
      ]),
    ),
  };
}
