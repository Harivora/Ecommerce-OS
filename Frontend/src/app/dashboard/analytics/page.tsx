"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { dataApi, type RevenueDataPoint, type ProfitBreakdownItem } from "@/lib/data-api";
import { formatCurrency } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

export default function AnalyticsPage() {
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [profitBreakdown, setProfitBreakdown] = useState<ProfitBreakdownItem[]>([]);

  useEffect(() => {
    dataApi.revenue().then(setRevenueData).catch(() => setRevenueData([]));
    dataApi.profitBreakdown().then(setProfitBreakdown).catch(() => setProfitBreakdown([]));
  }, []);

  // Compute margins per month (guard divide-by-zero).
  const processedData = revenueData.map((d) => ({
    ...d,
    marginPercent: d.revenue ? Math.round((d.profit / d.revenue) * 100) : 0,
  }));

  const categoryData = [
    { category: "Beauty", revenue: 3000000 },
    { category: "Fashion", revenue: 2600000 },
    { category: "Electronics", revenue: 2700000 },
    { category: "Health", revenue: 1000000 },
    { category: "Lifestyle", revenue: 600000 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Deep dive into your profitability and growth metrics
        </p>
      </div>

      {/* Main Chart: Revenue, Profit & Ad Spend */}
      <Card className="hover:border-border transition-all bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Revenue, Profit & Ad Spend</CardTitle>
          <CardDescription className="text-xs">Monthly performance breakdown — 2024</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity="0.25" />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="colorAdSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity="0.25" />
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 100000}L`} />
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
              <Area name="Revenue" type="monotone" dataKey="revenue" fill="url(#colorRevenue)" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Area name="Profit" type="monotone" dataKey="profit" fill="url(#colorProfit)" stroke="hsl(var(--success))" strokeWidth={2} />
              <Area name="Ad Spend" type="monotone" dataKey="adSpend" fill="url(#colorAdSpend)" stroke="hsl(var(--warning))" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Side-by-Side Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Margin Trend */}
        <Card className="hover:border-border transition-all bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Profit Margin Trend</CardTitle>
            <CardDescription className="text-xs">Net margin % by month</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={[20, 35]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  formatter={(val: number) => [`${val}%`, "Margin Rate"]}
                />
                <Line name="Margin %" type="monotone" dataKey="marginPercent" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ stroke: "hsl(var(--primary))", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card className="hover:border-border transition-all bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Revenue by Category</CardTitle>
            <CardDescription className="text-xs">Product category breakdown</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 100000}L`} />
                <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  formatter={(val: number) => [formatCurrency(val), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Profit Waterfall section */}
      <Card className="hover:border-border transition-all bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Profit Waterfall</CardTitle>
          <CardDescription className="text-xs">How revenue breaks down into net profit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profitBreakdown.map((item, idx) => {
            const isNegative = item.value < 0;
            const displayValue = isNegative ? `-₹${Math.abs(item.value).toLocaleString()}` : `₹${item.value.toLocaleString()}`;
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                  <span className={isNegative ? "text-red-400 font-bold" : item.label === "Revenue" ? "text-foreground font-bold" : "text-emerald-400 font-bold"}>
                    {displayValue}
                  </span>
                </div>
                {/* Horizontal Progress Bar */}
                <div className="h-2 w-full rounded-full bg-muted/20 overflow-hidden">
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
  );
}
