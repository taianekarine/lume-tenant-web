import { createAuthenticatedSession, DEPARTMENTS, resolveAccessPermissions } from '../domain';
import {
  findSimulatedUserByCredentials,
  SIMULATED_EMPLOYEE_USERS,
  SIMULATED_USER_PASSWORD,
  SIMULATED_USERS,
} from './simulated-users';

describe('simulated users', () => {
  it('defines exactly one test employee for every department', () => {
    const configuredDepartments = SIMULATED_EMPLOYEE_USERS.flatMap((user) => user.departments);

    for (const department of DEPARTMENTS) {
      expect(
        configuredDepartments.filter((configuredDepartment) => configuredDepartment === department),
      ).toHaveLength(1);
    }
  });

  it('uses the real permission policies for every department profile', () => {
    for (const user of SIMULATED_EMPLOYEE_USERS) {
      const session = createAuthenticatedSession({
        sessionId: `session-${user.id}`,
        userId: user.id,
        name: user.name,
        type: 'employee',
        departments: user.departments,
        isActive: user.isActive,
        rememberDevice: false,
      });

      expect(session.user.permissions).toEqual(
        resolveAccessPermissions({
          type: 'employee',
          departments: user.departments,
        }),
      );
      expect(session.user.permissions).toContain('dashboard:view');
    }
  });

  it('keeps external client profiles out of simulated authentication', () => {
    expect(SIMULATED_USERS.every((user) => user.type === 'employee')).toBe(true);
  });

  it('grants WhatsApp conversation access only to the intended simulated profiles', () => {
    const canManageWhatsApp = (identifier: string) => {
      const user = SIMULATED_EMPLOYEE_USERS.find(
        (candidate) => candidate.identifier === identifier,
      );

      if (user === undefined) {
        return false;
      }

      return resolveAccessPermissions({
        type: 'employee',
        departments: user.departments,
      }).includes('whatsapp-conversations:manage');
    };

    expect(canManageWhatsApp('comercial.teste')).toBe(true);
    expect(canManageWhatsApp('gerencia.departamento.teste')).toBe(false);
    expect(canManageWhatsApp('operacoes.teste')).toBe(false);
    expect(canManageWhatsApp('ti.teste')).toBe(false);
  });

  it.each(SIMULATED_USERS)('finds $identifier only with its configured password', (user) => {
    expect(findSimulatedUserByCredentials(user.identifier, SIMULATED_USER_PASSWORD)).toEqual(user);
    expect(findSimulatedUserByCredentials(user.identifier, 'senha-incorreta')).toBeNull();
  });

  it('matches usernames without depending on letter case', () => {
    expect(findSimulatedUserByCredentials('RH.TESTE', SIMULATED_USER_PASSWORD)).toEqual(
      SIMULATED_EMPLOYEE_USERS[0],
    );
  });
});
