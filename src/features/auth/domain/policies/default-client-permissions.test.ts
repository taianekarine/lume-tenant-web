import { CLIENT_CATEGORIES, type ClientCategory, type Permission } from '../entities';
import { DEFAULT_CLIENT_PERMISSIONS } from './default-client-permissions';

describe('default client permission policies', () => {
  it('defines permissions for every client category', () => {
    const configuredCategories = Object.keys(DEFAULT_CLIENT_PERMISSIONS) as ClientCategory[];

    expect(configuredCategories).toEqual(CLIENT_CATEGORIES);
  });

  it('provides dashboard access to every client category', () => {
    for (const category of CLIENT_CATEGORIES) {
      expect(DEFAULT_CLIENT_PERMISSIONS[category]).toContain('dashboard:view');
    }
  });

  it('provides profile access to every client category', () => {
    for (const category of CLIENT_CATEGORIES) {
      const permissions = DEFAULT_CLIENT_PERMISSIONS[category];

      expect(permissions).toContain('profile:view');
      expect(permissions).toContain('profile:update');
    }
  });

  it('provides access to contracts and trips', () => {
    for (const category of CLIENT_CATEGORIES) {
      const permissions = DEFAULT_CLIENT_PERMISSIONS[category];

      expect(permissions).toContain('contracts:view');
      expect(permissions).toContain('trips:view');
    }
  });

  it('allows every client category to request quotes', () => {
    for (const category of CLIENT_CATEGORIES) {
      const permissions = DEFAULT_CLIENT_PERMISSIONS[category];

      expect(permissions).toContain('quotes:view');
      expect(permissions).toContain('quotes:create');
    }
  });

  it('allows eventual charter clients to update quote requests', () => {
    const permissions = DEFAULT_CLIENT_PERMISSIONS['eventual-charter'];

    expect(permissions).toContain('quotes:update');
  });

  it('does not allow continuous charter clients to update quote requests by default', () => {
    const permissions = DEFAULT_CLIENT_PERMISSIONS['continuous-charter'];

    expect(permissions).not.toContain('quotes:update');
  });

  it('provides access to documents and invoices', () => {
    for (const category of CLIENT_CATEGORIES) {
      const permissions = DEFAULT_CLIENT_PERMISSIONS[category];

      expect(permissions).toContain('documents:view');
      expect(permissions).toContain('invoices:view');
    }
  });

  it('allows every client category to create service requests', () => {
    for (const category of CLIENT_CATEGORIES) {
      const permissions = DEFAULT_CLIENT_PERMISSIONS[category];

      expect(permissions).toContain('service-requests:view');
      expect(permissions).toContain('service-requests:create');
    }
  });

  it('allows every client category to request support', () => {
    for (const category of CLIENT_CATEGORIES) {
      const permissions = DEFAULT_CLIENT_PERMISSIONS[category];

      expect(permissions).toContain('support:view');
      expect(permissions).toContain('support:create');
    }
  });

  it('does not provide internal administration permissions to clients', () => {
    for (const category of CLIENT_CATEGORIES) {
      const permissions = DEFAULT_CLIENT_PERMISSIONS[category];

      expect(permissions).not.toContain('users:manage');
      expect(permissions).not.toContain('financial:manage');
      expect(permissions).not.toContain('operations:manage');
      expect(permissions).not.toContain('settings:manage');
      expect(permissions).not.toContain('whatsapp-conversations:manage');
    }
  });

  it('does not define duplicate permissions inside client categories', () => {
    for (const category of CLIENT_CATEGORIES) {
      const permissions = DEFAULT_CLIENT_PERMISSIONS[category];

      const uniquePermissions = new Set<Permission>(permissions);

      expect(uniquePermissions.size).toBe(permissions.length);
    }
  });
});
