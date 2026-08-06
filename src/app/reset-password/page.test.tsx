import { render, screen } from '@testing-library/react';

import ResetPasswordPage from './page';

describe('reset password route', () => {
  it('shows a friendly message when the reset token is missing', async () => {
    render(
      await ResetPasswordPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole('heading', { name: 'Link inválido' })).toBeInTheDocument();
    expect(screen.queryByText(/Código do erro/)).not.toBeInTheDocument();
  });
});
