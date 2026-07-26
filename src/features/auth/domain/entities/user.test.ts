import {
  CLIENT_CATEGORIES,
  DEPARTMENTS,
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCES,
  ROLES,
  USER_TYPES,
  type ClientUser,
  type Department,
  type EmployeeUser,
  type Permission,
  type Role,
  type User,
  type UserType,
} from './user';

describe('user authorization contracts', () => {
  it('defines the supported user types', () => {
    expect(USER_TYPES).toEqual(['employee', 'client']);
  });

  it('defines all internal departments', () => {
    expect(DEPARTMENTS).toEqual([
      'human-resources',
      'personnel-department',
      'commercial',
      'purchasing',
      'maintenance',
      'monitoring',
      'operations',
      'cleaning',
      'financial',
      'information-technology',
    ]);
  });

  it('defines organizational roles separately from departments', () => {
    expect(ROLES).toEqual(['director', 'manager', 'driver']);
  });

  it('defines the supported client categories', () => {
    expect(CLIENT_CATEGORIES).toEqual(['continuous-charter', 'eventual-charter']);
  });

  it('defines resources that can receive permissions', () => {
    expect(PERMISSION_RESOURCES).toEqual([
      'dashboard',
      'users',
      'human-resources',
      'personnel-department',
      'commercial',
      'purchasing',
      'maintenance',
      'monitoring',
      'operations',
      'cleaning',
      'drivers',
      'financial',
      'clients',
      'ai-agents',
      'whatsapp-conversations',
      'manuals',
      'reports',
      'settings',
      'profile',
      'contracts',
      'quotes',
      'trips',
      'documents',
      'invoices',
      'service-requests',
      'support',
    ]);
  });

  it('defines the supported permission actions', () => {
    expect(PERMISSION_ACTIONS).toEqual([
      'view',
      'create',
      'update',
      'delete',
      'manage',
      'use',
      'approve',
      'export',
    ]);
  });

  it('accepts a valid employee user', () => {
    const employee: EmployeeUser = {
      id: 'employee-001',
      name: 'Maria',
      type: 'employee',
      departments: ['commercial'],
      roles: ['manager'],
      permissions: ['dashboard:view', 'commercial:view', 'commercial:manage'],
      clientCategory: null,
      isActive: true,
    };

    expect(employee.type).toBe('employee');
    expect(employee.departments).toContain('commercial');
    expect(employee.roles).toContain('manager');
    expect(employee.clientCategory).toBeNull();
  });

  it('accepts a valid client user', () => {
    const client: ClientUser = {
      id: 'client-001',
      name: 'Empresa Exemplo',
      type: 'client',
      departments: [],
      roles: [],
      permissions: ['dashboard:view', 'profile:view', 'contracts:view', 'trips:view'],
      clientCategory: 'continuous-charter',
      isActive: true,
    };

    expect(client.type).toBe('client');
    expect(client.departments).toEqual([]);
    expect(client.roles).toEqual([]);
    expect(client.clientCategory).toBe('continuous-charter');
  });

  it('distinguishes employees from clients through the user type', () => {
    const users: User[] = [
      {
        id: 'employee-001',
        name: 'João',
        type: 'employee',
        departments: ['operations'],
        roles: ['driver'],
        permissions: ['operations:view', 'drivers:view'],
        clientCategory: null,
        isActive: true,
      },
      {
        id: 'client-001',
        name: 'Cliente Eventual',
        type: 'client',
        departments: [],
        roles: [],
        permissions: ['dashboard:view', 'quotes:create', 'service-requests:create'],
        clientCategory: 'eventual-charter',
        isActive: true,
      },
    ];

    const employee = users.find((user) => user.type === 'employee');
    const client = users.find((user) => user.type === 'client');

    expect(employee?.departments).toEqual(['operations']);
    expect(client?.clientCategory).toBe('eventual-charter');
  });

  it('accepts values from the derived union types', () => {
    const userType: UserType = 'employee';
    const department: Department = 'human-resources';
    const role: Role = 'director';

    expect(userType).toBe('employee');
    expect(department).toBe('human-resources');
    expect(role).toBe('director');
  });

  it('accepts permissions using the resource and action format', () => {
    const employeePermission: Permission = 'financial:view';
    const clientPermission: Permission = 'contracts:view';

    expect(employeePermission).toBe('financial:view');
    expect(clientPermission).toBe('contracts:view');
  });
});
