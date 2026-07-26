/** @jest-environment node */

import { cookies } from 'next/headers';

import { CookieApiTokenStorage } from './cookie-api-token-storage';
import { createCookieApiTokenStorage } from './create-cookie-api-token-storage';

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

const SESSION_SECRET = 'test-session-secret-with-more-than-thirty-two-bytes';
const originalSessionSecret = process.env.SESSION_SECRET;
const mockedCookies = jest.mocked(cookies);

describe('createCookieApiTokenStorage', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = SESSION_SECRET;
    mockedCookies.mockResolvedValue({
      delete: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);
  });

  afterEach(() => {
    mockedCookies.mockReset();

    if (originalSessionSecret === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = originalSessionSecret;
    }
  });

  it('creates the token adapter with the Next.js cookie store', async () => {
    await expect(createCookieApiTokenStorage()).resolves.toBeInstanceOf(CookieApiTokenStorage);

    expect(mockedCookies).toHaveBeenCalledTimes(1);
  });

  it('rejects creation when SESSION_SECRET is missing', async () => {
    delete process.env.SESSION_SECRET;

    await expect(createCookieApiTokenStorage()).rejects.toThrow(
      'SESSION_SECRET is required to create the API token storage.',
    );
  });
});
