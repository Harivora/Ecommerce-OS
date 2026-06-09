"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  Megaphone,
  Truck,
  CreditCard,
  X,
  ShoppingBag,
  BarChart2,
  RefreshCw,
  AlertTriangle,
  HardDrive,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  integrationsApi,
  CREDENTIAL_FIELD_META,
  type IntegrationDTO,
} from "@/lib/integrations-api";
import { ApiError } from "@/lib/api";

const CATEGORIES = [
  { label: "All", val: "all" },
  { label: "Ecommerce", val: "ecommerce" },
  { label: "Ads", val: "ads" },
  { label: "Shipping", val: "shipping" },
  { label: "Payments", val: "payments" },
  { label: "Backup", val: "backup" },
];

function iconFor(provider: string) {
  switch (provider) {
    case "shopify":
      return { Icon: ShoppingBag, cls: "bg-emerald-950/40 border border-emerald-500/20 text-emerald-400" };
    case "meta":
      return { Icon: Megaphone, cls: "bg-indigo-950/40 border border-indigo-500/20 text-indigo-400" };
    case "google_ads":
      return { Icon: BarChart2, cls: "bg-blue-950/40 border border-blue-500/20 text-blue-400" };
    case "shiprocket":
      return { Icon: Truck, cls: "bg-amber-950/40 border border-amber-500/20 text-amber-400" };
    case "nas":
      return { Icon: HardDrive, cls: "bg-sky-950/40 border border-sky-500/20 text-sky-400" };
    default:
      return { Icon: CreditCard, cls: "bg-muted/10 border border-border text-muted-foreground" };
  }
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const [selected, setSelected] = useState<IntegrationDTO | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoadError(null);
      const data = await integrationsApi.list();
      setIntegrations(data);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      integrations.filter((i) => activeTab === "all" || i.category === activeTab),
    [integrations, activeTab]
  );

  const openModal = (i: IntegrationDTO) => {
    setSelected(i);
    setModalError(null);
    // Seed the form with empty values for each credential field.
    const seed: Record<string, string> = {};
    i.credentialFields.forEach((f) => (seed[f] = ""));
    setForm(seed);
  };

  const closeModal = () => {
    setSelected(null);
    setForm({});
    setModalError(null);
  };

  const handleConnect = async () => {
    if (!selected) return;
    setBusy(true);
    setModalError(null);
    try {
      await integrationsApi.connect(selected.provider, form);
      await load();
      closeModal();
    } catch (e) {
      setModalError(e instanceof ApiError ? e.message : "Could not connect.");
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    setBusy(true);
    try {
      await integrationsApi.disconnect(provider);
      await load();
      closeModal();
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async (provider: string) => {
    setSyncingProvider(provider);
    try {
      await integrationsApi.sync(provider);
      await load();
    } catch {
      /* surfaced via integration.syncError on reload */
    } finally {
      setSyncingProvider(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Connect your tools to build a unified profit picture. Keys are encrypted at rest.
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5 border-b border-border/40 pb-5">
        {CATEGORIES.map((c) => {
          const isActive = activeTab === c.val;
          return (
            <button
              key={c.val}
              onClick={() => setActiveTab(c.val)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                isActive
                  ? "bg-[#181524] border border-violet-500/40 text-foreground"
                  : "bg-muted/10 border border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {loadError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {loadError}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="h-56 rounded-2xl bg-muted/10 border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((i) => {
            const { Icon, cls } = iconFor(i.provider);
            const isConnected = i.status === "connected";
            const isError = i.status === "error";
            const isSyncing = syncingProvider === i.provider;

            return (
              <Card
                key={i.provider}
                className="border border-border bg-card/40 backdrop-blur-md rounded-2xl flex flex-col justify-between hover:border-border/80 transition-all shadow-sm"
              >
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${cls}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isConnected ? (
                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                          Connected
                        </span>
                      ) : isError ? (
                        <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                          Error
                        </span>
                      ) : (
                        <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                          Available
                        </span>
                      )}
                      {!i.hasConnector && (
                        <span className="bg-muted/10 border border-border text-muted-foreground/80 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
                          Manual
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">{i.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{i.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {i.features.map((f, idx) => (
                      <span
                        key={idx}
                        className="bg-muted/20 border border-border/40 text-muted-foreground/90 px-2.5 py-0.5 rounded text-[10px] font-semibold"
                      >
                        {f}
                      </span>
                    ))}
                  </div>

                  {isConnected && i.lastSync && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Last sync: {new Date(i.lastSync).toLocaleString()}
                    </div>
                  )}
                  {isError && i.syncError && (
                    <div className="text-[11px] text-red-400 flex items-start gap-1.5 pt-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{i.syncError}</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-3 pb-6 border-t border-border/30 bg-muted/5 rounded-b-2xl">
                  {isConnected || isError ? (
                    <div className="flex items-center gap-2 w-full">
                      {i.hasConnector && (
                        <button
                          onClick={() => handleSync(i.provider)}
                          disabled={isSyncing}
                          className="flex-1 py-2 px-3 rounded-xl border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                          {isSyncing ? "Syncing…" : "Sync now"}
                        </button>
                      )}
                      <button
                        onClick={() => openModal(i)}
                        className="flex-1 py-2 px-3 rounded-xl border border-border/80 bg-muted/10 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-all text-xs font-semibold"
                      >
                        Manage
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openModal(i)}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-sm"
                    >
                      Connect
                    </button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Setup / Manage modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative max-w-md w-full bg-card border border-border shadow-2xl rounded-2xl p-6 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <h3 className="text-sm font-bold text-foreground">{selected.name} Configuration</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {selected.status === "connected" || selected.status === "error" ? (
              <div className="space-y-4 pt-4">
                <div
                  className={`p-3 text-xs rounded-xl flex items-center gap-2 font-semibold border ${
                    selected.status === "error"
                      ? "bg-red-500/10 border-red-500/20 text-red-400"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  }`}
                >
                  {selected.status === "error" ? (
                    <>
                      <AlertTriangle className="w-4 h-4" /> {selected.syncError || "Last sync failed."}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Integration active and syncing data.
                    </>
                  )}
                </div>
                <div className="text-xs space-y-2 text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Last sync:</strong>{" "}
                    {selected.lastSync ? new Date(selected.lastSync).toLocaleString() : "—"}
                  </p>
                  <p>
                    <strong className="text-foreground">Category:</strong> {selected.category.toUpperCase()}
                  </p>
                </div>
                <div className="flex gap-2 pt-4 border-t border-border">
                  {selected.hasConnector && (
                    <button
                      onClick={() => handleSync(selected.provider)}
                      disabled={syncingProvider === selected.provider}
                      className="flex-1 py-2 rounded-xl border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      Sync now
                    </button>
                  )}
                  <button
                    onClick={() => handleDisconnect(selected.provider)}
                    disabled={busy}
                    className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all text-xs font-semibold disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selected.hasConnector
                    ? `Enter your ${selected.name} credentials. They are validated, then encrypted and stored securely. An initial sync starts automatically.`
                    : `Store your ${selected.name} keys securely (encrypted at rest). Automatic sync for this provider is coming soon.`}
                </p>

                {selected.credentialFields.map((field) => {
                  const meta = CREDENTIAL_FIELD_META[field] || {
                    label: field,
                    type: "text" as const,
                  };
                  return (
                    <div key={field} className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">{meta.label}</label>
                      <input
                        type={meta.type}
                        value={form[field] ?? ""}
                        onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                        placeholder={meta.placeholder}
                        autoComplete="off"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-violet-500/50 outline-none transition-all text-foreground"
                      />
                    </div>
                  );
                })}

                {modalError && (
                  <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{modalError}</p>
                )}

                <div className="flex gap-2 pt-4 border-t border-border">
                  <button
                    onClick={closeModal}
                    disabled={busy}
                    className="flex-1 py-2 rounded-xl border border-border bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConnect}
                    disabled={busy}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity disabled:opacity-50"
                  >
                    {busy ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Connecting…
                      </>
                    ) : (
                      "Connect"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
