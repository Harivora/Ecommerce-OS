"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Sparkles, CheckCircle, Sun, Moon, Compass, Laptop } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { authApi } from "@/lib/auth-api";

export default function ForgotPasswordPage() {
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
    } catch {
      /* Show the same confirmation regardless, to avoid email enumeration. */
    } finally {
      setLoading(false);
      setSubmitted(true);
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
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Sign In
        </Link>

        {/* Card */}
        <div className="glass-card bg-card/60 border border-border/50 rounded-2xl p-8 shadow-2xl animate-fade-in-up">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Reset Password</h1>
              <p className="text-xs text-muted-foreground">
                Commerce OS Profit Intelligence
              </p>
            </div>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none text-sm transition-all text-foreground placeholder:text-muted-foreground/50"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold hover:opacity-90 hover:shadow-primary/35 transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-primary/25"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending link...
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2 animate-scale-in">
                <CheckCircle className="w-6 h-6 animate-pulse-glow" />
              </div>
              <h2 className="text-base font-semibold">Check your inbox</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If an account exists for <strong className="text-foreground">{email}</strong>, a password reset link is on its way. Check your inbox (and spam).
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs text-primary hover:underline font-medium"
              >
                Try a different email
              </button>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Remembered your password?{" "}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
