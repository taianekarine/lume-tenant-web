import { resolveUserPermissions } from './resolve-user-permissions';

describe('resolveUserPermissions', () => {
  it('returns the permissions of a single department', () => {
    const permissions = resolveUserPermissions({
      departments: ['commercial'],
    });

    expect(permissions).toContain('dashboard:view');
    expect(permissions).toContain('commercial:view');
    expect(permissions).toContain('commercial:manage');
    expect(permissions).toContain('clients:view');
  });

  it('combines permissions from multiple departments', () => {
    const permissions = resolveUserPermissions({
      departments: ['commercial', 'financial'],
    });

    expect(permissions).toContain('commercial:view');
    expect(permissions).toContain('clients:view');
    expect(permissions).toContain('financial:view');
    expect(permissions).toContain('financial:approve');
  });

  it('removes duplicate permissions', () => {
    const permissions = resolveUserPermissions({
      departments: ['commercial', 'financial'],
    });

    const uniquePermissions = new Set(permissions);

    expect(uniquePermissions.size).toBe(permissions.length);
    expect(permissions.filter((permission) => permission === 'dashboard:view')).toHaveLength(1);
  });

  it('always grants the employee self-service area and support', () => {
    const permissions = resolveUserPermissions({
      departments: [],
    });

    expect(permissions).toEqual([
      'profile:view',
      'profile:update',
      'support:view',
      'support:create',
    ]);
  });

  it('combines operational permissions with direct user permissions', () => {
    const permissions = resolveUserPermissions({
      departments: ['operations'],
    });

    expect(permissions).toContain('operations:manage');
    expect(permissions).toContain('monitoring:view');
    expect(permissions).toContain('maintenance:view');
    expect(permissions).toContain('drivers:view');
  });
});
