import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { requestPasswordResetAction } from '../actions/password-recovery-action';
import { PASSWORD_RECOVERY_CONFIRMATION } from '../lib/password-recovery-messages';
import { ForgotPasswordPage } from './forgot-password-page';

jest.mock('../actions/password-recovery-action', () => ({
  requestPasswordResetAction: jest.fn(),
}));

const mockedRequestPasswordReset = jest.mocked(requestPasswordResetAction);

describe('ForgotPasswordPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('submits an identifier and shows the generic confirmation', async () => {
    const user = userEvent.setup();
    mockedRequestPasswordReset.mockResolvedValue({
      success: true,
      message: PASSWORD_RECOVERY_CONFIRMATION,
    });
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText('Usuário ou e-mail'), 'taiane@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar instruções' }));

    expect(mockedRequestPasswordReset).toHaveBeenCalledWith({
      identifier: 'taiane@example.com',
    });
    expect(await screen.findByRole('status')).toHaveTextContent(PASSWORD_RECOVERY_CONFIRMATION);
    expect(screen.getByRole('button', { name: 'Voltar para o login' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('validates the identifier in the browser', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.click(screen.getByRole('button', { name: 'Enviar instruções' }));

    expect(await screen.findByText('Informe seu usuário ou e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Código do erro: VALIDATION_ERROR')).toBeInTheDocument();
    expect(mockedRequestPasswordReset).not.toHaveBeenCalled();
  });

  it('shows the stable API error code beside the friendly failure message', async () => {
    const user = userEvent.setup();
    mockedRequestPasswordReset.mockResolvedValue({
      success: false,
      message: 'Muitas solicitações foram realizadas. Tente novamente.',
      errorCode: 'TOO_MANY_REQUESTS',
    });
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText('Usuário ou e-mail'), 'taiane@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar instruções' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Muitas solicitações foram realizadas. Tente novamente.',
    );
    expect(screen.getByText('Código do erro: TOO_MANY_REQUESTS')).toBeInTheDocument();
  });
});
