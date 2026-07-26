import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';

import { AUTHENTICATED_SESSION_VERSION, type AuthenticatedSession } from '@/features/auth/domain';

import { DashboardPage } from './dashboard-page';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('@/features/auth/components', () => ({
  LogoutButton: () => <button type="button">Sair</button>,
}));

const mockedUsePathname = jest.mocked(usePathname);

const employeeSession: AuthenticatedSession = {
  version: AUTHENTICATED_SESSION_VERSION,
  id: 'session-employee-001',
  user: {
    id: 'employee-001',
    name: 'Maria Silva',
    type: 'employee',
    departments: ['commercial'],
    roles: ['manager'],
    permissions: ['dashboard:view', 'commercial:view'],
    clientCategory: null,
    isActive: true,
  },
  issuedAt: new Date(Date.now() - 60_000).toISOString(),
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  rememberDevice: false,
};

describe('DashboardPage', () => {
  beforeEach(() => {
    mockedUsePathname.mockReturnValue('/dashboard');
  });

  afterEach(() => {
    mockedUsePathname.mockReset();
  });

  it('shows the authenticated employee context and navigation', () => {
    render(<DashboardPage session={employeeSession} />);

    expect(
      screen.getByRole('heading', {
        name: 'Sua área na Empresa já está protegida.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Olá, Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Colaborador interno')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('link', { name: /Site institucional/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });

  it('identifies an eventual-charter client profile', () => {
    const clientSession: AuthenticatedSession = {
      ...employeeSession,
      id: 'session-client-001',
      user: {
        id: 'client-001',
        name: 'Cliente Exemplo',
        type: 'client',
        departments: [],
        roles: [],
        permissions: ['dashboard:view', 'quotes:view'],
        clientCategory: 'eventual-charter',
        isActive: true,
      },
    };

    render(<DashboardPage session={clientSession} />);

    expect(screen.getByText('Cliente de fretamento eventual')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
