"use client";

import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { adminApi, type PlatformMetrics } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";

function inr(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

const CARDS: {
  key: keyof PlatformMetrics;
  label: string;
  icon: string;
  fmt: (n: number) => string;
}[] = [
  { key: "mrr", label: "MRR", icon: "TrendingUp", fmt: inr },
  { key: "arr", label: "ARR", icon: "Landmark", fmt: inr },
  { key: "activeOrganizations", label: "Active Clients", icon: "Building2", fmt: (n) => String(n) },
  { key: "activeStores", label: "Active Stores", icon: "ShoppingBag", fmt: (n) => String(n) },
  { key: "connectedIntegrations", label: "Connected Integrations", icon: "Plug", fmt: (n) => String(n) },
  { key: "totalOrdersProcessed", label: "Orders Processed", icon: "Package", fmt: (n) => n.toLocaleString("en-IN") },
  { key: "aiQueriesProcessed", label: "AI Queries", icon: "Sparkles", fmt: (n) => n.toLocaleString("en-IN") },
  { key: "churnRate", label: "Churn Rate", icon: "TrendingDown", fmt: (n) => `${n}%` },
];

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setMetrics(await adminApi.metrics());
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load metrics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Platform Overview</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Real-time health of the whole business.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((c) => {
          const Icon = (Icons as any)[c.icon] || Icons.Circle;
          return (
            <div
              key={c.key}
              className="rounded-2xl border border-border bg-card/40 backdrop-blur-md p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {c.label}
                </span>
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-extrabold">
                {loading || !metrics ? (
                  <span className="inline-block h-7 w-24 rounded bg-muted/30 animate-pulse" />
                ) : (
                  c.fmt(metrics[c.key])
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}