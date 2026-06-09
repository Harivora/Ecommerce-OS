// ============================================================
// Admin API — super-admin platform console.
// Wraps /admin/* routes and the impersonation flow.
// ============================================================
import { api, tokens, downloadFile } from "./api";

// localStorage keys (mirror api.ts) so we can stash/restore the admin session
// while impersonating a client.
const ACCESS_KEY = "cos_access_token";
const REFRESH_KEY = "cos_refresh_token";
const IMP_ACCESS = "cos_admin_access";
const IMP_REFRESH = "cos_admin_refresh";
const IMP_LABEL = "cos_impersonating";

export type OrgStatus = "active" | "past_due" | "suspended" | "cancelled";

export interface PlatformMetrics {
  mrr: number;
  arr: number;
  activeOrganizations: number;
  activeStores: number;
  connectedIntegrations: number;
  totalOrdersProcessed: number;
  aiQueriesProcessed: number;
  churnRate: number;
}

export interface AdminClient {
  id: string;
  name: string;
  plan: string;
  status: OrgStatus;
  currency: string;
  monthlyPrice: number;
  ownerName: string | null;
  ownerEmail: string | null;
  userCount: number;
  storeCount: number;
  lastActive: string | null;
  createdAt: string;
}

export interface AdminClientUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string | null;
}

export interface AdminClientIntegration {
  provider: string;
  name: string;
  status: string;
  lastSync: string | null;
}

export interface AdminClientDetail {
  id: string;
  name: string;
  plan: string;
  status: OrgStatus;
  currency: string;
  monthlyPrice: number;
  createdAt: string;
  ownerEmail: string | null;
  totalRevenue: number;
  totalNetProfit: number;
  avgMargin: number;
  ordersCount: number;
  connectedIntegrations: number;
  storeCount: number;
  aiQueries: number;
  users: AdminClientUser[];
  integrations: AdminClientIntegration[];
}

export interface ResetPasswordResult {
  email: string;
  temporaryPassword: string;
  detail: string;
}

interface ImpersonateResult {
  accessToken: string;
  tokenType: string;
  organization: { id: string; name: string };
}

export const adminApi = {
  metrics: () => api.get<PlatformMetrics>("/admin/metrics"),
  clients: () => api.get<AdminClient[]>("/admin/clients"),
  client: (id: string) => api.get<AdminClientDetail>(`/admin/clients/${id}`),
  setStatus: (id: string, status: OrgStatus) =>
    api.patch<AdminClient>(`/admin/clients/${id}/status`, { status }),
  resetPassword: (id: string) =>
    api.post<ResetPasswordResult>(`/admin/clients/${id}/reset-password`),
  exportDatasets: (id: string) =>
    api.get<{ key: string; label: string }[]>(`/admin/clients/${id}/export/datasets`),
  exportDataset: (id: string, key: string) =>
    downloadFile(`/admin/clients/${id}/export/dataset/${key}`),
  exportAll: (id: string) => downloadFile(`/admin/clients/${id}/export/all`),
};

// ── Impersonation ───────────────────────────────────────────
// Stash the admin token, swap in a client-scoped token, and (caller) navigate
// to /dashboard. The token is access-only and short-lived; exiting restores the
// admin session.
export const impersonation = {
  async start(organizationId: string): Promise<string> {
    const res = await api.post<ImpersonateResult>("/admin/impersonate", {
      organizationId,
    });
    if (typeof window !== "undefined") {
      localStorage.setItem(IMP_ACCESS, tokens.access() ?? "");
      localStorage.setItem(IMP_REFRESH, tokens.refresh() ?? "");
      localStorage.setItem(IMP_LABEL, res.organization.name);
    }
    // Access-only client token; no refresh while impersonating.
    tokens.set(res.accessToken, "");
    return res.organization.name;
  },

  active(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(IMP_LABEL);
  },

  stop() {
    if (typeof window === "undefined") return;
    const access = localStorage.getItem(IMP_ACCESS);
    const refresh = localStorage.getItem(IMP_REFRESH);
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.removeItem(IMP_ACCESS);
    localStorage.removeItem(IMP_REFRESH);
    localStorage.removeItem(IMP_LABEL);
  },
};