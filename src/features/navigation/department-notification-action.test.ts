/** @jest-environment node */

import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import {
  executeAuthenticatedTenantMutation,
  executeAuthenticatedTenantRequest,
} from '@/features/tenant-administration/server';

import {
  getDepartmentNotificationsAction,
  markDepartmentNotificationReadAction,
} from './department-notification-action';

jest.mock('@/features/auth/server', () => ({
  getCurrentAuthenticatedSession: jest.fn(),
}));
jest.mock('@/features/tenant-administration/server', () => ({
  executeAuthenticatedTenantMutation: jest.fn(),
  executeAuthenticatedTenantRequest: jest.fn(),
}));

const mockedSession = jest.mocked(getCurrentAuthenticatedSession);
const mockedTenantMutation = jest.mocked(executeAuthenticatedTenantMutation);
const mockedTenantRequest = jest.mocked(executeAuthenticatedTenantRequest);

const activeSession = {
  version: 1 as const,
  id: 'session-001',
  user: {
    id: 'employee-001',
    name: 'Atendente',
    type: 'employee' as const,
    departments: ['commercial'],
    permissions: ['dashboard:view'] as const,
    clientCategory: null,
    isActive: true,
  },
  issuedAt: '2026-07-28T12:00:00.000Z',
  expiresAt: '2026-07-28T20:00:00.000Z',
  rememberDevice: false,
};

describe('department notification actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns only the summary supplied by the authenticated Tenant API', async () => {
    mockedSession.mockResolvedValue(activeSession);
    mockedTenantRequest.mockResolvedValue({
      items: [
        {
          id: 'commercial.pending-quote-proposals',
          type: 'quote-proposal-pending',
          department: 'commercial',
          title: '1 orçamento pendente',
          description: 'A fila Comercial possui orçamento aguardando envio.',
          href: '/quote-proposals',
          count: 1,
          unreadCount: 1,
          read: false,
        },
      ],
      total: 1,
      unreadTotal: 1,
    });

    await expect(getDepartmentNotificationsAction()).resolves.toMatchObject({
      success: true,
      summary: { total: 1 },
    });
    expect(mockedTenantRequest).toHaveBeenCalledTimes(1);
  });

  it('does not call the Tenant API without an active session', async () => {
    mockedSession.mockResolvedValue(null);

    await expect(getDepartmentNotificationsAction()).resolves.toMatchObject({
      success: false,
    });
    expect(mockedTenantRequest).not.toHaveBeenCalled();
  });

  it('persists the read receipt through the authenticated Tenant API', async () => {
    mockedSession.mockResolvedValue(activeSession);
    mockedTenantMutation.mockResolvedValue({
      notificationId: 'commercial.pending-quote-proposals',
      pendingTotal: 2,
      unreadTotal: 0,
      markedRead: 2,
      readAt: '2026-07-29T01:00:00.000Z',
    });

    await expect(
      markDepartmentNotificationReadAction('commercial.pending-quote-proposals'),
    ).resolves.toMatchObject({
      success: true,
      receipt: {
        unreadTotal: 0,
        markedRead: 2,
      },
    });
    expect(mockedTenantMutation).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported notification ids before accessing the session', async () => {
    await expect(markDepartmentNotificationReadAction('unknown')).resolves.toMatchObject({
      success: false,
    });
    expect(mockedSession).not.toHaveBeenCalled();
    expect(mockedTenantMutation).not.toHaveBeenCalled();
  });
});
