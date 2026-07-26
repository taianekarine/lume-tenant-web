'use server';

import { revalidatePath } from 'next/cache';

import { WhatsAppConversationRepositoryError } from '../application';
import type {
  WhatsAppConversation,
  WhatsAppConversationDepartment,
  WhatsAppMessage,
} from '../domain';
import {
  forwardWhatsAppConversationForDashboard,
  markWhatsAppConversationAsReadForDashboard,
  pollWhatsAppConversationForDashboard,
  returnWhatsAppConversationToBotForDashboard,
  sendHumanWhatsAppMessageForDashboard,
  takeOverWhatsAppConversationForDashboard,
} from '../server';
import { hasPermission } from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';

export interface VersionedWhatsAppConversationActionInput {
  readonly conversationId: unknown;
  readonly expectedVersion: unknown;
}

export interface ForwardWhatsAppConversationActionInput extends VersionedWhatsAppConversationActionInput {
  readonly targetDepartment: unknown;
}

export interface SendHumanWhatsAppMessageActionInput extends VersionedWhatsAppConversationActionInput {
  readonly commandId: unknown;
  readonly idempotencyKey: unknown;
  readonly text: unknown;
}

export type WhatsAppConversationActionResult =
  | {
      readonly success: true;
      readonly conversation: WhatsAppConversation;
    }
  | {
      readonly success: false;
      readonly code:
        | 'unauthorized'
        | 'forbidden'
        | 'validation'
        | 'conflict'
        | 'not-found'
        | 'service-unavailable';
      readonly message: string;
      readonly conversation?: WhatsAppConversation;
    };

export type SendHumanWhatsAppMessageActionResult =
  | {
      readonly success: true;
      readonly conversation: WhatsAppConversation;
      readonly message: WhatsAppMessage;
    }
  | {
      readonly success: false;
      readonly code:
        | 'unauthorized'
        | 'forbidden'
        | 'validation'
        | 'conflict'
        | 'not-found'
        | 'service-unavailable';
      readonly message: string;
      readonly conversation?: WhatsAppConversation;
    };

async function isAuthorized(): Promise<boolean> {
  const session = await getCurrentAuthenticatedSession();
  return session !== null && hasPermission(session.user, 'whatsapp-conversations:manage');
}

async function reloadAfterConflict(
  conversationId: unknown,
): Promise<WhatsAppConversation | undefined> {
  try {
    return (await pollWhatsAppConversationForDashboard(conversationId)) ?? undefined;
  } catch {
    return undefined;
  }
}

async function executeAction(
  input: VersionedWhatsAppConversationActionInput,
  operation: (
    conversationId: unknown,
    expectedVersion: unknown,
  ) => Promise<WhatsAppConversation | null>,
): Promise<WhatsAppConversationActionResult> {
  if (!(await isAuthorized())) {
    return {
      success: false,
      code: 'forbidden',
      message: 'Você não tem permissão para alterar esta conversa.',
    };
  }

  try {
    const conversation = await operation(input.conversationId, input.expectedVersion);

    if (conversation === null) {
      return {
        success: false,
        code: 'validation',
        message: 'A conversa ou a versão informada é inválida.',
      };
    }

    revalidatePath('/whatsapp-conversations');
    return { success: true, conversation };
  } catch (error) {
    if (error instanceof WhatsAppConversationRepositoryError && error.code === 'conflict') {
      const conversation = await reloadAfterConflict(input.conversationId);
      return {
        success: false,
        code: 'conflict',
        message:
          'Conflito: o atendimento foi alterado em outra sessão e foi recarregado. Revise o estado atual antes de tentar novamente.',
        ...(conversation ? { conversation } : {}),
      };
    }

    if (error instanceof WhatsAppConversationRepositoryError) {
      if (error.code === 'unauthorized') {
        return {
          success: false,
          code: 'unauthorized',
          message: 'Sua sessão expirou. Entre novamente.',
        };
      }

      if (error.code === 'forbidden' || error.code === 'validation' || error.code === 'not-found') {
        return {
          success: false,
          code: error.code,
          message: error.message,
        };
      }
    }

    return {
      success: false,
      code: 'service-unavailable',
      message: 'Não foi possível atualizar o atendimento na Tenant API.',
    };
  }
}

export async function takeOverWhatsAppConversationAction(
  input: VersionedWhatsAppConversationActionInput,
): Promise<WhatsAppConversationActionResult> {
  return executeAction(input, takeOverWhatsAppConversationForDashboard);
}

export async function returnWhatsAppConversationToBotAction(
  input: VersionedWhatsAppConversationActionInput,
): Promise<WhatsAppConversationActionResult> {
  return executeAction(input, returnWhatsAppConversationToBotForDashboard);
}

export async function markWhatsAppConversationAsReadAction(
  input: VersionedWhatsAppConversationActionInput,
): Promise<WhatsAppConversationActionResult> {
  return executeAction(input, markWhatsAppConversationAsReadForDashboard);
}

export async function forwardWhatsAppConversationAction(
  input: ForwardWhatsAppConversationActionInput,
): Promise<WhatsAppConversationActionResult> {
  if (!(await isAuthorized())) {
    return {
      success: false,
      code: 'forbidden',
      message: 'Você não tem permissão para encaminhar esta conversa.',
    };
  }

  try {
    const conversation = await forwardWhatsAppConversationForDashboard(
      input.conversationId,
      input.targetDepartment as WhatsAppConversationDepartment,
      input.expectedVersion,
    );

    if (conversation === null) {
      return {
        success: false,
        code: 'validation',
        message: 'A conversa, a versão ou o departamento informado é inválido.',
      };
    }

    revalidatePath('/whatsapp-conversations');
    return { success: true, conversation };
  } catch (error) {
    if (error instanceof WhatsAppConversationRepositoryError && error.code === 'conflict') {
      const conversation = await reloadAfterConflict(input.conversationId);
      return {
        success: false,
        code: 'conflict',
        message:
          'Conflito: o atendimento foi alterado em outra sessão e foi recarregado. Revise o estado atual antes de encaminhar.',
        ...(conversation ? { conversation } : {}),
      };
    }

    if (
      error instanceof WhatsAppConversationRepositoryError &&
      ['forbidden', 'validation', 'not-found'].includes(error.code)
    ) {
      return {
        success: false,
        code: error.code as 'forbidden' | 'validation' | 'not-found',
        message: error.message,
      };
    }

    return {
      success: false,
      code: 'service-unavailable',
      message: 'Não foi possível encaminhar o atendimento na Tenant API.',
    };
  }
}

export async function sendHumanWhatsAppMessageAction(
  input: SendHumanWhatsAppMessageActionInput,
): Promise<SendHumanWhatsAppMessageActionResult> {
  if (!(await isAuthorized())) {
    return {
      success: false,
      code: 'forbidden',
      message: 'Você não tem permissão para responder esta conversa.',
    };
  }

  try {
    const result = await sendHumanWhatsAppMessageForDashboard(input.conversationId, {
      commandId: input.commandId,
      idempotencyKey: input.idempotencyKey,
      expectedVersion: input.expectedVersion,
      text: input.text,
    });

    if (result === null) {
      return {
        success: false,
        code: 'validation',
        message: 'Informe uma mensagem de texto válida.',
      };
    }

    revalidatePath('/whatsapp-conversations');
    return { success: true, ...result };
  } catch (error) {
    if (error instanceof WhatsAppConversationRepositoryError && error.code === 'conflict') {
      const conversation = await reloadAfterConflict(input.conversationId);
      return {
        success: false,
        code: 'conflict',
        message:
          'Conflito: a conversa mudou antes do envio. O rascunho foi preservado; revise o estado e tente novamente.',
        ...(conversation ? { conversation } : {}),
      };
    }

    if (error instanceof WhatsAppConversationRepositoryError) {
      if (error.code === 'unauthorized') {
        return {
          success: false,
          code: 'unauthorized',
          message: 'Sua sessão expirou. Entre novamente.',
        };
      }

      if (error.code === 'forbidden' || error.code === 'validation' || error.code === 'not-found') {
        return {
          success: false,
          code: error.code,
          message: error.message,
        };
      }
    }

    return {
      success: false,
      code: 'service-unavailable',
      message:
        'Não foi possível confirmar o registro da mensagem. O rascunho e os identificadores de reenvio foram preservados.',
    };
  }
}
