"use client";

import React, { useEffect, useState } from "react";
import { Search, Eye, User, Tag, CreditCard, X, ArrowUpRight, Ban, CheckCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { dataApi } from "@/lib/data-api";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import type { Order } from "@/types";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await dataApi.orders(200, 0);
        if (!active) return;
        // Map API DTOs (nullable fields) into the UI Order shape.
        setOrders(
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
          }))
        );
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load orders");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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

  const updateOrderStatus = (orderId: string, newStatus: Order["status"]) => {
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        let newProfit = o.profit;
        if (newStatus === "refunded") {
          newProfit = -Math.round(o.total * 0.45); // Simulate penalty/lost cost
        } else if (newStatus === "cancelled") {
          newProfit = 0;
        }
        const updatedOrder = { ...o, status: newStatus, profit: newProfit };
        // Update selected order details on the fly
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(updatedOrder);
        }
        return updatedOrder;
      }
      return o;
    });
    setOrders(updated);
  };

  const getTabCount = (status: string) => {
    if (status === "all") return orders.length;
    return orders.filter((o) => o.status.toLowerCase() === status.toLowerCase()).length;
  };

  const tabs = ["all", "pending", "processing", "shipped", "delivered", "cancelled", "refunded"];

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

      {/* Orders Table Card */}
      <Card className="overflow-hidden border-border bg-card">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[700px]">
            <thead>
              <tr className="bg-muted/10 text-muted-foreground border-b border-border">
                <th className="p-4 font-semibold text-[10px] tracking-wider">ORDER</th>
                <th className="p-4 font-semibold text-[10px] tracking-wider">CUSTOMER</th>
                <th className="p-4 font-semibold text-[10px] tracking-wider">DATE</th>
                <th className="p-4 font-semibold text-[10px] tracking-wider">STATUS</th>
                <th className="p-4 font-semibold text-[10px] tracking-wider">CHANNEL</th>
                <th className="p-4 font-semibold text-right text-[10px] tracking-wider">TOTAL</th>
                <th className="p-4 font-semibold text-right text-[10px] tracking-wider">PROFIT</th>
                <th className="p-4 font-semibold text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.map((o) => {
                const profitColor = o.profit > 0 ? "text-emerald-400 font-bold" : o.profit < 0 ? "text-red-400 font-bold" : "text-muted-foreground";
                return (
                  <tr key={o.id} className="hover:bg-muted/5 transition-colors group">
                    <td className="p-4 font-bold text-foreground">{o.id}</td>
                    <td className="p-4">
                      <div className="font-semibold text-foreground">{o.customer}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">{o.email}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-foreground">{formatDate(o.date)}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">{formatDate(o.date)}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] uppercase font-bold ${getStatusColor(o.status)}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground font-medium">{o.channel}</td>
                    <td className="p-4 text-right font-semibold text-foreground">{formatCurrency(o.total)}</td>
                    <td className={`p-4 text-right ${profitColor}`}>{formatCurrency(o.profit)}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedOrder(o)}
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
                  <td colSpan={8} className="text-center py-8 text-muted-foreground text-sm bg-card">
                    No orders match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Order Detail Modal Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-lg bg-card border-l border-border h-full shadow-2xl flex flex-col p-6 animate-slide-in-right overflow-y-auto scrollbar-thin">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
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
            <div className="flex-1 py-6 space-y-6">
              {/* Order Status & Simulation Controls */}
              <div className="p-4 rounded-xl border border-border bg-muted/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Order Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] uppercase font-bold ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>

                {/* Simulated updates */}
                <div className="pt-3 border-t border-border flex flex-col gap-2">
                  <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">Simulate Status Transition</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOrder.status !== "delivered" && selectedOrder.status !== "refunded" && selectedOrder.status !== "cancelled" && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, "delivered")}
                        className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-semibold hover:bg-emerald-500/20 transition-all flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" /> Mark Delivered
                      </button>
                    )}
                    {selectedOrder.status !== "refunded" && selectedOrder.status !== "cancelled" && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, "refunded")}
                        className="px-2 py-1 rounded bg-purple-500/10 text-purple-500 border border-purple-500/20 text-[10px] font-semibold hover:bg-purple-500/20 transition-all flex items-center gap-1"
                      >
                        <ArrowUpRight className="w-3 h-3" /> Simulate RTO / Refund
                      </button>
                    )}
                    {selectedOrder.status !== "cancelled" && selectedOrder.status !== "delivered" && selectedOrder.status !== "refunded" && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, "cancelled")}
                        className="px-2 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-semibold hover:bg-red-500/20 transition-all flex items-center gap-1"
                      >
                        <Ban className="w-3 h-3" /> Cancel Order
                      </button>
                    )}
                  </div>
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
                <div className="p-3 rounded-xl border border-border bg-muted/5">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-foreground">Standard Item Sync</p>
                      <p className="text-[10px] text-muted-foreground">Items synced from Shopify</p>
                    </div>
                    <span className="font-bold text-foreground">x{selectedOrder.items}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="border-t border-border pt-4 mt-auto">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground transition-all border border-border"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
