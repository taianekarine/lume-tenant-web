import { DEPARTMENTS, type Department, type Permission } from '../entities';
import { DEFAULT_DEPARTMENT_PERMISSIONS } from './default-permissions';

describe('default permission policies', () => {
  it('defines permissions for every department', () => {
    const configuredDepartments = Object.keys(DEFAULT_DEPARTMENT_PERMISSIONS) as Department[];

    expect(DEPARTMENTS.every((department) => configuredDepartments.includes(department))).toBe(
      true,
    );
    expect(DEFAULT_DEPARTMENT_PERMISSIONS.controllership).toEqual(
      DEFAULT_DEPARTMENT_PERMISSIONS.controlling,
    );
  });

  it('provides dashboard access to every department', () => {
    for (const department of DEPARTMENTS) {
      expect(DEFAULT_DEPARTMENT_PERMISSIONS[department]).toContain('dashboard:view');
    }
  });

  it('does not define duplicate permissions inside departments', () => {
    for (const department of DEPARTMENTS) {
      const permissions = DEFAULT_DEPARTMENT_PERMISSIONS[department];
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

  it('limits WhatsApp conversation management to the commercial department', () => {
    expect(DEFAULT_DEPARTMENT_PERMISSIONS.commercial).toContain('whatsapp-conversations:manage');
    expect(DEFAULT_DEPARTMENT_PERMISSIONS.operations).not.toContain(
      'whatsapp-conversations:manage',
    );
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
