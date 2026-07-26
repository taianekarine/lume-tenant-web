import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';

import type { EmployeeUser } from '@/features/auth/domain';

import { AuthenticatedNavigation } from './authenticated-navigation';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

const mockedUsePathname = jest.mocked(usePathname);

function createEmployee(permissions: EmployeeUser['permissions'], isActive = true): EmployeeUser {
  return {
    id: 'employee-001',
    name: 'Maria Silva',
    type: 'employee',
    departments: ['commercial'],
    roles: ['manager'],
    permissions,
    clientCategory: null,
    isActive,
  };
}

describe('AuthenticatedNavigation', () => {
  beforeEach(() => {
    mockedUsePathname.mockReturnValue('/dashboard');
  });

  afterEach(() => {
    mockedUsePathname.mockReset();
  });

  it('renders authorized destinations and identifies the current page', () => {
    render(<AuthenticatedNavigation user={createEmployee(['dashboard:view'])} />);

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the AI agents module only with its permission', () => {
    mockedUsePathname.mockReturnValue('/ai-agents');

    render(<AuthenticatedNavigation user={createEmployee(['dashboard:view', 'ai-agents:use'])} />);

    expect(screen.getByRole('link', { name: 'Agentes de IA' })).toHaveAttribute(
      'href',
      '/ai-agents',
    );
    expect(screen.getByRole('link', { name: 'Agentes de IA' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('shows the WhatsApp conversations module only with its permission', () => {
    mockedUsePathname.mockReturnValue('/whatsapp-conversations');

    render(
      <AuthenticatedNavigation
        user={createEmployee(['dashboard:view', 'whatsapp-conversations:manage'])}
      />,
    );

    expect(screen.getByRole('link', { name: 'Conversas WhatsApp' })).toHaveAttribute(
      'href',
      '/whatsapp-conversations',
    );
    expect(screen.getByRole('link', { name: 'Conversas WhatsApp' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('does not render destinations without the required permission', () => {
    const { container } = render(
      <AuthenticatedNavigation user={createEmployee(['reports:view'])} />,
    );

    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render navigation for an inactive user', () => {
    const { container } = render(
      <AuthenticatedNavigation user={createEmployee(['dashboard:view'], false)} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
