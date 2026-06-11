"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Users, Award, AlertTriangle, CheckCircle, Phone, MapPin, DollarSign, RefreshCw, X, ShoppingBag, Package, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dataApi, type CustomerDetailDTO } from "@/lib/data-api";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import type { Customer } from "@/types";

const PAGE_SIZE = 50;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [engagementMsg, setEngagementMsg] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Customer detail drawer
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetailDTO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openCustomer = async (id: string) => {
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await dataApi.customerDetail(id));
    } catch {
      /* keep drawer open with headline stats only */
    } finally {
      setDetailLoading(false);
    }
  };
  const closeDetail = () => {
    setOpenId(null);
    setDetail(null);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const rows = await dataApi.customers(PAGE_SIZE, (page - 1) * PAGE_SIZE);
        if (!active) return;
        setCustomers(
          rows.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email ?? "",
            phone: c.phone ?? "",
            totalOrders: c.totalOrders,
            totalSpent: c.totalSpent,
            ltv: c.ltv,
            lastOrder: c.lastOrder ?? "",
            city: c.city ?? "",
            segment: c.segment as Customer["segment"],
          }))
        );
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load customers");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [page]);

  useEffect(() => {
    dataApi.customersCount().then((r) => setTotal(r.total)).catch(() => setTotal(0));
  }, []);

  // Search & Filter
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase());

    const matchesSegment =
      segmentFilter === "all" ? true : c.segment.toLowerCase() === segmentFilter.toLowerCase();

    return matchesSearch && matchesSegment;
  });

  const triggerEngagement = (segment: string) => {
    setEngagementMsg(`Simulated notification dispatched to all ${segment.toUpperCase()} cohorts successfully!`);
    setTimeout(() => setEngagementMsg(""), 3500);
  };

  // Segments stats
  const vipCount = customers.filter((c) => c.segment === "vip").length;
  const atRiskCount = customers.filter((c) => c.segment === "at-risk").length;
  const avgLTV = customers.length
    ? Math.round(customers.reduce((acc, c) => acc + c.ltv, 0) / customers.length)
    : 0;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pager = (
    <div className="flex items-center justify-between gap-2 px-1">
      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading} className="px-4 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/10 disabled:opacity-40 disabled:cursor-not-allowed">← Previous</button>
      <span className="text-xs font-semibold text-muted-foreground">Page {page} of {totalPages}<span className="text-muted-foreground/60"> · {total.toLocaleString()} customers</span></span>
      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} className="px-4 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/10 disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customers</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Understand your customer segments and lifetime value
        </p>
      </div>

      {/* Engagement Banner Popup */}
      {engagementMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-xs font-semibold animate-scale-in">
          <CheckCircle className="w-4 h-4 animate-bounce" />
          <span>{engagementMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading customers…
        </div>
      )}

      {/* Metrics Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Total Customers</CardTitle>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-foreground">{total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">VIP Customers</CardTitle>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Award className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-foreground">{vipCount}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">At-Risk</CardTitle>
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-red-400">{atRiskCount}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Avg LTV</CardTitle>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-foreground">{formatCurrency(avgLTV)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Segments Filters */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border focus:border-primary/50 text-sm outline-none transition-all placeholder:text-muted-foreground/60 text-foreground"
          />
        </div>

        {/* Segment selection tabs */}
        <div className="flex flex-wrap gap-2">
          {["all", "vip", "regular", "new", "at-risk"].map((s) => {
            const label = s === "all" ? "All" : s === "at-risk" ? "At Risk" : s.charAt(0).toUpperCase() + s.slice(1);
            return (
              <button
                key={s}
                onClick={() => setSegmentFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  segmentFilter === s
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/10"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {pager}

      {/* Customer table */}
      <Card className="overflow-hidden border-border bg-card">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[760px]">
            <thead>
              <tr className="bg-muted/10 text-muted-foreground border-b border-border">
                <th className="p-4 font-semibold text-[10px] tracking-wider">CUSTOMER</th>
                <th className="p-4 font-semibold text-[10px] tracking-wider">LOCATION</th>
                <th className="p-4 font-semibold text-[10px] tracking-wider">SEGMENT</th>
                <th className="p-4 font-semibold text-center text-[10px] tracking-wider">ORDERS</th>
                <th className="p-4 font-semibold text-right text-[10px] tracking-wider">AMOUNT SPENT</th>
                <th className="p-4 font-semibold text-right text-[10px] tracking-wider">LTV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.map((c) => {
                const initials = c.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
                return (
                  <tr key={c.id} onClick={() => openCustomer(c.id)} className="hover:bg-muted/5 transition-colors cursor-pointer">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate">{c.name}</div>
                          {c.email && <div className="text-[10px] text-muted-foreground truncate">{c.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{c.city || "—"}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-[9px] uppercase font-bold ${
                        c.segment === "vip" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                        c.segment === "at-risk" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                        c.segment === "new" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                        "bg-muted/10 text-muted-foreground border-border"
                      }`}>
                        {c.segment === "at-risk" ? "At Risk" : c.segment}
                      </span>
                    </td>
                    <td className="p-4 text-center font-semibold text-foreground">{c.totalOrders}</td>
                    <td className="p-4 text-right font-semibold text-foreground">{formatCurrency(c.totalSpent)}</td>
                    <td className="p-4 text-right font-semibold text-emerald-400">{formatCurrency(c.ltv)}</td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm bg-card">
                    No customers match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {pager}

      {/* Customer Detail Drawer */}
      {openId &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDetail} />
          <div className="relative w-full max-w-lg max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {(() => {
              const base = customers.find((c) => c.id === openId);
              const name = detail?.name ?? base?.name ?? "Customer";
              const email = detail?.email ?? base?.email ?? "";
              const phone = detail?.phone ?? base?.phone ?? "";
              const city = detail?.city ?? base?.city ?? "";
              const segment = detail?.segment ?? base?.segment ?? "regular";
              const totalOrders = detail?.totalOrders ?? base?.totalOrders ?? 0;
              const totalSpent = detail?.totalSpent ?? base?.totalSpent ?? 0;
              const ltv = detail?.ltv ?? base?.ltv ?? 0;
              const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2);
              return (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {initials}
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-foreground leading-tight">{name}</h2>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full border text-[9px] uppercase font-bold ${
                          segment === "vip" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          segment === "at-risk" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                          segment === "new" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          "bg-muted/10 text-muted-foreground border-border"
                        }`}>
                          {segment === "at-risk" ? "At Risk" : segment}
                        </span>
                      </div>
                    </div>
                    <button onClick={closeDetail} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto scrollbar-thin">
                    {/* Contact */}
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <span className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" /> {email || "No email on file"}</span>
                      <span className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" /> {phone || "—"}</span>
                      <span className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-3.5 h-3.5" /> {city || "—"}</span>
                    </div>

                    {/* Lifetime stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-muted/10 border border-border/40 rounded-xl p-3 text-center">
                        <span className="text-[9px] text-muted-foreground block font-semibold uppercase">Orders</span>
                        <span className="text-lg font-bold text-foreground">{totalOrders}</span>
                      </div>
                      <div className="bg-muted/10 border border-border/40 rounded-xl p-3 text-center">
                        <span className="text-[9px] text-muted-foreground block font-semibold uppercase">Total Spent</span>
                        <span className="text-lg font-bold text-foreground">{formatCurrency(totalSpent)}</span>
                      </div>
                      <div className="bg-muted/10 border border-border/40 rounded-xl p-3 text-center">
                        <span className="text-[9px] text-muted-foreground block font-semibold uppercase">LTV</span>
                        <span className="text-lg font-bold text-emerald-400">{formatCurrency(ltv)}</span>
                      </div>
                    </div>

                    {detailLoading && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Loading purchase history…
                      </div>
                    )}

                    {/* Products purchased */}
                    <div className="space-y-3">
                      <h3 className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-primary" /> Products Purchased
                        {detail && <span className="text-muted-foreground/60 font-normal">({detail.products.length})</span>}
                      </h3>
                      {detail && detail.products.length > 0 ? (
                        <div className="rounded-xl border border-border overflow-hidden">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-muted/10 text-muted-foreground">
                              <tr>
                                <th className="p-2.5 font-semibold">Product</th>
                                <th className="p-2.5 font-semibold text-center">Qty</th>
                                <th className="p-2.5 font-semibold text-right">Revenue</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {detail.products.map((p, i) => (
                                <tr key={i} className="hover:bg-muted/5">
                                  <td className="p-2.5 text-foreground">
                                    <div className="font-medium truncate max-w-[220px]">{p.title || "Item"}</div>
                                    {p.sku && <div className="text-[10px] text-muted-foreground">{p.sku}</div>}
                                  </td>
                                  <td className="p-2.5 text-center font-semibold text-foreground">{p.quantity}</td>
                                  <td className="p-2.5 text-right font-medium text-foreground">{formatCurrency(p.revenue)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        !detailLoading && (
                          <p className="text-xs text-muted-foreground bg-muted/5 border border-border/40 rounded-xl p-3">
                            No synced line-items for this customer yet
                            {email ? "" : " (no email on the customer record to match orders)"}.
                          </p>
                        )
                      )}
                    </div>

                    {/* Order history */}
                    <div className="space-y-3">
                      <h3 className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-primary" /> Order History
                        {detail && <span className="text-muted-foreground/60 font-normal">({detail.orders.length})</span>}
                      </h3>
                      {detail && detail.orders.length > 0 ? (
                        <div className="rounded-xl border border-border overflow-hidden">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-muted/10 text-muted-foreground">
                              <tr>
                                <th className="p-2.5 font-semibold">Order</th>
                                <th className="p-2.5 font-semibold">Date</th>
                                <th className="p-2.5 font-semibold">Status</th>
                                <th className="p-2.5 font-semibold text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {detail.orders.map((o) => (
                                <tr key={o.id} className="hover:bg-muted/5">
                                  <td className="p-2.5 font-semibold text-primary">{o.id}</td>
                                  <td className="p-2.5 text-muted-foreground">{o.date ? formatDate(o.date) : "—"}</td>
                                  <td className="p-2.5">
                                    <span className={`px-2 py-0.5 rounded-full border text-[9px] uppercase font-bold ${getStatusColor(o.status)}`}>
                                      {o.status}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-right font-medium text-foreground">{formatCurrency(o.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        !detailLoading && (
                          <p className="text-xs text-muted-foreground bg-muted/5 border border-border/40 rounded-xl p-3">
                            {totalOrders > 0
                              ? "This customer has orders, but their line-items haven't finished syncing yet."
                              : "No orders found for this customer."}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}
