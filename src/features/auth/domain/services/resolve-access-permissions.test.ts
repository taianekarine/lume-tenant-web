import { resolveAccessPermissions } from './resolve-access-permissions';

describe('resolveAccessPermissions', () => {
  it('resolves permissions for an employee', () => {
    const permissions = resolveAccessPermissions({
      type: 'employee',
      departments: ['commercial'],
    });

    expect(permissions).toContain('dashboard:view');
    expect(permissions).toContain('commercial:view');
    expect(permissions).toContain('commercial:manage');
    expect(permissions).toContain('reports:export');
  });

  it('combines multiple departments for an employee', () => {
    const permissions = resolveAccessPermissions({
      type: 'employee',
      departments: ['commercial', 'financial'],
    });

    expect(permissions).toContain('commercial:view');
    expect(permissions).toContain('financial:view');
    expect(permissions).toContain('financial:approve');
    expect(permissions).toContain('ai-agents:use');
  });

  it('resolves permissions for a continuous charter client', () => {
    const permissions = resolveAccessPermissions({
      type: 'client',
      clientCategory: 'continuous-charter',
    });

    expect(permissions).toContain('dashboard:view');
    expect(permissions).toContain('contracts:view');
    expect(permissions).toContain('trips:view');
    expect(permissions).not.toContain('quotes:update');
  });

  it('resolves permissions for an eventual charter client', () => {
    const permissions = resolveAccessPermissions({
      type: 'client',
      clientCategory: 'eventual-charter',
    });

    expect(permissions).toContain('quotes:view');
    expect(permissions).toContain('quotes:create');
    expect(permissions).toContain('quotes:update');
    expect(permissions).toContain('support:create');
  });

  it('returns only self-service permissions for an employee without departments', () => {
    const permissions = resolveAccessPermissions({
      type: 'employee',
      departments: [],
    });

    expect(permissions).toEqual([
      'profile:view',
      'profile:update',
      'support:view',
      'support:create',
    ]);
  });

  it('does not return duplicate permissions for employees', () => {
    const permissions = resolveAccessPermissions({
      type: 'employee',
      departments: ['operations'],
    });

    expect(new Set(permissions).size).toBe(permissions.length);
  });

  it('does not return duplicate permissions for clients', () => {
    const permissions = resolveAccessPermissions({
      type: 'client',
      clientCategory: 'eventual-charter',
    });

    expect(new Set(permissions).size).toBe(permissions.length);
  });

  it('keeps internal permissions unavailable to clients', () => {
    const permissions = resolveAccessPermissions({
      type: 'client',
      clientCategory: 'continuous-charter',
    });

    expect(permissions).not.toContain('users:manage');
    expect(permissions).not.toContain('operations:manage');
    expect(permissions).not.toContain('financial:manage');
    expect(permissions).not.toContain('settings:manage');
  });
});
