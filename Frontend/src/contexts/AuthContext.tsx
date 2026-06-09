"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Organization, User } from "../types";
import { authApi } from "@/lib/auth-api";
import { tokens } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginAs: (user: User) => void;
  signup: (
    name: string,
    email: string,
    password: string,
    organizationName?: string
  ) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the session on first load if an access token is present.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!tokens.access()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        if (!active) return;
        setUser(me.user);
        setOrganization(me.organization);
      } catch {
        tokens.clear();
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setUser(res.user);
    setOrganization(res.organization);
    return res.user;
  };

  // Used by the super-admin impersonation flow; sets the local user directly.
  const loginAs = (u: User) => {
    setUser(u);
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    organizationName?: string
  ) => {
    const res = await authApi.signup(name, email, password, organizationName);
    setUser(res.user);
    setOrganization(res.organization);
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    setOrganization(null);
  };

  const refreshMe = async () => {
    try {
      const me = await authApi.me();
      setUser(me.user);
      setOrganization(me.organization);
    } catch {
      /* leave current state */
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginAs,
        signup,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
