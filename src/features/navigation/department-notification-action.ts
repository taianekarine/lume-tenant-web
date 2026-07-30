'use server';

import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import {
  COMMERCIAL_PENDING_QUOTES_NOTIFICATION_ID,
  type TenantNotificationReadReceipt,
  type TenantNotificationSummary,
} from '@/features/tenant-administration/domain';
import {
  executeAuthenticatedTenantMutation,
  executeAuthenticatedTenantRequest,
} from '@/features/tenant-administration/server';

export type DepartmentNotificationActionResult =
  | {
      readonly success: true;
      readonly summary: TenantNotificationSummary;
    }
  | {
      readonly success: false;
      readonly message: string;
    };

export type MarkDepartmentNotificationReadActionResult =
  | {
      readonly success: true;
      readonly receipt: TenantNotificationReadReceipt;
    }
  | {
      readonly success: false;
      readonly message: string;
    };

export async function getDepartmentNotificationsAction(): Promise<DepartmentNotificationActionResult> {
  const session = await getCurrentAuthenticatedSession();

  if (session === null || !session.user.isActive) {
    return {
      success: false,
      message: 'Sua sessão expirou. Entre novamente para consultar as notificações.',
    };
  }

  try {
    return {
      success: true,
      summary: await executeAuthenticatedTenantRequest((gateway) => gateway.getNotifications()),
    };
  } catch {
    return {
      success: false,
      message: 'Não foi possível atualizar as notificações.',
    };
  }
}

export async function markDepartmentNotificationReadAction(
  notificationId: string,
): Promise<MarkDepartmentNotificationReadActionResult> {
  if (notificationId !== COMMERCIAL_PENDING_QUOTES_NOTIFICATION_ID) {
    return {
      success: false,
      message: 'A notificação informada não aceita confirmação de leitura.',
    };
  }

  const session = await getCurrentAuthenticatedSession();
  if (session === null || !session.user.isActive) {
    return {
      success: false,
      message: 'Sua sessão expirou. Entre novamente para sincronizar as notificações.',
    };
  }

  try {
    return {
      success: true,
      receipt: await executeAuthenticatedTenantMutation((gateway) =>
        gateway.markNotificationRead(notificationId),
      ),
    };
  } catch {
    return {
      success: false,
      message:
        'A notificação foi marcada neste dispositivo, mas não foi possível sincronizar a leitura.',
    };
  }
}
