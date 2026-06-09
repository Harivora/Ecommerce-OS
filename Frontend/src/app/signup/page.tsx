"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, Building2, Sparkles, ArrowLeft, Sun, Moon, Compass, Laptop } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { ApiError } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    setError("");
    setLoading(true);
    try {
      await signup(name, email, password, company || undefined);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create account.");
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative transition-colors duration-300">
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
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to home
        </Link>

        <div className="glass-card bg-card/60 border border-border/50 rounded-2xl p-8 shadow-2xl animate-fade-in-up">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Create your account</h1>
              <p className="text-xs text-muted-foreground text-foreground/75">Start your 14-day free trial</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Hari Krishna" className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Company Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your Brand Name" className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8+ characters" className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all" required minLength={8} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 rounded border-border" />
              <span className="text-xs text-muted-foreground">I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link></span>
            </label>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button type="submit" disabled={loading || !agreed} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/25 disabled:opacity-50">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
