import { render, waitFor } from '@testing-library/react';
import colors from 'tailwindcss/colors';

import {
  ACCENT_OPTIONS,
  AccentColorPreferenceSync,
  TAILWIND_ACCENT_NAMES,
} from './accent-color-preference';

describe('accent color preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.accent;
    document.documentElement.style.removeProperty('--lume-accent-color');
  });

  it('offers every Tailwind color family that has shade 500', () => {
    const tailwindFamilies = Object.keys(colors).filter((name) => {
      const family: unknown = colors[name as keyof typeof colors];
      return typeof family === 'object' && family !== null && '500' in family;
    });

    expect(TAILWIND_ACCENT_NAMES).toEqual(tailwindFamilies);
    expect(ACCENT_OPTIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'amber', color: colors.amber[500] }),
        expect.objectContaining({ value: 'blue', color: colors.blue[500] }),
        expect.objectContaining({ value: 'rose', color: colors.rose[500] }),
      ]),
    );
  });

  it('uses amber 500 by default and restores the preference for each user', async () => {
    const first = render(<AccentColorPreferenceSync userId="user-1" />);
    await waitFor(() => expect(document.documentElement.dataset.accent).toBe('amber'));
    expect(document.documentElement.style.getPropertyValue('--lume-accent-color')).toBe(
      colors.amber[500],
    );
    first.unmount();

    window.localStorage.setItem('lume:accent-color:user-2', 'blue');
    render(<AccentColorPreferenceSync userId="user-2" />);
    await waitFor(() => expect(document.documentElement.dataset.accent).toBe('blue'));
    expect(document.documentElement.style.getPropertyValue('--lume-accent-color')).toBe(
      colors.blue[500],
    );
  });
});
