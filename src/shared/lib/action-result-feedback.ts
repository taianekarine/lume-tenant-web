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
  return result.success ? result.message : `${result.message}\nCódigo do erro: ${result.errorCode}`;
}
