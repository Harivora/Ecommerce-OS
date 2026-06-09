"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, Theme } from "@/contexts/ThemeContext";
import { navigationItems } from "@/lib/mock-data";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import { impersonation } from "@/lib/admin-api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("5 mins ago");
  const [impersonating, setImpersonating] = useState<string | null>(null);

  // Route protection. Super-admins belong in /admin, not the client dashboard
  // (unless they're actively impersonating a client).
  useEffect(() => {
    setImpersonating(impersonation.active());
    if (isLoading) return;
    if (!user) {
      router.push("/login");
    } else if (user.role === "super_admin" && !impersonation.active()) {
      router.push("/admin");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Authenticating session...</p>
        </div>
      </div>
    );
  }

  const triggerSync = async () => {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSyncing(false);
    setLastSync("Just now");
  };

  // Cycle theme: light -> dark -> moonlight -> system -> light
  const handleCycleTheme = () => {
    const nextThemeMap: Record<Theme, Theme> = {
      light: "dark",
      dark: "moonlight",
      moonlight: "system",
      system: "light",
    };
    setTheme(nextThemeMap[theme]);
  };

  // Get active theme icon and label description
  const getThemeMeta = () => {
    switch (theme) {
      case "light":
        return { icon: Icons.Sun, label: "Light Mode active — Click to switch to Dark Mode" };
      case "dark":
        return { icon: Icons.Moon, label: "Dark Mode active — Click to switch to Moonlight Mode" };
      case "moonlight":
        return { icon: Icons.Compass, label: "Moonlight Mode active — Click to switch to System Mode" };
      case "system":
      default:
        return { icon: Icons.Laptop, label: "System theme active — Click to switch to Light Mode" };
    }
  };

  const themeMeta = getThemeMeta();
  const ActiveThemeIcon = themeMeta.icon;

  const mockNotifications = [
    {
      id: 1,
      title: "Out of Stock Warning",
      desc: "Smart Fitness Band V2 has hit 0 units.",
      time: "10m ago",
      type: "alert",
    },
    {
      id: 2,
      title: "High RTO Detected",
      desc: "North region COD return rate is currently 6.8%.",
      time: "1h ago",
      type: "warning",
    },
    {
      id: 3,
      title: "Shopify Sync Complete",
      desc: "14 new orders imported successfully.",
      time: "5m ago",
      type: "success",
    },
  ];

  return (
    <>
    {impersonating && (
      <div className="bg-amber-500 text-black text-xs font-semibold px-4 py-2 flex items-center justify-center gap-3">
        <Icons.Eye className="w-3.5 h-3.5" />
        <span>
          Viewing as <b>{impersonating}</b> — impersonation mode
        </span>
        <button
          onClick={() => {
            impersonation.stop();
            window.location.href = "/admin";
          }}
          className="underline font-bold hover:opacity-80"
        >
          Exit to admin
        </button>
      </div>
    )}
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex flex-col border-r border-border bg-card/65 backdrop-blur-xl shrink-0 h-screen sticky top-0 transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
        {/* Header/Logo */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-2 h-16 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <Icons.Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            {!collapsed && (
              <div className="animate-scale-in origin-left">
                <h1 className="font-bold text-sm leading-none text-foreground whitespace-nowrap">Commerce OS</h1>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Profit Intel</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <Icons.ChevronRight className="w-4 h-4" /> : <Icons.ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1.5 scrollbar-thin">
          {navigationItems.map((item) => {
            const IconComponent = (Icons as any)[item.icon] || Icons.HelpCircle;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all group ${
                  active
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IconComponent className={`w-4 h-4 transition-colors shrink-0 ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                  {!collapsed && <span className="whitespace-nowrap animate-scale-in origin-left">{item.label}</span>}
                </div>
                {!collapsed && item.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    active ? "bg-white/20 text-white" : "bg-primary/10 text-primary border border-primary/20"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Shopify Connected Pill */}
        <div className={`p-4 border-t border-border bg-muted/5 flex justify-center ${collapsed ? "px-2" : "px-4"}`}>
          {collapsed ? (
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400" title="Shopify Connected">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold w-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>Shopify Connected</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Sidebar - Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex flex-col w-64 bg-card border-r border-border h-full animate-slide-in-left">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white">
                  <Icons.Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="font-bold text-sm">Commerce OS</h1>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Profit Intel</span>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-lg hover:bg-muted"
              >
                <Icons.X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {navigationItems.map((item) => {
                const IconComponent = (Icons as any)[item.icon] || Icons.HelpCircle;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                      active
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComponent className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile bottom sync option */}
            <div className="p-4 border-t border-border bg-muted/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-foreground">Shopify Sync</span>
                </div>
                <button
                  onClick={triggerSync}
                  disabled={syncing}
                  className="text-[10px] text-primary hover:underline font-semibold"
                >
                  {syncing ? "Syncing..." : "Sync Now"}
                </button>
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1">
                <span>Last sync: {lastSync}</span>
                <Icons.RefreshCw className={`w-2.5 h-2.5 ${syncing ? "animate-spin text-primary" : ""}`} />
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-card/40 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <Icons.Menu className="w-5 h-5" />
            </button>

            {/* Quick search input */}
            <div className="relative hidden md:block w-72">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search queries, orders, products..."
                className="w-full pl-9 pr-12 py-1.5 rounded-lg bg-muted/10 border border-border focus:border-primary/50 text-xs outline-none transition-all placeholder:text-muted-foreground/60 text-foreground"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border/40 bg-muted/20 text-[9px] text-muted-foreground font-mono leading-none">
                <span>⌘</span>K
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync trigger icon (header) */}
            <button
              onClick={triggerSync}
              className={`p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors hidden sm:block ${syncing ? "animate-spin text-primary" : ""}`}
              title="Force Sync"
            >
              <Icons.RefreshCw className="w-4 h-4" />
            </button>

            {/* Dynamic Single-Icon Theme Toggler */}
            <button
              onClick={handleCycleTheme}
              title={themeMeta.label}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center relative active:scale-95 duration-100"
              aria-label="Cycle theme preference"
            >
              <ActiveThemeIcon className="w-4 h-4 text-foreground animate-scale-in" />
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setProfileOpen(false);
                }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative"
              >
                <Icons.Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 glass-card border border-border rounded-xl shadow-2xl p-2 z-50 animate-scale-in origin-top-right bg-card">
                    <div className="p-3 border-b border-border flex items-center justify-between">
                      <h3 className="text-xs font-bold text-foreground">Notifications</h3>
                      <button className="text-[10px] text-primary hover:underline font-semibold">Mark read</button>
                    </div>
                    <div className="py-1 max-h-64 overflow-y-auto divide-y divide-border scrollbar-thin">
                      {mockNotifications.map((n) => (
                        <div key={n.id} className="p-3 hover:bg-muted/10 transition-colors flex gap-2.5">
                          <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs ${
                            n.type === "alert" ? "bg-red-500/10 text-red-500" :
                            n.type === "warning" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                          }`}>
                            {n.type === "alert" ? <Icons.AlertTriangle className="w-4 h-4" /> :
                             n.type === "warning" ? <Icons.AlertCircle className="w-4 h-4" /> : <Icons.Check className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{n.desc}</p>
                            <span className="text-[9px] text-muted-foreground/60 mt-1 block">{n.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="w-px h-5 bg-border" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div className="w-8 h-8 rounded bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block leading-tight pr-1">
                  <p className="text-xs font-semibold text-foreground leading-none">{user.name.split(" ")[0]}</p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5 leading-none">{user.role}</p>
                </div>
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 glass-card border border-border rounded-xl shadow-2xl p-1.5 z-50 animate-scale-in origin-top-right bg-card">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                      <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold capitalize mt-1.5">
                        {user.role}
                      </span>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
                      >
                        <Icons.User className="w-4.5 h-4.5" />
                        <span>My Profile</span>
                      </Link>
                      <Link
                        href="/dashboard/settings?tab=billing"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
                      >
                        <Icons.CreditCard className="w-4.5 h-4.5" />
                        <span>Billing & Upgrade</span>
                      </Link>
                    </div>
                    <div className="border-t border-border pt-1 mt-1">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors text-left"
                      >
                        <Icons.LogOut className="w-4.5 h-4.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Subpage Content Panel */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin">
          <div className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Chat Widget */}
      <FloatingChatWidget />
    </div>
    </>
  );
}
