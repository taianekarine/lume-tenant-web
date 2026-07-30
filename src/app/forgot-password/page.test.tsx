/** @jest-environment node */

import { redirect } from 'next/navigation';

import { ForgotPasswordPage } from '@/features/auth/pages/forgot-password-page';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';

import ForgotPasswordRoute from './page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));
jest.mock('@/features/auth/server', () => ({
  getCurrentAuthenticatedSession: jest.fn(),
}));

const mockedSession = jest.mocked(getCurrentAuthenticatedSession);
const mockedRedirect = jest.mocked(redirect);

describe('forgot password route', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the public recovery flow without a session', async () => {
    mockedSession.mockResolvedValue(null);

    const page = await ForgotPasswordRoute();

    expect(page.type).toBe(ForgotPasswordPage);
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it('redirects an authenticated user', async () => {
    mockedSession.mockResolvedValue({} as never);
    mockedRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });

    await expect(ForgotPasswordRoute()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockedRedirect).toHaveBeenCalledWith('/dashboard');
  });
});
