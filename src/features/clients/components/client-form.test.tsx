import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ClientForm } from './client-form';

describe('ClientForm', () => {
  it('preserva as duas seções e valida somente o tipo de cliente selecionado', async () => {
    const user = userEvent.setup();

    render(<ClientForm action={jest.fn()} />);

    expect(
      screen.getByText('Pessoa física', { selector: '[data-slot="card-title"]' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Pessoa jurídica', { selector: '[data-slot="card-title"]' }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/Razão social/)).toBeRequired();
    expect(screen.getByLabelText(/CNPJ/)).toBeRequired();
    expect(screen.getByLabelText('E-mail', { selector: '#legalEmail' })).toHaveAttribute(
      'type',
      'email',
    );
    expect(screen.getByLabelText('E-mail', { selector: '#individualEmail' })).toHaveAttribute(
      'type',
      'text',
    );

    await user.selectOptions(screen.getByLabelText('Tipo de cliente'), 'pf');

    expect(screen.getByLabelText(/Razão social/)).not.toBeRequired();
    expect(screen.getByLabelText(/CNPJ/)).not.toBeRequired();
    expect(screen.getByLabelText('E-mail', { selector: '#legalEmail' })).toHaveAttribute(
      'type',
      'text',
    );
    expect(screen.getByLabelText(/WhatsApp \(obrigatório\)/)).toBeRequired();
    expect(screen.getByLabelText('E-mail', { selector: '#individualEmail' })).toHaveAttribute(
      'type',
      'email',
    );
  });
});
