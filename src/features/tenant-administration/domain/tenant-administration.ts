export interface TenantUser {
  readonly id: string;
  readonly name: string;
  readonly username: string;
  readonly email: string;
  readonly cpf: string | null;
  readonly departments: readonly string[];
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TenantUserList {
  readonly data: readonly TenantUser[];
  readonly meta: {
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

export interface TenantRole {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly permissions: readonly string[];
  readonly isSystem: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PermissionCatalog {
  readonly resources: readonly string[];
  readonly actions: readonly string[];
  readonly actionsByResource: Readonly<Record<string, readonly string[]>>;
  readonly permissions: readonly string[];
}

export interface LocalLicenseStatus {
  readonly state: 'active' | 'grace';
  readonly tenantId: string;
  readonly installationId: string;
  readonly plan: string;
  readonly features: readonly string[];
  readonly expiresAt: string;
  readonly graceUntil: string;
}

export interface CreateTenantUserInput {
  readonly name: string;
  readonly username: string;
  readonly email: string;
  readonly cpf?: string;
  readonly password: string;
  readonly departments: readonly string[];
  readonly roleIds: readonly string[];
}

export interface UpdateTenantUserInput {
  readonly name?: string;
  readonly email?: string;
  readonly cpf?: string | null;
  readonly departments?: readonly string[];
  readonly roleIds?: readonly string[];
  readonly isActive?: boolean;
}

export interface CreateTenantRoleInput {
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly permissions: readonly string[];
}

export interface UpdateTenantRoleInput {
  readonly code?: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly permissions?: readonly string[];
}

export const TENANT_DEPARTMENTS = [
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

export const TENANT_DEPARTMENT_LABELS: Readonly<Record<string, string>> = {
  'human-resources': 'Recursos Humanos',
  'personnel-department': 'Departamento Pessoal',
  commercial: 'Comercial',
  purchasing: 'Compras',
  maintenance: 'Manutenção',
  monitoring: 'Monitoramento',
  operations: 'Operações',
  cleaning: 'Limpeza',
  financial: 'Financeiro',
  'information-technology': 'Tecnologia da Informação',
};
