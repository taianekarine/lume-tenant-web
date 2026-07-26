import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { logoutAction } from '../actions/logout-action';
import { LogoutButton } from './logout-button';

jest.mock('../actions/logout-action', () => ({
  logoutAction: jest.fn(),
}));

const mockedLogoutAction = jest.mocked(logoutAction);

describe('LogoutButton', () => {
  afterEach(() => {
    mockedLogoutAction.mockReset();
  });

  it('renders the action to end the current session', () => {
    render(<LogoutButton />);

    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });

  it('shows a safe message when logout fails', async () => {
    const user = userEvent.setup();

    mockedLogoutAction.mockResolvedValue({
      message: 'Não foi possível encerrar sua sessão. Tente novamente.',
    });

    render(<LogoutButton />);

    await user.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível encerrar sua sessão. Tente novamente.',
    );
  });
});
