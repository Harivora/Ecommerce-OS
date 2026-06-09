// ============================================================
// Integrations API — catalog, connect (encrypt server-side),
// disconnect, and trigger sync.
// ============================================================
import { api } from "./api";

export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "available"
  | "error"
  | "coming-soon";

export interface IntegrationDTO {
  id: string;
  provider: string;
  name: string;
  description: string;
  icon: string;
  status: ConnectionStatus;
  phase: number;
  lastSync: string | null;
  category: "ecommerce" | "ads" | "shipping" | "payments" | "backup";
  features: string[];
  hasConnector: boolean;
  credentialFields: string[];
  syncError: string | null;
}

export interface IntegrationActionResult {
  integration: IntegrationDTO;
  detail: string;
  syncEnqueued: boolean;
}

// Friendly labels + input types for credential fields, keyed by field name.
export const CREDENTIAL_FIELD_META: Record<
  string,
  { label: string; type: "text" | "password"; placeholder?: string }
> = {
  shop_url: { label: "Store URL", type: "text", placeholder: "yourstore.myshopify.com" },
  access_token: { label: "Admin API Access Token", type: "password", placeholder: "shpat_…" },
  api_key: { label: "API Key", type: "password" },
  api_secret: { label: "API Secret", type: "password" },
  email: { label: "Email", type: "text", placeholder: "you@brand.com" },
  password: { label: "Password", type: "password" },
  key_id: { label: "Key ID", type: "text" },
  key_secret: { label: "Key Secret", type: "password" },
  app_id: { label: "App ID", type: "text" },
  secret_key: { label: "Secret Key", type: "password" },
  // NAS backup (SFTP)
  host: { label: "NAS Host / IP", type: "text", placeholder: "nas.yourbrand.com or 49.x.x.x" },
  port: { label: "SFTP Port", type: "text", placeholder: "22" },
  username: { label: "SFTP Username", type: "text" },
  private_key: {
    label: "SSH Private Key (optional)",
    type: "password",
    placeholder: "Paste key, or leave blank to use a password",
  },
  remote_path: {
    label: "Backup Folder Path",
    type: "text",
    placeholder: "/volume1/backups/commerce",
  },
};

export const integrationsApi = {
  list(): Promise<IntegrationDTO[]> {
    return api.get<IntegrationDTO[]>("/integrations");
  },
  connect(
    provider: string,
    credentials: Record<string, string>
  ): Promise<IntegrationActionResult> {
    return api.post<IntegrationActionResult>(`/integrations/${provider}/connect`, {
      credentials,
    });
  },
  disconnect(provider: string): Promise<IntegrationActionResult> {
    return api.post<IntegrationActionResult>(`/integrations/${provider}/disconnect`);
  },
  sync(provider: string): Promise<IntegrationActionResult> {
    return api.post<IntegrationActionResult>(`/integrations/${provider}/sync`);
  },
};
