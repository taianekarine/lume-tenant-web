import { resolveSessionRefreshReturnTo } from './session-refresh-return-to';

describe('resolveSessionRefreshReturnTo', () => {
  it('keeps a local path and query string', () => {
    expect(resolveSessionRefreshReturnTo('/users?page=2')).toBe('/users?page=2');
  });

  it.each([
    null,
    '',
    'https://attacker.example',
    '//attacker.example/path',
    '/\\attacker.example/path',
    '/auth/refresh-session',
  ])('falls back to the dashboard for an unsafe destination: %s', (value) => {
    expect(resolveSessionRefreshReturnTo(value)).toBe('/dashboard');
  });
});
