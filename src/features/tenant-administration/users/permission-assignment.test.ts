import type { PermissionCatalog } from '../domain';
import { compatiblePermissionCodes, groupPermissionsByResource } from './permission-assignment';

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
});
