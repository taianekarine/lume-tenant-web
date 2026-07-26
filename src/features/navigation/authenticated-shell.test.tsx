import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';

import type { EmployeeUser } from '@/features/auth/domain';

import { AuthenticatedShell } from './authenticated-shell';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('@/features/auth/components', () => ({
  LogoutButton: () => <button type="button">Sair</button>,
}));

const mockedUsePathname = jest.mocked(usePathname);

const employee: EmployeeUser = {
  id: 'employee-001',
  name: 'Maria Silva',
  type: 'employee',
  departments: ['commercial'],
  roles: ['manager'],
  permissions: ['dashboard:view', 'ai-agents:use'],
  clientCategory: null,
  isActive: true,
};

describe('AuthenticatedShell', () => {
  beforeEach(() => {
    mockedUsePathname.mockReturnValue('/dashboard');
  });

  afterEach(() => {
    mockedUsePathname.mockReset();
  });

  it('shares the authorized navigation and session actions with internal pages', () => {
    render(
      <AuthenticatedShell user={employee}>
        <main>Conteúdo protegido</main>
      </AuthenticatedShell>,
    );

    expect(
      screen.getByRole('navigation', {
        name: 'Navegação da área interna',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Site institucional/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument();
  });
});
