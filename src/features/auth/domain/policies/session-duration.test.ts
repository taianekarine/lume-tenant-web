import {
  DEFAULT_SESSION_DURATION_HOURS,
  DEFAULT_SESSION_DURATION_MS,
  REMEMBERED_SESSION_DURATION_DAYS,
  REMEMBERED_SESSION_DURATION_MS,
} from './session-duration';

describe('session duration policies', () => {
  it('defines the default session duration as eight hours', () => {
    expect(DEFAULT_SESSION_DURATION_HOURS).toBe(8);
  });

  it('defines the remembered session duration as thirty days', () => {
    expect(REMEMBERED_SESSION_DURATION_DAYS).toBe(30);
  });

  it('calculates the default session duration in milliseconds', () => {
    const expectedDuration = 8 * 60 * 60 * 1_000;

    expect(DEFAULT_SESSION_DURATION_MS).toBe(expectedDuration);
  });

  it('calculates the remembered session duration in milliseconds', () => {
    const expectedDuration = 30 * 24 * 60 * 60 * 1_000;

    expect(REMEMBERED_SESSION_DURATION_MS).toBe(expectedDuration);
  });

  it('keeps the remembered session longer than the default session', () => {
    expect(REMEMBERED_SESSION_DURATION_MS).toBeGreaterThan(DEFAULT_SESSION_DURATION_MS);
  });

  it('represents exactly thirty default-length days when remembered', () => {
    const millisecondsPerDay = 24 * 60 * 60 * 1_000;

    expect(REMEMBERED_SESSION_DURATION_MS / millisecondsPerDay).toBe(30);
  });
});
