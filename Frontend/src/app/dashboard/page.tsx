"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, ShoppingBag, DollarSign, ShoppingCart, TrendingUp, ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  dataApi,
  type KPIData,
  type RevenueDataPoint,
  type ProfitBreakdownItem,
  type OrderDTO,
  type ProductDTO,
} from "@/lib/data-api";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

// Helper for drawing SVG Sparklines inside KPI Cards
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const width = 100;
  const height = 30;
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - 2 - ((val - min) / range) * (height - 4);
      return `${x},${y}`;
    })
    .join(" ");

  const fillPoints = `0,${height} ${points} ${width},${height}`;
  const strokeColor = positive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"; // emerald-500 or red-500
  const gradId = `grad-${positive ? "pos" : "neg"}`;

  return (
    <svg className="w-24 h-10 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${gradId})`} />
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

export default function CEOAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("MoM");
  const [dashboardKPIs, setDashboardKPIs] = useState<KPIData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [profitBreakdown, setProfitBreakdown] = useState<ProfitBreakdownItem[]>([]);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [k, r, pb, o, p] = await Promise.all([
          dataApi.kpis(),
          dataApi.revenue(),
          dataApi.profitBreakdown(),
          dataApi.orders(5, 0),
          dataApi.products(),
        ]);
        if (!active) return;
        setDashboardKPIs(k.kpis);
        setRevenueData(r);
        setProfitBreakdown(pb);
        setOrders(o);
        setProducts(p.slice(0, 8));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const hasData =
    dashboardKPIs.length > 0 || orders.length > 0 || products.length > 0;

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Your business at a glance — October 2024
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-muted/10 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:border-primary/50 outline-none transition-all [&>option]:bg-card [&>option]:text-foreground font-semibold"
          >
            <option value="MoM">Last 30 days</option>
            <option value="today">Today</option>
            <option value="weekly">This Week</option>
            <option value="MoM">This Month (MoM)</option>
            <option value="YoY">Year to Date (YoY)</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading your live metrics…
        </div>
      )}

      {!loading && !hasData && (
        <div className="p-6 rounded-2xl bg-muted/10 border border-border text-center space-y-1">
          <p className="text-sm font-semibold text-foreground">No metrics yet</p>
          <p className="text-xs text-muted-foreground">
            Connect a store on the Integrations page and run a sync. Once orders are
            imported, your revenue, profit, and KPIs appear here automatically.
          </p>
          <Link
            href="/dashboard/integrations"
            className="inline-block mt-2 text-xs text-primary hover:underline font-semibold"
          >
            Go to Integrations →
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardKPIs.map((kpi, idx) => {
          const isPositive = kpi.change >= 0;
          const displayVal = kpi.format === "currency" ? formatCurrency(kpi.value) : kpi.value.toLocaleString();
          return (
            <Card key={idx} className="relative overflow-hidden group hover:border-primary/30 transition-all bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground">{kpi.label}</CardTitle>
                <div className={`p-1.5 rounded-lg ${idx === 1 ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"}`}>
                  {idx === 0 && <DollarSign className="w-4 h-4" />}
                  {idx === 1 && <TrendingUp className="w-4 h-4" />}
                  {idx === 2 && <ShoppingCart className="w-4 h-4" />}
                  {idx === 3 && <ShoppingBag className="w-4 h-4" />}
                </div>
              </CardHeader>
              <CardContent className="flex items-end justify-between pt-1">
                <div>
                  <div className="text-2xl font-bold tracking-tight text-foreground">{displayVal}</div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    }`}>
                      {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                      {Math.abs(kpi.change)}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">{kpi.changeLabel}</span>
                  </div>
                </div>
                <div className="pb-1">
                  <Sparkline data={kpi.sparklineData} positive={isPositive} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 hover:border-border transition-all bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Revenue & Profit</CardTitle>
            <CardDescription className="text-xs">Monthly trend — 2024</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity="0.2" />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  formatter={(val: number) => [formatCurrency(val), ""]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Area name="Total Revenue" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area name="Net Profit" type="monotone" dataKey="profit" stroke="hsl(var(--success))" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Profit Breakdown ledger */}
        <Card className="hover:border-border transition-all flex flex-col justify-between bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Profit Breakdown</CardTitle>
            <CardDescription className="text-xs">Where your revenue goes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profitBreakdown.map((item, idx) => {
              const absVal = Math.abs(item.value);
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-foreground font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(absVal)}
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-1.5 w-full rounded-full bg-muted/20 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Grid for Bottom Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="hover:border-border transition-all bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Store Orders</CardTitle>
              <CardDescription className="text-xs">Synced moments ago via active webhooks.</CardDescription>
            </div>
            <Link
              href="/dashboard/orders"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
            >
              View All <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="pb-2 font-medium">Order ID</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Channel</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id} className="hover:bg-muted/5">
                    <td className="py-2.5 font-semibold text-primary">{o.id}</td>
                    <td className="py-2.5 text-foreground">{o.customer}</td>
                    <td className="py-2.5 text-muted-foreground">{o.channel}</td>
                    <td className="py-2.5 font-medium text-foreground">{formatCurrency(o.total)}</td>
                    <td className="py-2.5">
                      <Badge
                        variant={
                          o.status === "delivered" ? "success" :
                          o.status === "processing" ? "warning" :
                          o.status === "cancelled" || o.status === "refunded" ? "destructive" : "outline"
                        }
                        className="text-[9px] px-1.5 py-0"
                      >
                        {o.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* High-Margin Products */}
        <Card className="hover:border-border transition-all bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">High Margin Product Catalog</CardTitle>
              <CardDescription className="text-xs">Items sorted by maximum net margin efficiency.</CardDescription>
            </div>
            <Link
              href="/dashboard/products"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
            >
              Manage Catalog <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="pb-2 font-medium">Product SKU</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Stock</th>
                  <th className="pb-2 font-medium font-semibold text-right">Net Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/5">
                    <td className="py-2.5 font-medium text-muted-foreground">{p.sku}</td>
                    <td className="py-2.5 truncate max-w-[180px] font-semibold text-foreground">{p.name}</td>
                    <td className="py-2.5 text-foreground">
                      {p.stock === 0 ? (
                        <span className="text-red-400 font-semibold animate-pulse-subtle">Out of Stock</span>
                      ) : (
                        <span>{p.stock} left</span>
                      )}
                    </td>
                    <td className="py-2.5 font-bold text-right text-emerald-400">{p.margin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
