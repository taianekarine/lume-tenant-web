import { resolveUserPermissions } from './resolve-user-permissions';

describe('resolveUserPermissions', () => {
  it('returns the permissions of a single department', () => {
    const permissions = resolveUserPermissions({
      departments: ['commercial'],
      roles: [],
    });

    expect(permissions).toContain('dashboard:view');
    expect(permissions).toContain('commercial:view');
    expect(permissions).toContain('commercial:manage');
    expect(permissions).toContain('clients:view');
  });

  it('returns the permissions of a single role', () => {
    const permissions = resolveUserPermissions({
      departments: [],
      roles: ['manager'],
    });

    expect(permissions).toContain('dashboard:view');
    expect(permissions).toContain('ai-agents:use');
    expect(permissions).toContain('reports:view');
    expect(permissions).toContain('reports:export');
  });

  it('combines department and role permissions', () => {
    const permissions = resolveUserPermissions({
      departments: ['commercial'],
      roles: ['manager'],
    });

    expect(permissions).toContain('commercial:view');
    expect(permissions).toContain('commercial:manage');
    expect(permissions).toContain('ai-agents:use');
    expect(permissions).toContain('reports:export');
  });

  it('combines permissions from multiple departments', () => {
    const permissions = resolveUserPermissions({
      departments: ['commercial', 'financial'],
      roles: [],
    });

    expect(permissions).toContain('commercial:view');
    expect(permissions).toContain('clients:view');
    expect(permissions).toContain('financial:view');
    expect(permissions).toContain('financial:approve');
  });

  it('combines permissions from multiple roles', () => {
    const permissions = resolveUserPermissions({
      departments: [],
      roles: ['manager', 'driver'],
    });

    expect(permissions).toContain('reports:export');
    expect(permissions).toContain('drivers:view');
    expect(permissions).toContain('operations:view');
  });

  it('removes duplicate permissions', () => {
    const permissions = resolveUserPermissions({
      departments: ['commercial'],
      roles: ['manager'],
    });

    const uniquePermissions = new Set(permissions);

    expect(uniquePermissions.size).toBe(permissions.length);
    expect(permissions.filter((permission) => permission === 'dashboard:view')).toHaveLength(1);
  });

  it('returns an empty list when no departments or roles are provided', () => {
    const permissions = resolveUserPermissions({
      departments: [],
      roles: [],
    });

    expect(permissions).toEqual([]);
  });

  it('provides broad access when the user is a director', () => {
    const permissions = resolveUserPermissions({
      departments: [],
      roles: ['director'],
    });

    expect(permissions).toContain('human-resources:view');
    expect(permissions).toContain('commercial:view');
    expect(permissions).toContain('operations:view');
    expect(permissions).toContain('financial:view');
    expect(permissions).toContain('financial:approve');
  });

  it('combines the operational department with the driver role', () => {
    const permissions = resolveUserPermissions({
      departments: ['operations'],
      roles: ['driver'],
    });

    expect(permissions).toContain('operations:manage');
    expect(permissions).toContain('monitoring:view');
    expect(permissions).toContain('maintenance:view');
    expect(permissions).toContain('drivers:view');
  });
});
