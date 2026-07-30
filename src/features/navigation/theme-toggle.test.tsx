import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTheme } from 'next-themes';

import { ThemeToggle } from './theme-toggle';

jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

describe('ThemeToggle', () => {
  afterEach(() => {
    mockedUseTheme.mockReset();
  });

  it('switches from light to dark mode', async () => {
    const setTheme = jest.fn();
    mockedUseTheme.mockReturnValue({ resolvedTheme: 'light', setTheme, themes: ['light', 'dark'] });
    const user = userEvent.setup();

    render(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: 'Alternar modo de cor' }));

    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('switches from dark to light mode', async () => {
    const setTheme = jest.fn();
    mockedUseTheme.mockReturnValue({ resolvedTheme: 'dark', setTheme, themes: ['light', 'dark'] });
    const user = userEvent.setup();

    render(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: 'Alternar modo de cor' }));

    expect(setTheme).toHaveBeenCalledWith('light');
  });
});
