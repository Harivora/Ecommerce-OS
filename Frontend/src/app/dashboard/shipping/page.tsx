"use client";

import React from "react";
import { Truck, CheckCircle, RotateCcw, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

const costData = [
  { month: "May", cost: 65000 },
  { month: "Jun", cost: 82000 },
  { month: "Jul", cost: 73000 },
  { month: "Aug", cost: 95000 },
  { month: "Sep", cost: 88000 },
  { month: "Oct", cost: 98000 },
];

const couriers = [
  { name: "Delhivery", shipments: 480, days: 3.8, rto: 4.2, performance: "Excellent" },
  { name: "Blue Dart", shipments: 320, days: 3.5, rto: 3.8, performance: "Excellent" },
  { name: "DTDC", shipments: 220, days: 5.1, rto: 7.2, performance: "Needs Review" },
  { name: "Ecom Express", shipments: 160, days: 4.8, rto: 6.5, performance: "Good" },
];

export default function ShippingPage() {
  const formatYAxis = (value: number) => {
    if (value >= 100000) {
      return `${(value / 100000).toFixed(1)}L`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Shipping</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Monitor shipping performance, costs, and RTO metrics
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        {/* Total Shipments */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/25 text-violet-400 flex items-center justify-center shrink-0">
              <Truck className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">Total Shipments</span>
              <div className="text-2xl font-bold text-foreground mt-0.5">1.2K</div>
            </div>
          </CardContent>
        </Card>

        {/* Delivered */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">Delivered</span>
              <div className="text-2xl font-bold text-foreground mt-0.5">1.0K</div>
            </div>
          </CardContent>
        </Card>

        {/* RTO Rate */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">RTO Rate</span>
              <div className="text-2xl font-bold text-foreground mt-0.5">5.3%</div>
            </div>
          </CardContent>
        </Card>

        {/* Avg Delivery */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">Avg Delivery</span>
              <div className="text-2xl font-bold text-foreground mt-0.5">4.2 days</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Monthly Shipping Cost area chart */}
        <Card className="lg:col-span-3 border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-border/30">
            <h3 className="text-sm font-bold text-foreground">Monthly Shipping Cost</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Trend over the last 6 months</p>
          </CardHeader>
          <CardContent className="pt-6 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="shippingColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--violet-500))" stopOpacity="0.15" />
                    <stop offset="95%" stopColor="hsl(var(--violet-500))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatYAxis}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    color: "hsl(var(--foreground))",
                    fontSize: "11px",
                  }}
                />
                <Area
                  name="Fulfillment Cost"
                  type="monotone"
                  dataKey="cost"
                  fill="url(#shippingColor)"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Shipment Status 2x2 Grid */}
        <Card className="lg:col-span-2 border border-border bg-card/40 backdrop-blur-md rounded-2xl flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/30">
            <h3 className="text-sm font-bold text-foreground">Shipment Status</h3>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-2 gap-4 flex-1">
            {/* Delivered */}
            <div className="bg-[#052e16]/20 border border-emerald-500/20 p-4 rounded-xl flex flex-col justify-center">
              <span className="text-2xl font-extrabold text-emerald-400">1020</span>
              <span className="text-[11px] text-emerald-500/80 font-bold mt-1 uppercase tracking-wider">
                Delivered
              </span>
            </div>

            {/* In Transit */}
            <div className="bg-[#072740]/20 border border-blue-500/20 p-4 rounded-xl flex flex-col justify-center">
              <span className="text-2xl font-extrabold text-blue-400">98</span>
              <span className="text-[11px] text-blue-500/80 font-bold mt-1 uppercase tracking-wider">
                In Transit
              </span>
            </div>

            {/* RTO */}
            <div className="bg-[#2c131a]/20 border border-rose-500/20 p-4 rounded-xl flex flex-col justify-center">
              <span className="text-2xl font-extrabold text-rose-400">62</span>
              <span className="text-[11px] text-rose-500/80 font-bold mt-1 uppercase tracking-wider">RTO</span>
            </div>

            {/* Avg Cost */}
            <div className="bg-[#291e10]/20 border border-amber-500/20 p-4 rounded-xl flex flex-col justify-center">
              <span className="text-2xl font-extrabold text-amber-400">₹72</span>
              <span className="text-[11px] text-amber-500/80 font-bold mt-1 uppercase tracking-wider">
                Avg Cost
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courier Performance ledger */}
      <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
        <CardHeader className="pb-4 border-b border-border/30">
          <h3 className="text-sm font-bold text-foreground">Courier Performance</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Compare delivery speed and reliability
          </p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-muted/10 text-muted-foreground border-b border-border/40">
                <th className="p-4 font-semibold uppercase tracking-wider">Courier</th>
                <th className="p-4 font-semibold text-right uppercase tracking-wider">Shipments</th>
                <th className="p-4 font-semibold text-right uppercase tracking-wider">Avg Delivery Days</th>
                <th className="p-4 font-semibold text-right uppercase tracking-wider">RTO Rate</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {couriers.map((c, idx) => {
                const isExcellent = c.performance === "Excellent";
                const isNeedsReview = c.performance === "Needs Review";

                return (
                  <tr key={idx} className="hover:bg-muted/5 transition-colors">
                    <td className="p-4 font-bold text-foreground">{c.name}</td>
                    <td className="p-4 text-right text-muted-foreground font-medium">{c.shipments}</td>
                    <td
                      className={`p-4 text-right font-bold ${
                        isExcellent ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {c.days} days
                    </td>
                    <td
                      className={`p-4 text-right font-bold ${
                        isExcellent ? "text-emerald-400" : isNeedsReview ? "text-rose-400" : "text-amber-400"
                      }`}
                    >
                      {c.rto}%
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={isExcellent ? "success" : isNeedsReview ? "destructive" : "warning"}
                        className="text-[9px] uppercase tracking-wider font-semibold"
                      >
                        {c.performance}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
