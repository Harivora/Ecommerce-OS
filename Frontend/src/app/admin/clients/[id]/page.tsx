"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import {
  adminApi,
  impersonation,
  type AdminClientDetail,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api";

function inr(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export default function AdminClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [client, setClient] = useState<AdminClientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [datasets, setDatasets] = useState<{ key: string; label: string }[]>([]);
  const [expKey, setExpKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setClient(await adminApi.client(id));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load client");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    adminApi.exportDatasets(id).then(setDatasets).catch(() => setDatasets([]));
  }, [id]);

  const impersonate = async () => {
    setBusy(true);
    try {
      await impersonation.start(id);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not impersonate");
      setBusy(false);
    }
  };

  const exportData = async (key: string) => {
    setExpKey(key);
    try {
      if (key === "__all__") await adminApi.exportAll(id);
      else await adminApi.exportDataset(id, key);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Export failed");
    } finally {
      setExpKey(null);
    }
  };

  const changePlan = async (plan: string) => {
    try {
      await adminApi.setPlan(id, plan);
      setClient(await adminApi.client(id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not change plan");
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading client…</div>;
  }
  if (error || !client) {
    return (
      <div className="space-y-4">
        <Link href="/admin/clients" className="text-sm text-primary">
          ← Back to clients
        </Link>
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error || "Client not found"}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Store Revenue", value: inr(client.totalRevenue), icon: "TrendingUp" },
    { label: "Net Profit", value: inr(client.totalNetProfit), icon: "Wallet" },
    { label: "Avg Margin", value: `${client.avgMargin}%`, icon: "Percent" },
    { label: "Orders", value: client.ordersCount.toLocaleString("en-IN"), icon: "Package" },
    { label: "MRR (pays you)", value: inr(client.monthlyPrice), icon: "Landmark" },
    { label: "Integrations", value: String(client.connectedIntegrations), icon: "Plug" },
    { label: "Stores", value: String(client.storeCount), icon: "ShoppingBag" },
    { label: "AI Queries", value: client.aiQueries.toLocaleString("en-IN"), icon: "Sparkles" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <Link href="/admin/clients" className="text-sm text-primary inline-flex items-center gap-1">
        <Icons.ArrowLeft className="w-3.5 h-3.5" /> Back to clients
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{client.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {client.ownerEmail || "—"} · <span className="capitalize">{client.plan}</span> plan ·{" "}
            <span className="capitalize">{client.status.replace("_", " ")}</span> · since{" "}
            {new Date(client.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={client.plan}
            onChange={(e) => changePlan(e.target.value)}
            className="px-3 py-2 rounded-xl bg-background border border-border text-xs font-semibold text-foreground [&>option]:bg-card [&>option]:text-foreground"
            title="Change this client's plan (controls their feature access)"
          >
            <option value="starter">Starter plan</option>
            <option value="growth">Growth plan</option>
            <option value="scale">Scale plan</option>
          </select>
          <button
            onClick={impersonate}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Icons.LogIn className="w-3.5 h-3.5" /> Log in as client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = (Icons as any)[s.icon] || Icons.Circle;
          return (
            <div key={s.label} className="rounded-2xl border border-border bg-card/40 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {s.label}
                </span>
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="text-xl font-extrabold">{s.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users */}
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Icons.Users className="w-4 h-4" /> Team ({client.users.length})
          </h2>
          <div className="space-y-2">
            {client.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm border-b border-border/30 pb-2">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-[11px] text-muted-foreground">{u.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] capitalize text-muted-foreground">{u.role}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : "never"}
                  </p>
                </div>
              </div>
            ))}
            {client.users.length === 0 && (
              <p className="text-xs text-muted-foreground">No users.</p>
            )}
          </div>
        </div>

        {/* Integrations */}
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Icons.Plug className="w-4 h-4" /> Integrations ({client.integrations.length})
          </h2>
          <div className="space-y-2">
            {client.integrations.map((i) => (
              <div key={i.provider} className="flex items-center justify-between text-sm border-b border-border/30 pb-2">
                <span className="font-medium">{i.name}</span>
                <div className="text-right">
                  <span className="text-[11px] capitalize text-muted-foreground">{i.status}</span>
                  <p className="text-[10px] text-muted-foreground">
                    {i.lastSync ? new Date(i.lastSync).toLocaleString() : "never synced"}
                  </p>
                </div>
              </div>
            ))}
            {client.integrations.length === 0 && (
              <p className="text-xs text-muted-foreground">No integrations connected.</p>
            )}
          </div>
        </div>
      </div>

      {/* Data export */}
      <div className="rounded-2xl border border-border bg-card/40 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Icons.Download className="w-4 h-4" /> Export this client&apos;s data
          </h2>
          <button
            onClick={() => exportData("__all__")}
            disabled={expKey !== null}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            {expKey === "__all__" ? (
              <Icons.RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Icons.FileArchive className="w-3.5 h-3.5" />
            )}
            Download all (ZIP)
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {datasets.map((d) => (
            <button
              key={d.key}
              onClick={() => exportData(d.key)}
              disabled={expKey !== null}
              className="px-3 py-1.5 rounded-lg border border-border/80 bg-muted/10 hover:bg-muted/20 text-xs font-medium text-foreground inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {expKey === d.key ? (
                <Icons.RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Icons.Download className="w-3 h-3" />
              )}
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}