import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { completePasswordChangeAction } from '../actions/login-action';
import { PasswordChangeForm } from './password-change-form';

const toastAdd = jest.fn();

jest.mock('@/shared/ui/toast', () => ({
  toast: { add: (...args: unknown[]) => toastAdd(...args) },
}));

jest.mock('../actions/login-action', () => ({
  completePasswordChangeAction: jest.fn(),
}));

const mockedCompletePasswordChange = jest.mocked(completePasswordChangeAction);

describe('PasswordChangeForm', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows browser validation failures without exposing an internal code', async () => {
    const user = userEvent.setup();
    render(<PasswordChangeForm token="valid-reset-token" />);

    await user.click(screen.getByRole('button', { name: 'Criar nova senha' }));

    await waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          description: 'Revise os campos destacados e tente novamente.',
        }),
      ),
    );
    expect(mockedCompletePasswordChange).not.toHaveBeenCalled();
  });

  it('shows the password reset failure in a toast', async () => {
    const user = userEvent.setup();
    mockedCompletePasswordChange.mockResolvedValue({
      success: false,
      message: 'O link para criar a senha é inválido ou expirou.',
      errorCode: 'INVALID_PASSWORD_CHANGE_TOKEN',
    });
    render(<PasswordChangeForm token="expired-reset-token" />);

    await user.type(screen.getByLabelText('Nova senha'), 'SenhaNova@2026');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'SenhaNova@2026');
    await user.click(screen.getByRole('button', { name: 'Criar nova senha' }));

    await waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          description: 'O link para criar a senha é inválido ou expirou.',
        }),
      ),
    );
    expect(screen.queryByText(/Código do erro/)).not.toBeInTheDocument();
  });
});
