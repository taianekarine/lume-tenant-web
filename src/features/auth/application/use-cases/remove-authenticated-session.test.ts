import type { SessionStorage } from '../contracts';
import { removeAuthenticatedSession } from './remove-authenticated-session';

describe('removeAuthenticatedSession', () => {
  it('delegates session removal to the storage contract', async () => {
    const remove = jest
      .fn<ReturnType<SessionStorage['remove']>, Parameters<SessionStorage['remove']>>()
      .mockResolvedValue(undefined);

    await expect(removeAuthenticatedSession({ remove })).resolves.toBeUndefined();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
