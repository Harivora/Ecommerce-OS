// ============================================================
// AI API — Anthropic key config + grounded chat via Claude.
// The key is stored Fernet-encrypted server-side; never returned.
// ============================================================
import { api } from "./api";

export interface AIConfig {
  configured: boolean;
  source: "org" | "env" | null;
  model: string;
}

export interface ChatMessageDTO {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatConversationDTO {
  id: string;
  title: string;
  messages: ChatMessageDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversationSummaryDTO {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatResponseDTO {
  conversationId: string;
  reply: ChatMessageDTO;
}

export const aiApi = {
  getConfig: () => api.get<AIConfig>("/ai/config"),
  setKey: (apiKey: string) => api.put<AIConfig>("/ai/config", { apiKey }),
  clearKey: () => api.delete<AIConfig>("/ai/config"),

  conversations: () => api.get<ChatConversationSummaryDTO[]>("/ai/conversations"),
  conversation: (id: string) =>
    api.get<ChatConversationDTO>(`/ai/conversations/${encodeURIComponent(id)}`),
  deleteConversation: (id: string) =>
    api.delete<{ message: string }>(`/ai/conversations/${encodeURIComponent(id)}`),
  chat: (message: string, conversationId?: string) =>
    api.post<ChatResponseDTO>("/ai/chat", { message, conversationId }),
};
