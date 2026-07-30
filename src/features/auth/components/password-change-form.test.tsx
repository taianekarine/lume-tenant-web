import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { completePasswordChangeAction } from '../actions/login-action';
import { PasswordChangeForm } from './password-change-form';

jest.mock('../actions/login-action', () => ({
  completePasswordChangeAction: jest.fn(),
}));

const mockedCompletePasswordChange = jest.mocked(completePasswordChangeAction);

describe('PasswordChangeForm', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows a deterministic code for browser validation failures', async () => {
    const user = userEvent.setup();
    render(<PasswordChangeForm token="valid-reset-token" />);

    await user.click(screen.getByRole('button', { name: 'Criar nova senha' }));

    expect(await screen.findByText('Código do erro: VALIDATION_ERROR')).toBeInTheDocument();
    expect(mockedCompletePasswordChange).not.toHaveBeenCalled();
  });

  it('shows the stable API code returned by the password reset action', async () => {
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

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O link para criar a senha é inválido ou expirou.',
    );
    expect(screen.getByText('Código do erro: INVALID_PASSWORD_CHANGE_TOKEN')).toBeInTheDocument();
  });
});
