import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';

import { AUTHENTICATED_SESSION_VERSION, type AuthenticatedSession } from '@/features/auth/domain';
import { createWhatsAppConversationFixture } from '@/features/whatsapp-conversations/testing/whatsapp-conversation-fixture';

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
    permissions: ['dashboard:view', 'whatsapp-conversations:manage'],
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

  it('shows real operational metrics and graphs from conversations', () => {
    const conversations = [
      createWhatsAppConversationFixture({ unreadCount: 3 }),
      createWhatsAppConversationFixture({
        id: 'conversation-attendant',
        conversationState: 'human-active',
        unreadCount: 1,
        department: 'operations',
      }),
      createWhatsAppConversationFixture({
        id: 'conversation-paused',
        conversationState: 'sent-to-human',
        unreadCount: 0,
      }),
    ];

    render(<DashboardPage session={employeeSession} conversations={conversations} />);

    expect(document.querySelector('main.mx-auto')).toHaveClass('py-5', 'sm:py-6');
    expect(
      screen.getByRole('heading', {
        name: 'Dashboard Comercial',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Olá, Maria Silva/)).toBeInTheDocument();
    expect(screen.getAllByText('Atendente ativo')).toHaveLength(2);
    expect(screen.getAllByText('Automação pausada')).toHaveLength(3);
    expect(screen.getAllByText('Conversas não lidas')).toHaveLength(2);
    expect(screen.queryByText(/Mensagens não lidas/i)).not.toBeInTheDocument();
    expect(screen.getByText('Condução das conversas')).toBeInTheDocument();
    expect(screen.getByText('Situação da fila Comercial')).toBeInTheDocument();
    expect(screen.getByText('2 conversas monitoradas')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: 'Dashboard' })
        .some((link) => link.getAttribute('href')?.includes('/dashboard')),
    ).toBe(true);
  });

  it('shows a bounded error instead of inventing operational data', () => {
    render(
      <DashboardPage
        session={employeeSession}
        conversations={[]}
        initialError="Tenant API indisponível."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Tenant API indisponível.');
    expect(screen.getByText('Nenhuma conversa encontrada para este período.')).toBeInTheDocument();
  });

  it('shows the budget charts only inside the Commercial dashboard', () => {
    render(
      <DashboardPage
        session={employeeSession}
        conversations={[]}
        quoteMetrics={{
          pending: 5,
          sent: 8,
          approved: 3,
          cancelled: 2,
          delivered: 13,
          cancellationReasons: [{ reason: 'Data indisponível', count: 2 }],
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Orçamentos' })).toBeInTheDocument();
    expect(screen.getByText('Situação dos orçamentos')).toBeInTheDocument();
    expect(screen.getByText('Motivos de cancelamento')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '5 Pendentes' })).toHaveAttribute(
      'href',
      '/quote-proposals/pending',
    );
  });

  it('mostra para Operações somente os indicadores do departamento atribuído', () => {
    const operationsSession: AuthenticatedSession = {
      ...employeeSession,
      user: {
        id: 'employee-operations-001',
        name: 'Taiane Karine',
        type: 'employee',
        departments: ['operations'],
        permissions: ['dashboard:view', 'whatsapp-conversations:manage'],
        clientCategory: null,
        isActive: true,
      },
    };
    const conversations = [
      createWhatsAppConversationFixture({
        id: 'commercial-conversation',
        department: 'commercial',
        unreadCount: 9,
      }),
      createWhatsAppConversationFixture({
        id: 'operations-conversation',
        department: 'operations',
        conversationState: 'human-active',
        unreadCount: 2,
      }),
    ];

    render(<DashboardPage session={operationsSession} conversations={conversations} />);

    expect(screen.getByRole('heading', { name: /Dashboard Opera/ })).toBeInTheDocument();
    expect(screen.getByText('1 conversa monitorada')).toBeInTheDocument();
    expect(screen.getByText(/1 com atendente/)).toBeInTheDocument();
    expect(screen.queryByText(/aguardando proposta/)).not.toBeInTheDocument();
  });
});
