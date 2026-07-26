export const USER_TYPES = ['employee', 'client'] as const;

export type UserType = (typeof USER_TYPES)[number];

export const DEPARTMENTS = [
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
] as const;

export type Department = string;

export const ROLES = ['director', 'manager', 'driver'] as const;

export type Role = (typeof ROLES)[number];

export const CLIENT_CATEGORIES = ['continuous-charter', 'eventual-charter'] as const;

export type ClientCategory = (typeof CLIENT_CATEGORIES)[number];

export const PERMISSION_RESOURCES = [
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
] as const;

export type PermissionResource = string;

export const PERMISSION_ACTIONS = [
  'view',
  'create',
  'update',
  'delete',
  'manage',
  'use',
  'approve',
  'export',
] as const;

export type PermissionAction = string;

export type Permission = `${PermissionResource}:${PermissionAction}`;

interface BaseUser {
  readonly id: string;
  readonly name: string;
  readonly type: UserType;
  readonly permissions: readonly Permission[];
  readonly isActive: boolean;
}

export interface EmployeeUser extends BaseUser {
  readonly type: 'employee';
  readonly departments: readonly Department[];
  readonly roles: readonly string[];
  readonly clientCategory: null;
}

export interface ClientUser extends BaseUser {
  readonly type: 'client';
  readonly departments: readonly [];
  readonly roles: readonly [];
  readonly clientCategory: ClientCategory;
}

export type User = EmployeeUser | ClientUser;
