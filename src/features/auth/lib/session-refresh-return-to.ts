const DEFAULT_SESSION_REFRESH_RETURN_TO = '/dashboard';
const RETURN_TO_VALIDATION_ORIGIN = 'https://tenant-web.local';
const SESSION_REFRESH_PATH = '/auth/refresh-session';

export function resolveSessionRefreshReturnTo(value: string | null): string {
  if (value === null || !value.startsWith('/')) {
    return DEFAULT_SESSION_REFRESH_RETURN_TO;
  }

  try {
    const url = new URL(value, RETURN_TO_VALIDATION_ORIGIN);

    if (url.origin !== RETURN_TO_VALIDATION_ORIGIN || url.pathname === SESSION_REFRESH_PATH) {
      return DEFAULT_SESSION_REFRESH_RETURN_TO;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_SESSION_REFRESH_RETURN_TO;
  }
}
