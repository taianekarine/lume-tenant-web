import type { EmployeeUser } from '../entities';
import { canAccessLicense } from './license-access';

function employee(
  permissions: EmployeeUser['permissions'],
  departments: readonly string[] = [],
): EmployeeUser {
  return {
    id: 'employee-001',
    name: 'Maria Silva',
    type: 'employee',
    departments,
    permissions,
    clientCategory: null,
    isActive: true,
  };
}

describe('license access policy', () => {
  it('allows the explicit permission within Management', () => {
    expect(canAccessLicense(employee(['license:view'], ['management']))).toBe(true);
  });

  it('requires both Management department and the explicit permission', () => {
    expect(canAccessLicense(employee(['dashboard:view'], ['management']))).toBe(false);
    expect(canAccessLicense(employee(['license:view'], ['commercial']))).toBe(false);
  });

  it('rejects inactive employees', () => {
    expect(
      canAccessLicense({ ...employee(['license:view'], ['management']), isActive: false }),
    ).toBe(false);
  });
});
