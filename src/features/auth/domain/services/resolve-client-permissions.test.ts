import { DEFAULT_CLIENT_PERMISSIONS } from '../policies';
import { resolveClientPermissions } from './resolve-client-permissions';

describe('resolveClientPermissions', () => {
  it('returns the permissions for continuous charter clients', () => {
    const permissions = resolveClientPermissions('continuous-charter');

    expect(permissions).toContain('dashboard:view');
    expect(permissions).toContain('contracts:view');
    expect(permissions).toContain('trips:view');
    expect(permissions).toContain('service-requests:create');
    expect(permissions).not.toContain('quotes:update');
  });

  it('returns the permissions for eventual charter clients', () => {
    const permissions = resolveClientPermissions('eventual-charter');

    expect(permissions).toContain('dashboard:view');
    expect(permissions).toContain('quotes:view');
    expect(permissions).toContain('quotes:create');
    expect(permissions).toContain('quotes:update');
    expect(permissions).toContain('support:create');
  });

  it('returns every configured permission for the selected category', () => {
    const continuousPermissions = resolveClientPermissions('continuous-charter');

    const eventualPermissions = resolveClientPermissions('eventual-charter');

    expect(continuousPermissions).toEqual(DEFAULT_CLIENT_PERMISSIONS['continuous-charter']);

    expect(eventualPermissions).toEqual(DEFAULT_CLIENT_PERMISSIONS['eventual-charter']);
  });

  it('returns a new list instead of exposing the original policy array', () => {
    const permissions = resolveClientPermissions('continuous-charter');

    expect(permissions).not.toBe(DEFAULT_CLIENT_PERMISSIONS['continuous-charter']);
  });

  it('does not return duplicate permissions', () => {
    const continuousPermissions = resolveClientPermissions('continuous-charter');

    const eventualPermissions = resolveClientPermissions('eventual-charter');

    expect(new Set(continuousPermissions).size).toBe(continuousPermissions.length);

    expect(new Set(eventualPermissions).size).toBe(eventualPermissions.length);
  });
});
