import { render, screen } from '@testing-library/react';

import ResetPasswordPage from './page';

describe('reset password route', () => {
  it('shows a deterministic code when the reset token is missing', async () => {
    render(
      await ResetPasswordPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole('heading', { name: 'Link inválido' })).toBeInTheDocument();
    expect(screen.getByText('Código do erro: INVALID_PASSWORD_CHANGE_TOKEN')).toBeInTheDocument();
  });
});
