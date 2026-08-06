import { userFacingMessage } from './user-facing-message';

export type ActionResultFeedback =
  | {
      readonly success: true;
      readonly message: string;
    }
  | {
      readonly success: false;
      readonly message: string;
      readonly errorCode: string;
    };

export function formatActionResultDescription(result: ActionResultFeedback): string {
  return result.success
    ? result.message
    : userFacingMessage(result.message, 'Não foi possível concluir a operação.');
}
