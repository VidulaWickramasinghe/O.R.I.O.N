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
};

export const sendChatMessage = (
  message: string,
  options: { conversation_id?: string; client_scope_id?: string; workspace_id?: number; project_key?: string } = {},
) => apiPost<ChatResponse>("/api/chat", { message, ...options });

export const previewChatContext = (message: string) =>
  apiPost<ContextPreviewResponse>("/api/context/preview", { message });
