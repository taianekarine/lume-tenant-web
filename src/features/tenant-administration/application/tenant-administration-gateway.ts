import type {
  CreateTenantRoleInput,
  CreateTenantUserInput,
  LocalLicenseStatus,
  PermissionCatalog,
  TenantRole,
  TenantUser,
  TenantUserList,
  UpdateTenantRoleInput,
  UpdateTenantUserInput,
} from '../domain';

export type TenantAdministrationErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'not-found'
  | 'invalid-response'
  | 'service-unavailable';

export class TenantAdministrationError extends Error {
  constructor(
    readonly code: TenantAdministrationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'TenantAdministrationError';
  }
}

export interface TenantAdministrationGateway {
  listUsers(query?: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<TenantUserList>;
  getUser(userId: string): Promise<TenantUser>;
  createUser(input: CreateTenantUserInput): Promise<TenantUser>;
  updateUser(userId: string, input: UpdateTenantUserInput): Promise<TenantUser>;
  listRoles(): Promise<readonly TenantRole[]>;
  createRole(input: CreateTenantRoleInput): Promise<TenantRole>;
  updateRole(roleId: string, input: UpdateTenantRoleInput): Promise<TenantRole>;
  deleteRole(roleId: string): Promise<void>;
  listPermissions(): Promise<PermissionCatalog>;
  getLicenseStatus(): Promise<LocalLicenseStatus>;
}
