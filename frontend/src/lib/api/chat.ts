import { apiPost } from "@/lib/api/client";

export type ChatResponse = {
  response: string;
};

export type ContextPreviewResponse = {
  message?: string;
  context: string;
};

export const sendChatMessage = (message: string) =>
  apiPost<ChatResponse>("/api/chat", { message });

export const previewChatContext = (message: string) =>
  apiPost<ContextPreviewResponse>("/api/context/preview", { message });
