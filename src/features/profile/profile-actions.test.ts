import { TenantAdministrationError } from '@/features/tenant-administration/application';
import { executeAuthenticatedTenantMutation } from '@/features/tenant-administration/server';

import { updateProfilePictureAction } from './profile-actions';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/features/auth/infrastructure', () => ({
  createCookieApiTokenStorage: jest.fn(),
  createCookieSessionStorage: jest.fn(),
}));

jest.mock('@/features/tenant-administration/server', () => ({
  executeAuthenticatedTenantMutation: jest.fn(),
}));

describe('profile actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('propagates the public API error code without exposing internal details', async () => {
    jest
      .mocked(executeAuthenticatedTenantMutation)
      .mockRejectedValueOnce(
        new TenantAdministrationError(
          'validation',
          'A imagem informada não foi aceita.',
          'VALIDATION_ERROR',
        ),
      );

    await expect(
      updateProfilePictureAction({ dataUrl: 'data:image/png;base64,AQID' }),
    ).resolves.toEqual({
      success: false,
      message: 'A imagem informada não foi aceita.',
      errorCode: 'VALIDATION_ERROR',
    });
  });

  it('uses a stable validation code for invalid client input', async () => {
    await expect(updateProfilePictureAction({ dataUrl: 'not-an-image' })).resolves.toMatchObject({
      success: false,
      errorCode: 'VALIDATION_ERROR',
    });

    expect(executeAuthenticatedTenantMutation).not.toHaveBeenCalled();
  });
});
