import { NextResponse } from 'next/server';

import { API_TOKEN_COOKIE_NAME } from '@/features/auth/infrastructure/api-token-storage';
import { SESSION_COOKIE_NAMES } from '@/features/auth/infrastructure/session-storage';

export function GET(): NextResponse {
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: '/login' },
  });

  response.headers.set('Cache-Control', 'no-store');
  SESSION_COOKIE_NAMES.forEach((cookieName) => response.cookies.delete(cookieName));
  response.cookies.delete(API_TOKEN_COOKIE_NAME);

  return response;
}
