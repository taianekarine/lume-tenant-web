export const AI_AGENT_STATUSES = ['preparing', 'available'] as const;

export type AiAgentStatus = (typeof AI_AGENT_STATUSES)[number];

export interface AiAgent {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly status: AiAgentStatus;
}
