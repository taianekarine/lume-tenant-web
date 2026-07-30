/** @jest-environment node */

import { AuthenticationGatewayError, type AuthenticationGateway } from '../application';
import { createTenantApiAuthenticationGateway } from '../infrastructure';
import { completePasswordChangeAction } from './login-action';

jest.mock('../infrastructure', () => ({
  createCookieApiTokenStorage: jest.fn(),
  createCookieSessionStorage: jest.fn(),
  createTenantApiAuthenticationGateway: jest.fn(),
}));

const mockedCreateGateway = jest.mocked(createTenantApiAuthenticationGateway);

function gateway(): jest.Mocked<AuthenticationGateway> {
  return {
    authenticate: jest.fn(),
    getCurrentIdentity: jest.fn(),
    requestPasswordReset: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    completePasswordChange: jest.fn().mockResolvedValue(undefined),
  };
}

describe('completePasswordChangeAction', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('validates the password before creating infrastructure', async () => {
    await expect(
      completePasswordChangeAction({
        token: '',
        newPassword: 'curta',
      }),
    ).resolves.toMatchObject({
      success: false,
      errorCode: 'VALIDATION_ERROR',
    });
    expect(mockedCreateGateway).not.toHaveBeenCalled();
  });

  it('preserves the stable API error code', async () => {
    const authenticationGateway = gateway();
    authenticationGateway.completePasswordChange.mockRejectedValue(
      new AuthenticationGatewayError(
        'invalid-password-change-token',
        'O link expirou.',
        'INVALID_PASSWORD_CHANGE_TOKEN',
      ),
    );
    mockedCreateGateway.mockReturnValue(authenticationGateway);

    await expect(
      completePasswordChangeAction({
        token: 'expired-token',
        newPassword: 'SenhaNova@2026',
      }),
    ).resolves.toEqual({
      success: false,
      message: 'O link expirou. Solicite um novo link ou contate o administrador.',
      errorCode: 'INVALID_PASSWORD_CHANGE_TOKEN',
    });
  });

  it('returns a deterministic code for an unexpected failure', async () => {
    const authenticationGateway = gateway();
    authenticationGateway.completePasswordChange.mockRejectedValue(new Error('unexpected'));
    mockedCreateGateway.mockReturnValue(authenticationGateway);

    await expect(
      completePasswordChangeAction({
        token: 'valid-token',
        newPassword: 'SenhaNova@2026',
      }),
    ).resolves.toMatchObject({
      success: false,
      errorCode: 'UNEXPECTED_ERROR',
    });
  });
});
