export type AccountStatus = "initializing" | "active" | "archived";
export type LlmProvider = "openai" | "anthropic";
export type MessageRole = "user" | "assistant" | "system";

export interface Account {
  id: string;
  name: string;
  status: AccountStatus;
  llmProvider: LlmProvider;
  llmModel: string;
  systemPrompt: string | null;
  stateSummary: string | null;
  reminderIntervalDays: number | null;
  lastReminderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  accountId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface CreateAccountInput {
  name: string;
  llmProvider?: LlmProvider;
  llmModel?: string;
}

export interface UpdateAccountInput {
  name?: string;
  status?: AccountStatus;
  llmProvider?: LlmProvider;
  llmModel?: string;
  systemPrompt?: string;
  stateSummary?: string;
  reminderIntervalDays?: number | null;
}

export interface AccountWithMessages extends Account {
  messages: Message[];
}
