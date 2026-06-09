// ============================================================
// Auth API — typed calls against the backend /auth routes.
// ============================================================
import { api, tokens } from "./api";
import type { Organization, User } from "../types";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
  organization: Organization | null;
}

interface MeResponse {
  user: User;
  organization: Organization | null;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await api.postPublic<AuthResponse>("/auth/login", {
      email,
      password,
    });
    tokens.set(res.accessToken, res.refreshToken);
    return res;
  },

  async signup(
    name: string,
    email: string,
    password: string,
    organizationName?: string
  ): Promise<AuthResponse> {
    const res = await api.postPublic<AuthResponse>("/auth/signup", {
      name,
      email,
      password,
      organizationName,
    });
    tokens.set(res.accessToken, res.refreshToken);
    return res;
  },

  me(): Promise<MeResponse> {
    return api.get<MeResponse>("/auth/me");
  },

  forgotPassword(email: string): Promise<{ detail: string }> {
    return api.postPublic<{ detail: string }>("/auth/forgot-password", { email });
  },

  resetPassword(token: string, newPassword: string): Promise<{ detail: string }> {
    return api.postPublic<{ detail: string }>("/auth/reset-password", {
      token,
      newPassword,
    });
  },

  logout() {
    tokens.clear();
  },
};
