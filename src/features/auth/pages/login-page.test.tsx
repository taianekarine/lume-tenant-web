import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { loginAction } from '../actions/login-action';
import { LoginPage } from './login-page';

jest.mock('../actions/login-action', () => ({
  loginAction: jest.fn(),
}));

const mockedLoginAction = jest.mocked(loginAction);

describe('LoginPage', () => {
  beforeEach(() => {
    mockedLoginAction.mockResolvedValue({
      success: false,
      message: 'Login simulado indisponível.',
    });
  });

  afterEach(() => {
    mockedLoginAction.mockReset();
  });

  it('deve renderizar os campos principais do formulário', () => {
    render(<LoginPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Acesse sua conta',
      }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Usuário, e-mail ou CPF')).toBeInTheDocument();

    expect(screen.getByLabelText('Senha')).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Entrar',
      }),
    ).toBeInTheDocument();
  });

  it('deve exibir os erros dos campos obrigatórios', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.click(
      screen.getByRole('button', {
        name: 'Entrar',
      }),
    );

    expect(await screen.findByText('Informe seu usuário, e-mail ou CPF.')).toBeInTheDocument();

    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument();
  });

  it('deve rejeitar um CPF inválido', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Usuário, e-mail ou CPF'), '111.111.111-11');

    await user.type(screen.getByLabelText('Senha'), 'teste123');

    await user.click(
      screen.getByRole('button', {
        name: 'Entrar',
      }),
    );

    expect(await screen.findByText('Informe um CPF válido.')).toBeInTheDocument();
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

    await user.type(screen.getByLabelText('Usuário, e-mail ou CPF'), '  taiane.karine  ');

    await user.type(screen.getByLabelText('Senha'), 'teste123');

    await user.click(screen.getByLabelText('Lembrar-me neste dispositivo'));

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

    expect(await screen.findByText('Login simulado indisponível.')).toBeInTheDocument();
  });
});
