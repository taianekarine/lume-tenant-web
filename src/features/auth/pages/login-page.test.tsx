import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { completePasswordChangeAction, loginAction } from '../actions/login-action';
import { LoginPage } from './login-page';

const toastAdd = jest.fn();

jest.mock('@/shared/ui/toast', () => ({
  toast: { add: (...args: unknown[]) => toastAdd(...args) },
}));

beforeAll(() => {
  window.PointerEvent ??= MouseEvent as typeof PointerEvent;
});

jest.mock('../actions/login-action', () => ({
  completePasswordChangeAction: jest.fn(),
  loginAction: jest.fn(),
}));

const mockedLoginAction = jest.mocked(loginAction);
const mockedCompletePasswordChange = jest.mocked(completePasswordChangeAction);
const replace = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    mockedLoginAction.mockResolvedValue({
      success: false,
      message: 'Login simulado indisponível.',
      errorCode: 'SERVICE_UNAVAILABLE',
    });
  });

  afterEach(() => {
    mockedLoginAction.mockReset();
    mockedCompletePasswordChange.mockReset();
    replace.mockReset();
    refresh.mockReset();
  });

  it('deve renderizar os campos principais do formulário', () => {
    render(<LoginPage />);

    expect(screen.getByRole('img', { name: 'Lume' })).toBeInTheDocument();
    expect(screen.getByText('Portal seguro')).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: 'Acesse sua conta',
      }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Usuário ou e-mail')).toBeInTheDocument();

    expect(screen.getByLabelText('Senha')).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Entrar',
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Esqueci minha senha' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('deve exibir os erros dos campos obrigatórios', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.click(
      screen.getByRole('button', {
        name: 'Entrar',
      }),
    );

    expect(await screen.findByText('Informe seu usuário ou e-mail.')).toBeInTheDocument();

    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument();
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        description: 'Revise os campos destacados e tente novamente.',
      }),
    );
  });

  it('deve rejeitar um documento numérico', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Usuário ou e-mail'), '111.111.111-11');

    await user.type(screen.getByLabelText('Senha'), 'teste123');

    await user.click(
      screen.getByRole('button', {
        name: 'Entrar',
      }),
    );

    expect(await screen.findByText('Informe um usuário ou e-mail válido.')).toBeInTheDocument();
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        description: 'Revise os campos destacados e tente novamente.',
      }),
    );
  });

  it('deve permitir mostrar e ocultar a senha', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    const passwordInput = screen.getByLabelText('Senha');

    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(
      screen.getByRole('button', {
        name: 'Mostrar senha',
      }),
    );

    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(
      screen.getByRole('button', {
        name: 'Ocultar senha',
      }),
    );

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('deve normalizar e enviar um nome de usuário válido para a ação de servidor', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Usuário ou e-mail'), '  taiane.karine  ');

    await user.type(screen.getByLabelText('Senha'), 'teste123');

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Lembrar-me neste dispositivo',
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Entrar',
      }),
    );

    expect(mockedLoginAction).toHaveBeenCalledWith({
      identifier: 'taiane.karine',
      password: 'teste123',
      remember: true,
    });

    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', description: 'Login simulado indisponível.' }),
    );
  });

  it('opens the first-access dialog and changes the password without creating a session', async () => {
    const user = userEvent.setup();
    mockedLoginAction.mockResolvedValue({
      success: false,
      message: 'Defina uma nova senha para concluir o primeiro acesso.',
      errorCode: 'ACCOUNT_PASSWORD_SETUP_REQUIRED',
      passwordSetupChallenge: {
        token: 'opaque-first-access-challenge',
        expiresAt: '2026-07-29T12:00:00.000Z',
        reason: 'first-access',
      },
    });
    mockedCompletePasswordChange.mockResolvedValue({
      success: true,
      message: 'Senha criada com sucesso. Entre novamente com sua nova senha.',
    });
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Usuário ou e-mail'), 'taiane.karine');
    await user.type(screen.getByLabelText('Senha'), 'SenhaInicial@2026');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByRole('heading', { name: 'Defina sua nova senha' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Código do erro/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Nova senha'), 'SenhaNova@2026');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'SenhaNova@2026');
    await user.click(screen.getByRole('button', { name: 'Criar senha' }));

    expect(mockedCompletePasswordChange).toHaveBeenCalledWith({
      token: 'opaque-first-access-challenge',
      newPassword: 'SenhaNova@2026',
    });
    expect(replace).toHaveBeenCalledWith('/login?passwordChanged=1');
    expect(refresh).toHaveBeenCalled();
    expect(
      screen.queryByRole('heading', { name: 'Defina sua nova senha' }),
    ).not.toBeInTheDocument();
  });

  it('shows the confirmation after the first password is defined', () => {
    render(<LoginPage passwordChanged />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Senha definida com sucesso. Entre com sua nova senha.',
    );
  });
});
