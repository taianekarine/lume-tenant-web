import { DEPARTMENTS, ROLES, type Department, type Permission, type Role } from '../entities';
import { DEFAULT_DEPARTMENT_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from './default-permissions';

describe('default permission policies', () => {
  it('defines permissions for every department', () => {
    const configuredDepartments = Object.keys(DEFAULT_DEPARTMENT_PERMISSIONS) as Department[];

    expect(configuredDepartments).toEqual(DEPARTMENTS);
  });

  it('defines permissions for every organizational role', () => {
    const configuredRoles = Object.keys(DEFAULT_ROLE_PERMISSIONS) as Role[];

    expect(configuredRoles).toEqual(ROLES);
  });

  it('provides dashboard access to every department', () => {
    for (const department of DEPARTMENTS) {
      expect(DEFAULT_DEPARTMENT_PERMISSIONS[department]).toContain('dashboard:view');
    }
  });

  it('provides dashboard access to every role', () => {
    for (const role of ROLES) {
      expect(DEFAULT_ROLE_PERMISSIONS[role]).toContain('dashboard:view');
    }
  });

  it('does not define duplicate permissions inside departments', () => {
    for (const department of DEPARTMENTS) {
      const permissions = DEFAULT_DEPARTMENT_PERMISSIONS[department];

      const uniquePermissions = new Set<Permission>(permissions);

      expect(uniquePermissions.size).toBe(permissions.length);
    }
  });

  it('does not define duplicate permissions inside roles', () => {
    for (const role of ROLES) {
      const permissions = DEFAULT_ROLE_PERMISSIONS[role];

      const uniquePermissions = new Set<Permission>(permissions);

      expect(uniquePermissions.size).toBe(permissions.length);
    }
  });

  it('provides technical administration permissions to information technology', () => {
    const permissions = DEFAULT_DEPARTMENT_PERMISSIONS['information-technology'];

    expect(permissions).toContain('users:manage');
    expect(permissions).toContain('ai-agents:manage');
    expect(permissions).toContain('settings:manage');
  });

  it('provides broad organizational visibility to directors', () => {
    const permissions = DEFAULT_ROLE_PERMISSIONS.director;

    expect(permissions).toContain('human-resources:view');
    expect(permissions).toContain('commercial:view');
    expect(permissions).toContain('operations:view');
    expect(permissions).toContain('financial:view');
  });

  it('keeps manager permissions independent from a specific department', () => {
    const permissions = DEFAULT_ROLE_PERMISSIONS.manager;

    expect(permissions).toContain('reports:view');
    expect(permissions).toContain('reports:export');
    expect(permissions).toContain('whatsapp-conversations:manage');
    expect(permissions).not.toContain('commercial:manage');
    expect(permissions).not.toContain('financial:manage');
  });

  it('limits WhatsApp conversation management to commercial leadership', () => {
    expect(DEFAULT_DEPARTMENT_PERMISSIONS.commercial).toContain('whatsapp-conversations:manage');
    expect(DEFAULT_ROLE_PERMISSIONS.manager).toContain('whatsapp-conversations:manage');
    expect(DEFAULT_ROLE_PERMISSIONS.director).toContain('whatsapp-conversations:manage');
    expect(DEFAULT_ROLE_PERMISSIONS.driver).not.toContain('whatsapp-conversations:manage');
    expect(DEFAULT_DEPARTMENT_PERMISSIONS.operations).not.toContain(
      'whatsapp-conversations:manage',
    );
  });

  it('limits driver permissions to operational resources', () => {
    const permissions = DEFAULT_ROLE_PERMISSIONS.driver;

    expect(permissions).toContain('drivers:view');
    expect(permissions).toContain('operations:view');
    expect(permissions).not.toContain('financial:view');
    expect(permissions).not.toContain('users:manage');
  });

  it('provides department-specific access to the financial department', () => {
    const permissions = DEFAULT_DEPARTMENT_PERMISSIONS.financial;

    expect(permissions).toContain('financial:view');
    expect(permissions).toContain('financial:manage');
    expect(permissions).toContain('financial:approve');
    expect(permissions).toContain('financial:export');
  });

  it('provides operational integration permissions to maintenance and monitoring', () => {
    expect(DEFAULT_DEPARTMENT_PERMISSIONS.maintenance).toContain('operations:view');

    expect(DEFAULT_DEPARTMENT_PERMISSIONS.monitoring).toContain('operations:view');

    expect(DEFAULT_DEPARTMENT_PERMISSIONS.operations).toContain('monitoring:view');

    expect(DEFAULT_DEPARTMENT_PERMISSIONS.operations).toContain('maintenance:view');
  });
});
