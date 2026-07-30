import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { submitSupportRequestAction } from './support-actions';
import { buildSupportMailtoUrl, SupportPage } from './support-page';

jest.mock('./support-actions', () => ({
  submitSupportRequestAction: jest.fn(),
}));

const mockedSubmit = jest.mocked(submitSupportRequestAction);
const requester = {
  name: 'Taiane Karine',
  username: 'taiane.karine',
  email: 'taiane.karine@mileniumturismo.com.br',
};

describe('buildSupportMailtoUrl', () => {
  it('preserva espaços e quebras de linha e inclui os dados do usuário autenticado', () => {
    const url = buildSupportMailtoUrl(
      {
        subject: 'Um teste',
        message: 'Oi teste 1234',
      },
      {
        ...requester,
      },
    );
    const encodedQuery = url.slice(url.indexOf('?') + 1);
    const params = new URLSearchParams(encodedQuery);

    expect(url).not.toContain('+');
    expect(url).toMatch(/^mailto:devops@mileniumturismo\.com\.br\?/);
    expect(params.get('cc')).toBe('taiane.karine@mileniumturismo.com.br,taianekas.dev@outlook.com');
    expect(params.get('subject')).toBe('[Lume] Um teste');
    expect(params.get('body')).toBe(
      [
        'Oi teste 1234',
        '',
        'Dados do solicitante',
        'Nome: Taiane Karine',
        'Usuário: taiane.karine',
        'E-mail: taiane.karine@mileniumturismo.com.br',
      ].join('\r\n'),
    );
  });

  it('sends by the provider and does not show the mail application initially', async () => {
    mockedSubmit.mockResolvedValue({ success: true, requestId: 'request-001' });
    const user = userEvent.setup();
    render(<SupportPage requester={requester} />);

    expect(screen.getByRole('heading', { name: 'Abrir Ticket por e-mail' })).toBeInTheDocument();
    expect(screen.queryByText('Para')).not.toBeInTheDocument();
    expect(screen.queryByText('Cópia')).not.toBeInTheDocument();
    expect(screen.queryByText('devops@mileniumturismo.com.br')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abrir no aplicativo de e-mail' })).toBeNull();
    await user.type(screen.getByLabelText('Assunto'), 'Falha no painel');
    await user.type(
      screen.getByLabelText('Mensagem'),
      'Não consigo concluir uma operação no painel.',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar solicitação' }));

    await waitFor(() =>
      expect(mockedSubmit).toHaveBeenCalledWith({
        subject: 'Falha no painel',
        message: 'Não consigo concluir uma operação no painel.',
      }),
    );
    expect(await screen.findByText(/Protocolo: request-001/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abrir no aplicativo de e-mail' })).toBeNull();
  });

  it('only releases mailto when the Tenant API explicitly allows the fallback', async () => {
    mockedSubmit.mockResolvedValue({
      success: false,
      message: 'Falha no provedor.',
      fallbackAllowed: true,
    });
    const user = userEvent.setup();
    render(<SupportPage requester={requester} />);
    await user.type(screen.getByLabelText('Assunto'), 'Falha no painel');
    await user.type(
      screen.getByLabelText('Mensagem'),
      'Não consigo concluir uma operação no painel.',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar solicitação' }));

    expect(
      await screen.findByRole('button', { name: 'Abrir no aplicativo de e-mail' }),
    ).toBeInTheDocument();
  });
});
