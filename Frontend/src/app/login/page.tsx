"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, Sparkles, ArrowLeft, Sun, Moon, Compass, Laptop } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedIn = await login(email, password);
      router.push(loggedIn.role === "super_admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleCycleTheme = () => {
    const nextThemeMap = {
      light: "dark",
      dark: "moonlight",
      moonlight: "system",
      system: "light",
    } as const;
    setTheme(nextThemeMap[theme]);
  };

  const getThemeMeta = () => {
    switch (theme) {
      case "light":
        return { icon: Sun, label: "Light Mode active — Click to switch to Dark Mode" };
      case "dark":
        return { icon: Moon, label: "Dark Mode active — Click to switch to Moonlight Mode" };
      case "moonlight":
        return { icon: Compass, label: "Moonlight Mode active — Click to switch to System Mode" };
      case "system":
      default:
        return { icon: Laptop, label: "System theme active — Click to switch to Light Mode" };
    }
  };

  const themeMeta = getThemeMeta();
  const ActiveThemeIcon = themeMeta.icon;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative transition-colors duration-300">
      {/* Theme Toggler - Upper Right */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={handleCycleTheme}
          title={themeMeta.label}
          className="p-2.5 rounded-xl border border-border/50 bg-card/40 backdrop-blur-md text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200 active:scale-95 flex items-center justify-center"
          aria-label="Cycle theme preference"
        >
          <ActiveThemeIcon className="w-4 h-4 text-foreground animate-scale-in" />
        </button>
      </div>

      <div className="fixed inset-0 bg-gradient-mesh opacity-30 pointer-events-none" />
      <div className="fixed inset-0 dot-grid opacity-10 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to home
        </Link>

        {/* Card */}
        <div className="glass-card bg-card/60 border border-border/50 rounded-2xl p-8 shadow-2xl animate-fade-in-up">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Welcome back</h1>
              <p className="text-xs text-muted-foreground text-foreground/75">
                Log in to Commerce OS
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/25 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-primary hover:underline font-medium"
            >
              Sign up free
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
