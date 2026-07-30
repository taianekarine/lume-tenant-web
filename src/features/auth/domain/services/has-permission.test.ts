import type { ClientUser, EmployeeUser } from '../entities';
import { hasPermission } from './has-permission';

describe('hasPermission', () => {
  const activeEmployee: EmployeeUser = {
    id: 'employee-001',
    name: 'Maria',
    type: 'employee',
    departments: ['commercial'],
    permissions: ['dashboard:view', 'commercial:view', 'commercial:manage'],
    clientCategory: null,
    isActive: true,
  };

  it('returns true when an active user has the requested permission', () => {
    const result = hasPermission(activeEmployee, 'commercial:view');

    expect(result).toBe(true);
  });

  it('returns false when an active user does not have the requested permission', () => {
    const result = hasPermission(activeEmployee, 'financial:view');

    expect(result).toBe(false);
  });

  it('returns false when an inactive user has the requested permission', () => {
    const inactiveEmployee: EmployeeUser = {
      ...activeEmployee,
      isActive: false,
    };

    const result = hasPermission(inactiveEmployee, 'commercial:view');

    expect(result).toBe(false);
  });

  it('checks client permissions using the same authorization rule', () => {
    const client: ClientUser = {
      id: 'client-001',
      name: 'Empresa Exemplo',
      type: 'client',
      departments: [],
      permissions: ['dashboard:view', 'clients:view'],
      clientCategory: 'continuous-charter',
      isActive: true,
    };

    expect(hasPermission(client, 'clients:view')).toBe(true);
    expect(hasPermission(client, 'financial:view')).toBe(false);
  });
});
