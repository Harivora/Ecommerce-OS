"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
  { href: "/admin/clients", label: "Clients", icon: "Building2" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  // Super-admin only. Clients are bounced to their dashboard.
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/login");
    } else if (user.role !== "super_admin") {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/60 backdrop-blur-xl h-screen sticky top-0 shrink-0">
        <div className="p-4 border-b border-border flex items-center gap-2 h-16">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center">
            <Icons.ShieldCheck className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-none">Commerce OS</h1>
            <span className="text-[10px] text-amber-400 uppercase tracking-widest font-semibold">
              Platform Admin
            </span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((item) => {
            const Icon = (Icons as any)[item.icon] || Icons.Circle;
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center font-bold text-xs uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-xs font-semibold truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Icons.LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 h-screen overflow-y-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}