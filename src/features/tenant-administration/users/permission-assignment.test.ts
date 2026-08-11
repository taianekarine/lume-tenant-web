import type { PermissionCatalog } from '../domain';
import { compatiblePermissionCodes, groupPermissionsByResource } from './permission-assignment';
import { withoutLicenseManagement } from './user-management-permission-catalog';

const catalog: PermissionCatalog = {
  resources: ['dashboard', 'commercial', 'users'],
  actions: ['view', 'manage'],
  actionsByResource: {
    dashboard: ['view'],
    commercial: ['view'],
    users: ['manage'],
  },
  permissions: ['dashboard:view', 'commercial:view', 'users:manage'],
  permissionsByDepartment: {
    commercial: ['dashboard:view', 'commercial:view'],
    management: ['dashboard:view', 'users:manage'],
  },
  implicitPermissions: ['dashboard:view'],
};

describe('permission assignment', () => {
  it('uses the department ceiling published by the Tenant API', () => {
    expect(compatiblePermissionCodes(catalog, ['commercial'])).toEqual(['commercial:view']);
    expect(compatiblePermissionCodes(catalog, ['management'])).toEqual(['users:manage']);
  });

  it('groups permission codes without depending on a closed frontend enum', () => {
    expect([...groupPermissionsByResource(['future:review', 'dashboard:view'])]).toEqual([
      ['dashboard', ['dashboard:view']],
      ['future', ['future:review']],
    ]);
  });

  it('removes every license capability from the catalog shown to non-admin TI', () => {
    const catalogWithLicense: PermissionCatalog = {
      ...catalog,
      resources: [...catalog.resources, 'license'],
      actionsByResource: {
        ...catalog.actionsByResource,
        license: ['view', 'manage'],
      },
      permissions: [...catalog.permissions, 'license:view', 'license:manage'],
      permissionsByDepartment: {
        ...catalog.permissionsByDepartment,
        'information-technology': ['users:manage', 'license:view'],
      },
    };

    expect(withoutLicenseManagement(catalogWithLicense)).toEqual(
      expect.objectContaining({
        resources: ['dashboard', 'commercial', 'users'],
        permissions: ['dashboard:view', 'commercial:view', 'users:manage'],
        permissionsByDepartment: expect.objectContaining({
          'information-technology': ['users:manage'],
        }),
      }),
    );
  });
});
