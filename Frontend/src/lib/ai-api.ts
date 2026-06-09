// ============================================================
// AI config API — manage the org's Anthropic API key.
// The key is stored Fernet-encrypted server-side; never returned.
// ============================================================
import { api } from "./api";

export interface AIConfig {
  configured: boolean;
  source: "org" | "env" | null;
  model: string;
}

export const aiApi = {
  getConfig: () => api.get<AIConfig>("/ai/config"),
  setKey: (apiKey: string) => api.put<AIConfig>("/ai/config", { apiKey }),
  clearKey: () => api.delete<AIConfig>("/ai/config"),
};
