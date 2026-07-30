import 'server-only';

import type { Department } from '../domain';
import { normalizeLoginIdentifier } from '../lib/login-identifier';

export const SIMULATED_USER_PASSWORD = 'Milenium@2026';

interface SimulatedUserBase {
  readonly id: string;
  readonly name: string;
  readonly identifier: string;
  readonly password: string;
  readonly isActive: boolean;
}

export interface SimulatedEmployeeUser extends SimulatedUserBase {
  readonly type: 'employee';
  readonly departments: readonly Department[];
}

export type SimulatedUser = SimulatedEmployeeUser;

export const SIMULATED_EMPLOYEE_USERS: readonly SimulatedEmployeeUser[] = [
  {
    id: 'simulated-human-resources',
    name: 'Usuário de Recursos Humanos',
    identifier: 'rh.teste',
    password: SIMULATED_USER_PASSWORD,
    type: 'employee',
    departments: ['human-resources'],
    isActive: true,
  },
  {
    id: 'simulated-personnel-department',
    name: 'Usuário de Departamento Pessoal',
    identifier: 'dp.teste',
    password: SIMULATED_USER_PASSWORD,
    type: 'employee',
    departments: ['personnel-department'],
    isActive: true,
  },
  {
    id: 'simulated-commercial',
    name: 'Usuário Comercial',
    identifier: 'comercial.teste',
    password: SIMULATED_USER_PASSWORD,
    type: 'employee',
    departments: ['commercial'],
    isActive: true,
  },
  {
    id: 'simulated-purchasing',
    name: 'Usuário de Compras',
    identifier: 'compras.teste',
    password: SIMULATED_USER_PASSWORD,
    type: 'employee',
    departments: ['purchasing'],
    isActive: true,
  },
  {
    id: 'simulated-controlling',
    name: 'Usuário de Controladoria',
    identifier: 'controladoria.teste',
    password: SIMULATED_USER_PASSWORD,
    type: 'employee',
    departments: ['controllership'],
    isActive: true,
  },
  {
    id: 'simulated-maintenance',
    name: 'Usuário de Manutenção',
    identifier: 'manutencao.teste',
    password: SIMULATED_USER_PASSWORD,
    type: 'employee',
    departments: ['maintenance'],
    isActive: true,
  },
  {
    id: 'simulated-monitoring',
    name: 'Usuário de Monitoramento',
    identifier: 'monitoramento.teste',
    password: SIMULATED_USER_PASSWORD,
    type: 'employee',
    departments: ['monitoring'],
    isActive: true,
  },
  {
    id: 'simulated-management',
    name: 'Usuário de Gerência',
    identifier: 'gerencia.departamento.teste',
    password: SIMULATED_USER_PASSWORD,
    type: 'employee',
    departments: ['management'],
    isActive: true,
  },
  {
    id: 'simulated-operations',
    name: 'Usuário de Operações',
    identifier: 'operacoes.teste',
    password: SIMULATED_USER_PASSWORD,
    type: 'employee',
    departments: ['operations'],
    isActive: true,
  },
  {
    id: 'simulated-cleaning',
    name: 'Usuário de Limpeza',
    identifier: 'limpeza.teste',
    password: SIMULATED_USER_PASSWORD,
    type: 'employee',
    departments: ['cleaning'],
    isActive: true,
  },
  {
    id: 'simulated-financial',
    name: 'Usuário Financeiro',
    identifier: 'financeiro.teste',
    password: SIMULATED_USER_PASSWORD,
    type: 'employee',
    departments: ['financial'],
    isActive: true,
  },
  {
    id: 'simulated-information-technology',
    name: 'Usuário de Tecnologia da Informação',
    identifier: 'ti.teste',
    password: SIMULATED_USER_PASSWORD,
    type: 'employee',
    departments: ['information-technology'],
    isActive: true,
  },
];

export const SIMULATED_USERS: readonly SimulatedUser[] = SIMULATED_EMPLOYEE_USERS;

function normalizeIdentifierForLookup(identifier: string): string {
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);

  if (normalizedIdentifier.type === 'username') {
    return normalizedIdentifier.value.toLocaleLowerCase('pt-BR');
  }

  return normalizedIdentifier.value;
}

export function findSimulatedUserByCredentials(
  identifier: string,
  password: string,
): SimulatedUser | null {
  const normalizedIdentifier = normalizeIdentifierForLookup(identifier);

  return (
    SIMULATED_USERS.find(
      (user) =>
        normalizeIdentifierForLookup(user.identifier) === normalizedIdentifier &&
        user.password === password,
    ) ?? null
  );
}
