"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Eye, User, Tag, CreditCard, X, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { dataApi } from "@/lib/data-api";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import type { Order } from "@/types";

const PAGE_SIZE = 50;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [period, setPeriod] = useState<"all" | "today" | "7d" | "30d" | "6m" | "custom">("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const range = useMemo<{ start?: string; end?: string }>(() => {
    const now = new Date();
    const iso = (d: Date) => d.toISOString();
    const back = (days: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      return d;
    };
    if (period === "today") {
      const s = new Date();
      s.setHours(0, 0, 0, 0);
      return { start: iso(s) };
    }
    if (period === "7d") return { start: iso(back(7)) };
    if (period === "30d") return { start: iso(back(30)) };
    if (period === "6m") {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return { start: iso(d) };
    }
    if (period === "custom")
      return {
        start: customStart || undefined,
        end: customEnd ? `${customEnd}T23:59:59` : undefined,
      };
    return {};
  }, [period, customStart, customEnd]);

  const mapRows = (rows: Awaited<ReturnType<typeof dataApi.orders>>): Order[] =>
    rows.map((o) => ({
      id: o.id,
      customer: o.customer ?? "Guest",
      email: o.email ?? "",
      date: o.date ?? "",
      total: o.total,
      subtotal: o.subtotal,
      shipping: o.shipping,
      tax: o.tax,
      discount: o.discount,
      items: o.items,
      status: o.status as Order["status"],
      paymentMethod: o.paymentMethod ?? "",
      profit: o.profit,
      channel: o.channel ?? "Shopify",
      paymentStatus: o.paymentStatus ?? undefined,
      fulfillmentStatus: o.fulfillmentStatus ?? undefined,
      lineItems: o.lineItems ?? [],
    }));

  // Reset to page 1 whenever the date range changes.
  useEffect(() => {
    setPage(1);
  }, [range.start, range.end]);

  // Total count drives the page numbers.
  useEffect(() => {
    dataApi
      .ordersCount(range.start, range.end)
      .then((r) => setTotal(r.total))
      .catch(() => setTotal(0));
  }, [range.start, range.end]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const rows = await dataApi.orders(PAGE_SIZE, (page - 1) * PAGE_SIZE, range.start, range.end);
        if (!active) return;
        setOrders(mapRows(rows));
        setHasMore(rows.length === PAGE_SIZE);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load orders");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [range.start, range.end, page]);

  // Search & Filter logic
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ? true : o.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getTabCount = (status: string) => {
    if (status === "all") return orders.length;
    return orders.filter((o) => o.status.toLowerCase() === status.toLowerCase()).length;
  };

  const tabs = ["all", "pending", "processing", "shipped", "delivered", "cancelled", "refunded"];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const paymentBadge = (st?: string) => {
    const v = (st || "").toLowerCase();
    if (v === "paid") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (v.includes("refund")) return "bg-red-500/10 text-red-400 border-red-500/20";
    if (v === "pending" || v === "authorized" || v === "partially_paid")
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    return "bg-muted/10 text-muted-foreground border-border";
  };
  const fulfillmentBadge = (st?: string) => {
    const v = (st || "unfulfilled").toLowerCase();
    if (v === "fulfilled") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (v === "partial") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  };
  const labelize = (st?: string, fallback = "—") => (st ? st.replace(/_/g, " ") : fallback);

  const pager = (
    <div className="flex items-center justify-between gap-2 px-1">
      <button
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1 || loading}
        className="px-4 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/10 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ← Previous
      </button>
      <span className="text-xs font-semibold text-muted-foreground">
        Page {page} of {totalPages}
        <span className="text-muted-foreground/60"> · {total.toLocaleString()} orders</span>
      </span>
      <button
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page >= totalPages || loading}
        className="px-4 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/10 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next →
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search orders, customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border focus:border-primary/50 text-sm outline-none transition-all placeholder:text-muted-foreground/60 text-foreground"
        />
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          ["today", "Today"],
          ["7d", "7 days"],
          ["30d", "1 month"],
          ["6m", "6 months"],
          ["all", "All time"],
          ["custom", "Custom"],
        ] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setPeriod(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              period === val
                ? "bg-primary/20 text-primary border-primary/30"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/10"
            }`}
          >
            {label}
          </button>
        ))}
        {period === "custom" && (
          <>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground"
            />
          </>
        )}
      </div>

      {/* Status Tab list */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const count = getTabCount(t);
          const label = t === "all" ? `All (${count})` : `${t.charAt(0).toUpperCase() + t.slice(1)} (${count})`;
          return (
            <button
              key={t}
              onClick={() => setStatusFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                statusFilter === t
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/10"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading orders…
        </div>
      )}

      {pager}

      {/* Orders Table Card */}
      <Card className="overflow-hidden border-border bg-card">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[900px]">
            <thead>
              <tr className="bg-muted/10 text-muted-foreground border-b border-border">
                <th className="p-4 font-semibold text-[10px] tracking-wider">ORDER</th>
                <th className="p-4 font-semibold text-[10px] tracking-wider">DATE</th>
                <th className="p-4 font-semibold text-[10px] tracking-wider">CUSTOMER</th>
                <th className="p-4 font-semibold text-right text-[10px] tracking-wider">TOTAL</th>
                <th className="p-4 font-semibold text-[10px] tracking-wider">PAYMENT</th>
                <th className="p-4 font-semibold text-[10px] tracking-wider">FULFILLMENT</th>
                <th className="p-4 font-semibold text-center text-[10px] tracking-wider">ITEMS</th>
                <th className="p-4 font-semibold text-right text-[10px] tracking-wider">PROFIT</th>
                <th className="p-4 font-semibold text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.map((o) => {
                const profitColor = o.profit > 0 ? "text-emerald-400 font-bold" : o.profit < 0 ? "text-red-400 font-bold" : "text-muted-foreground";
                return (
                  <tr key={o.id} onClick={() => setSelectedOrder(o)} className="hover:bg-muted/5 transition-colors group cursor-pointer">
                    <td className="p-4 font-bold text-primary">{o.id}</td>
                    <td className="p-4 text-muted-foreground whitespace-nowrap">{formatDate(o.date)}</td>
                    <td className="p-4">
                      <div className="font-semibold text-foreground">{o.customer}</div>
                      {o.email && <div className="text-[10px] text-muted-foreground font-normal">{o.email}</div>}
                    </td>
                    <td className="p-4 text-right font-semibold text-foreground">{formatCurrency(o.total)}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] capitalize font-bold ${paymentBadge(o.paymentStatus)}`}>
                        {labelize(o.paymentStatus, "—")}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] capitalize font-bold ${fulfillmentBadge(o.fulfillmentStatus)}`}>
                        {labelize(o.fulfillmentStatus, "unfulfilled")}
                      </span>
                    </td>
                    <td className="p-4 text-center text-muted-foreground font-medium">{o.items}</td>
                    <td className={`p-4 text-right ${profitColor}`}>{formatCurrency(o.profit)}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }}
                        className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center justify-center"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground text-sm bg-card">
                    No orders match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {pager}

      {/* Order Detail Modal Drawer */}
      {selectedOrder &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-lg max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">Shopify Order</span>
                <h2 className="text-lg font-bold text-primary flex items-center gap-1.5">
                  {selectedOrder.id}
                </h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-thin">
              {/* Order Status & Simulation Controls */}
              <div className="p-4 rounded-xl border border-border bg-muted/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Order Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] uppercase font-bold ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* Customer Profile */}
              <div className="space-y-3">
                <h3 className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-primary" /> Customer Profile
                </h3>
                <div className="p-4 rounded-xl border border-border bg-muted/5 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Name</span>
                    <span className="text-xs font-semibold text-foreground">{selectedOrder.customer}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Email</span>
                    <span className="text-xs font-semibold text-foreground truncate block">{selectedOrder.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Date Synchronized</span>
                    <span className="text-xs font-semibold text-foreground">{formatDate(selectedOrder.date)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Channel Origin</span>
                    <span className="text-xs font-semibold text-foreground">{selectedOrder.channel}</span>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="space-y-3">
                <h3 className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-primary" /> Financial Summary
                </h3>
                <div className="p-4 rounded-xl border border-border bg-muted/5 divide-y divide-border space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-right font-medium text-foreground">{formatCurrency(selectedOrder.subtotal)}</span>

                    <span className="text-muted-foreground">Shipping Charged</span>
                    <span className="text-right font-medium text-foreground">{formatCurrency(selectedOrder.shipping)}</span>

                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-right font-medium text-foreground">{formatCurrency(selectedOrder.tax)}</span>

                    {selectedOrder.discount > 0 && (
                      <>
                        <span className="text-red-400 font-semibold">Discount Applied</span>
                        <span className="text-right font-medium text-red-400">-{formatCurrency(selectedOrder.discount)}</span>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 pt-3 text-xs font-bold">
                    <span className="text-foreground">Total Revenue</span>
                    <span className="text-right text-foreground">{formatCurrency(selectedOrder.total)}</span>
                  </div>

                  <div className="grid grid-cols-2 pt-3 text-xs">
                    <div>
                      <span className="font-bold text-foreground block">Net Profit Contribution</span>
                      <span className="text-[10px] text-muted-foreground/60 font-normal">Audited taking COGS + ads</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold block ${selectedOrder.profit > 0 ? "text-emerald-400" : selectedOrder.profit < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                        {formatCurrency(selectedOrder.profit)}
                      </span>
                      {selectedOrder.total > 0 && selectedOrder.profit > 0 && (
                        <span className="text-[10px] text-emerald-500 font-semibold">
                          ({((selectedOrder.profit / selectedOrder.total) * 100).toFixed(0)}% Margin)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items list */}
              <div className="space-y-3">
                <h3 className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-primary" /> Purchased Items ({selectedOrder.items})
                </h3>
                <div className="rounded-xl border border-border bg-muted/5 divide-y divide-border">
                  {(selectedOrder.lineItems ?? []).length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground">No item details available.</div>
                  ) : (
                    (selectedOrder.lineItems ?? []).map((li, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{li.title || "Item"}</p>
                          {li.sku && <p className="text-[10px] text-muted-foreground">SKU: {li.sku}</p>}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className="font-bold text-foreground">x{li.quantity}</span>
                          <p className="text-[10px] text-muted-foreground">{formatCurrency(li.unitPrice)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="border-t border-border px-6 pb-6 pt-4 shrink-0">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground transition-all border border-border"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}
