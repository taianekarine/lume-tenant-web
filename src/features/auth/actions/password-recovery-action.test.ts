/** @jest-environment node */

import { AuthenticationGatewayError, type AuthenticationGateway } from '../application';
import { createTenantApiAuthenticationGateway } from '../infrastructure';
import { PASSWORD_RECOVERY_CONFIRMATION } from '../lib/password-recovery-messages';
import { requestPasswordResetAction } from './password-recovery-action';

jest.mock('../infrastructure', () => ({
  createTenantApiAuthenticationGateway: jest.fn(),
}));

const mockedCreateGateway = jest.mocked(createTenantApiAuthenticationGateway);

function gateway(): jest.Mocked<AuthenticationGateway> {
  return {
    authenticate: jest.fn(),
    getCurrentIdentity: jest.fn(),
    requestPasswordReset: jest.fn().mockResolvedValue(undefined),
    refresh: jest.fn(),
    logout: jest.fn(),
    completePasswordChange: jest.fn(),
  };
}

describe('requestPasswordResetAction', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('validates before creating infrastructure', async () => {
    await expect(requestPasswordResetAction({ identifier: '' })).resolves.toEqual({
      success: false,
      message: 'Informe seu usuário ou e-mail.',
      errorCode: 'VALIDATION_ERROR',
    });
    expect(mockedCreateGateway).not.toHaveBeenCalled();
  });

  it('normalizes the identifier and returns a non-enumerable confirmation', async () => {
    const authenticationGateway = gateway();
    mockedCreateGateway.mockReturnValue(authenticationGateway);

    await expect(requestPasswordResetAction({ identifier: '  taiane.karine  ' })).resolves.toEqual({
      success: true,
      message: PASSWORD_RECOVERY_CONFIRMATION,
    });
    expect(authenticationGateway.requestPasswordReset).toHaveBeenCalledWith('taiane.karine');
  });

  it('does not reveal whether an account exists', async () => {
    const authenticationGateway = gateway();
    authenticationGateway.requestPasswordReset.mockRejectedValue(
      new AuthenticationGatewayError('invalid-credentials', 'Conta inexistente'),
    );
    mockedCreateGateway.mockReturnValue(authenticationGateway);

    await expect(requestPasswordResetAction({ identifier: 'conta.inexistente' })).resolves.toEqual({
      success: true,
      message: PASSWORD_RECOVERY_CONFIRMATION,
    });
  });

  it('reports a service outage without exposing infrastructure details', async () => {
    const authenticationGateway = gateway();
    authenticationGateway.requestPasswordReset.mockRejectedValue(
      new AuthenticationGatewayError('service-unavailable', 'ECONNREFUSED'),
    );
    mockedCreateGateway.mockReturnValue(authenticationGateway);

    const result = await requestPasswordResetAction({ identifier: 'taiane.karine' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('contate o administrador');
    expect(result.message).not.toContain('ECONNREFUSED');
    expect(result).toMatchObject({ errorCode: 'SERVICE_UNAVAILABLE' });
  });

  it('reports an unexpected failure with a deterministic code', async () => {
    const authenticationGateway = gateway();
    authenticationGateway.requestPasswordReset.mockRejectedValue(new Error('unexpected'));
    mockedCreateGateway.mockReturnValue(authenticationGateway);

    await expect(
      requestPasswordResetAction({ identifier: 'taiane.karine' }),
    ).resolves.toMatchObject({
      success: false,
      errorCode: 'UNEXPECTED_ERROR',
    });
  });
});
