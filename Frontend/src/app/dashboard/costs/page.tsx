"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Coins,
  Plus,
  History,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Trash2,
  Info,
  PackageSearch,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  dataApi,
  type LandingCostSkuDTO,
  type LandingCostEntryDTO,
  type ProductDTO,
} from "@/lib/data-api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—";

export default function ProductCostsPage() {
  const { user } = useAuth();
  const canEdit = user?.role !== "viewer";

  const [skus, setSkus] = useState<LandingCostSkuDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form
  const [sku, setSku] = useState("");
  const [cost, setCost] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // history expansion
  const [openSku, setOpenSku] = useState<string | null>(null);
  const [history, setHistory] = useState<LandingCostEntryDTO[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = () =>
    dataApi
      .landingCosts()
      .then(setSkus)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load product costs"));

  useEffect(() => {
    Promise.all([load(), dataApi.products().then(setProducts).catch(() => {})]).finally(() =>
      setLoading(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Products that don't yet have a landed cost — surfaced so they're easy to find.
  const pricedSet = useMemo(() => new Set(skus.map((s) => s.sku)), [skus]);
  const unpriced = useMemo(
    () => products.filter((p) => p.sku && !pricedSet.has(p.sku)),
    [products, pricedSet]
  );
  const nameForSku = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach((p) => p.sku && m.set(p.sku, p.name));
    return m;
  }, [products]);

  const openHistory = async (s: string) => {
    if (openSku === s) {
      setOpenSku(null);
      return;
    }
    setOpenSku(s);
    setHistoryLoading(true);
    try {
      setHistory(await dataApi.landingCostHistory(s));
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFlash(null);
    setError(null);
    const value = parseFloat(cost);
    if (!sku.trim() || isNaN(value) || value < 0) {
      setError("Enter a SKU and a valid cost (₹0 or more).");
      return;
    }
    setSubmitting(true);
    try {
      await dataApi.createLandingCost({
        sku: sku.trim(),
        cost: value,
        effectiveFrom: effectiveFrom || null,
        note: note.trim() || null,
      });
      setFlash(`Saved landed cost for ${sku.trim()}. Profit is recomputing for affected orders.`);
      setSku("");
      setCost("");
      setNote("");
      setEffectiveFrom(today());
      await load();
      // If a history panel is open, refresh it in place (without toggling).
      if (openSku) {
        try {
          setHistory(await dataApi.landingCostHistory(openSku));
        } catch {
          /* leave existing history */
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the cost.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (entry: LandingCostEntryDTO) => {
    setError(null);
    try {
      await dataApi.deleteLandingCost(entry.id);
      setHistory((h) => h.filter((x) => x.id !== entry.id));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the entry.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Product Costs</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          The real landed cost per SKU — what it actually costs you to stock a product. This overrides
          Shopify&apos;s cost in your true-profit numbers.
        </p>
      </div>

      {/* How it works */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 text-sm text-muted-foreground flex gap-3">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p>
          Costs are <b className="text-foreground">effective-dated</b>. The first cost you set for a SKU
          applies to <b className="text-foreground">all its existing orders</b>. When the cost changes,
          add a new one with a later date — only orders on/after that date use the new price, and{" "}
          <b className="text-foreground">past orders keep the cost they had</b>. Every change is kept as
          history.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}
      {flash && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {flash}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "SKUs Priced", value: skus.length.toLocaleString("en-IN"), icon: Coins },
          { label: "Products Missing Cost", value: unpriced.length.toLocaleString("en-IN"), icon: PackageSearch },
          {
            label: "Total Cost Changes",
            value: skus.reduce((s, x) => s + x.entries, 0).toLocaleString("en-IN"),
            icon: History,
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {s.label}
                  </span>
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="text-xl font-extrabold text-foreground">{s.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add / update cost */}
      {canEdit && (
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-5">
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Set a landed cost
            </h2>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  SKU
                </label>
                <Input
                  list="sku-options"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. TSHIRT-BLK-M"
                  className="mt-1.5"
                />
                <datalist id="sku-options">
                  {products
                    .filter((p) => p.sku)
                    .map((p) => (
                      <option key={p.id} value={p.sku as string}>
                        {p.name}
                      </option>
                    ))}
                </datalist>
              </div>
              <div className="md:col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Landed cost (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                  className="mt-1.5"
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Effective from
                </label>
                <Input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Note (optional)
                </label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="supplier, batch…"
                  className="mt-1.5"
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Saving…" : "Save cost"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Costs table */}
      {loading ? (
        <div className="h-64 rounded-2xl bg-muted/10 border border-border animate-pulse" />
      ) : skus.length === 0 ? (
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/20 text-muted-foreground flex items-center justify-center mx-auto">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No product costs yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Add the real landed cost for a SKU above. It&apos;ll flow into your profit numbers and stay
              locked to each order&apos;s date.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">SKU</th>
                    <th className="px-5 py-3 font-semibold">Product</th>
                    <th className="px-5 py-3 font-semibold text-right">Current cost</th>
                    <th className="px-5 py-3 font-semibold">In effect since</th>
                    <th className="px-5 py-3 font-semibold text-right">Changes</th>
                    <th className="px-5 py-3 font-semibold text-right">History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {skus.map((s) => (
                    <React.Fragment key={s.sku}>
                      <tr className="hover:bg-muted/5">
                        <td className="px-5 py-3 font-mono text-xs text-foreground">{s.sku}</td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {s.productName || nameForSku.get(s.sku) || "—"}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-foreground">
                          {inr(s.currentCost)}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{fmtDate(s.effectiveFrom)}</td>
                        <td className="px-5 py-3 text-right text-muted-foreground">{s.entries}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => openHistory(s.sku)}
                            className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold"
                          >
                            {openSku === s.sku ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                            View
                          </button>
                        </td>
                      </tr>
                      {openSku === s.sku && (
                        <tr className="bg-muted/5">
                          <td colSpan={6} className="px-5 py-4">
                            {historyLoading ? (
                              <div className="h-16 rounded-lg bg-muted/10 animate-pulse" />
                            ) : (
                              <div className="space-y-2">
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                                  <History className="w-3.5 h-3.5" /> Cost history — newest first
                                </p>
                                {history.map((h) => (
                                  <div
                                    key={h.id}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-card/40 px-4 py-2.5"
                                  >
                                    <div className="flex items-center gap-4 min-w-0">
                                      <span className="font-semibold text-foreground w-20 shrink-0">
                                        {inr(h.cost)}
                                      </span>
                                      <span className="text-xs text-muted-foreground shrink-0">
                                        from {fmtDate(h.effectiveFrom)}
                                      </span>
                                      {h.note && (
                                        <span className="text-xs text-muted-foreground/80 truncate italic">
                                          “{h.note}”
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      <span className="text-[10px] text-muted-foreground/60 hidden sm:block">
                                        {h.createdBy ? `by ${h.createdBy}` : ""}
                                      </span>
                                      {canEdit && (
                                        <button
                                          onClick={() => remove(h)}
                                          title="Delete this cost entry"
                                          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
