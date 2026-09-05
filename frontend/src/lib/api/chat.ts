import { apiPost } from "@/lib/api/client";

export type ChatResponse = {
  response: string;
  conversation_id: string;
  client_scope_id: string;
  agent_run_id?: number | null;
  provider: string;
  model: string;
  status: string;
  recoverable: boolean;
  usage: Record<string, number>;
};

export type ContextPreviewResponse = {
  message?: string;
  context: string;
  context_hash?: string;
  system_instructions?: string;
};

export type ContextOptions = { memory: boolean; knowledge: boolean; semantic: boolean; profile: boolean; activity: boolean };
export type ChatOptions = { conversation_id?: string; client_scope_id?: string; workspace_id?: number; project_key?: string; context_options?: ContextOptions; expected_context_hash?: string; model?: string };

export const sendChatMessage = (
  message: string,
  options: ChatOptions = {},
) => apiPost<ChatResponse>("/api/chat", { message, ...options });

export const previewChatContext = (message: string, options: ChatOptions = {}) =>
  apiPost<ContextPreviewResponse>("/api/context/preview", { message, ...options });
