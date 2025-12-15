export type CaiaMode = 'codigo' | 'assistente';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
}

export interface ExecuteCommandRequest {
  kind: 'execute-command';
  id: string;
  command: string;
  cwd?: string;
  confirm?: boolean; // frontend should set true only after user confirmation
}

export interface ExecuteCommandEvent {
  kind: 'event';
  id: string;
  event:
    | { type: 'started'; command: string }
    | { type: 'stdout'; chunk: string }
    | { type: 'stderr'; chunk: string }
    | { type: 'exit'; code: number | null };
}

export interface CreateReminderRequest {
  title: string;
  when: string; // ISO or natural language parsed on server
  notes?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ModelId = 'gpt-5.2' | 'local-none';

export interface FeatureFlags {
  gpt52PreviewAllClients: boolean;
}

export interface ServerConfig {
  features: FeatureFlags;
  defaultModel: ModelId;
  voiceAgentPrompt?: string;
}
