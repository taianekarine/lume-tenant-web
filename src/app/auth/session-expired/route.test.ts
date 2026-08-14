/** @jest-environment node */

import { API_TOKEN_COOKIE_NAME } from '@/features/auth/infrastructure/api-token-storage';
import { SESSION_COOKIE_NAMES } from '@/features/auth/infrastructure/session-storage';

import { GET } from './route';

describe('GET /auth/session-expired', () => {
  it('clears both local authentication cookies before redirecting to login', () => {
    const response = GET();

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/login');
    SESSION_COOKIE_NAMES.forEach((cookieName) => {
      expect(response.cookies.get(cookieName)?.value).toBe('');
    });
    expect(response.cookies.get(API_TOKEN_COOKIE_NAME)?.value).toBe('');
  });
});
