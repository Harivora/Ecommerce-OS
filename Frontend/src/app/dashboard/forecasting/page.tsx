"use client";

import React from "react";
import { TrendingUp, Sparkles, AlertCircle, ArrowUpRight, Target, Calendar, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface ForecastRow {
  month: string;
  actual: number | null;
  predicted: number;
  lower: number;
  upper: number;
}

const tableData: ForecastRow[] = [
  { month: "Jul", actual: 2420000, predicted: 2420000, lower: 2420000, upper: 2420000 },
  { month: "Aug", actual: 2650000, predicted: 2600000, lower: 2600000, upper: 2600000 },
  { month: "Sep", actual: 2780000, predicted: 2750000, lower: 2750000, upper: 2750000 },
  { month: "Oct", actual: 2847500, predicted: 2900000, lower: 2900000, upper: 2900000 },
  { month: "Nov", actual: null, predicted: 3150000, lower: 2850000, upper: 3450000 },
  { month: "Dec", actual: null, predicted: 3600000, lower: 3100000, upper: 4100000 },
  { month: "Jan", actual: null, predicted: 3200000, lower: 2650000, upper: 3750000 },
  { month: "Feb", actual: null, predicted: 3350000, lower: 2700000, upper: 4000000 },
  { month: "Mar", actual: null, predicted: 3500000, lower: 2750000, upper: 4250000 },
];

// Map data for Recharts to draw lines and bounds area
const chartData = tableData.map((item) => ({
  month: item.month,
  actual: item.actual,
  // Predicted is continuous but only rendered as dotted forecast line from Oct onwards
  predicted: item.month === "Jul" || item.month === "Aug" || item.month === "Sep" ? null : item.predicted,
  // Shaded bounds area connects from Oct onwards
  bounds: item.actual !== null && item.month !== "Oct" ? null : [item.lower, item.upper],
  // Actual fill area
  actualArea: item.actual,
}));

export default function ForecastingPage() {
  const formatIndianCurrency = (num: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatYAxis = (value: number) => {
    return `${(value / 100000).toFixed(1)}L`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Forecasting</h1>
          <span className="bg-violet-600/20 border border-violet-500/30 text-violet-400 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded shadow-sm">
            AI
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5">
          AI-powered revenue predictions with confidence intervals
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        {/* Current Revenue */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/25 text-violet-400 flex items-center justify-center shrink-0">
              <BarChart2 className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">Current Revenue</span>
              <div className="text-2xl font-bold text-foreground mt-0.5">₹28,47,500</div>
              <span className="text-[10px] text-muted-foreground/60 block mt-0.5">Oct</span>
            </div>
          </CardContent>
        </Card>

        {/* Next Month Forecast */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">Next Month Forecast</span>
              <div className="text-2xl font-bold text-foreground mt-0.5">₹31,50,000</div>
              <span className="text-[10px] text-muted-foreground/60 block mt-0.5">Nov prediction</span>
            </div>
          </CardContent>
        </Card>

        {/* Peak Predicted */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
              <Target className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">Peak Predicted</span>
              <div className="text-2xl font-bold text-foreground mt-0.5">₹36,00,000</div>
              <span className="text-[10px] text-muted-foreground/60 block mt-0.5">Dec — highest forecasted</span>
            </div>
          </CardContent>
        </Card>

        {/* Forecast Range */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">Forecast Range</span>
              <div className="text-base font-bold text-foreground mt-1.5 leading-none">
                ₹28.5L – ₹34.5L
              </div>
              <span className="text-[10px] text-muted-foreground/60 block mt-1.5">95% confidence interval</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
        <CardHeader className="pb-3 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Revenue Forecast</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Actual vs predicted with confidence bounds
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="actualColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--violet-500))" stopOpacity="0.1" />
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
                domain={[0, 6000000]}
                ticks={[0, 1500000, 3000000, 4500000, 6000000]}
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
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }}
              />
              {/* Shaded Confidence Interval */}
              <Area
                name="Confidence"
                type="monotone"
                dataKey="bounds"
                stroke="none"
                fill="rgba(139, 92, 246, 0.08)"
                connectNulls
              />
              {/* Shaded Actual Sales Area */}
              <Area
                name="Actual"
                type="monotone"
                dataKey="actualArea"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#actualColor)"
                connectNulls
              />
              {/* Dotted Predicted Center line */}
              <Line
                name="Predicted"
                type="monotone"
                dataKey="predicted"
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ fill: "#a855f7", r: 3 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Advisories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-9 gap-6">
        {/* AI Insights (takes ~4 columns) */}
        <Card className="lg:col-span-4 border border-border bg-card/40 backdrop-blur-md rounded-2xl flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/30">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-violet-400" /> AI Insights
            </h3>
          </CardHeader>
          <CardContent className="pt-6 space-y-5 flex-1">
            {/* Insight 1 */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Revenue is trending upward by <strong className="text-foreground">8.3%</strong> month-over-month. Expect strong Q4 performance.
              </p>
            </div>

            {/* Insight 2 */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                December forecast has a wide confidence interval (<strong className="text-foreground">₹31L–₹41L</strong>) due to holiday season variability.
              </p>
            </div>

            {/* Insight 3 */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                At current growth rate, you'll hit <strong className="text-foreground">₹3.5Cr</strong> annual revenue by March 2025.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Forecast Details (takes ~5 columns) */}
        <Card className="lg:col-span-5 border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-border/30">
            <h3 className="text-sm font-bold text-foreground">Forecast Details</h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-muted/10 text-muted-foreground border-b border-border/40">
                  <th className="p-4 font-semibold uppercase tracking-wider">Month</th>
                  <th className="p-4 font-semibold text-right uppercase tracking-wider">Actual</th>
                  <th className="p-4 font-semibold text-right uppercase tracking-wider">Predicted</th>
                  <th className="p-4 font-semibold text-right uppercase tracking-wider">Lower</th>
                  <th className="p-4 font-semibold text-right uppercase tracking-wider">Upper</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {tableData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/5 transition-colors">
                    <td className="p-4 font-bold text-foreground">{row.month}</td>
                    <td className="p-4 text-right text-muted-foreground font-medium">
                      {row.actual !== null ? formatIndianCurrency(row.actual) : "—"}
                    </td>
                    <td className="p-4 text-right font-bold text-violet-400">
                      {formatIndianCurrency(row.predicted)}
                    </td>
                    <td className="p-4 text-right text-muted-foreground font-medium">
                      {formatIndianCurrency(row.lower)}
                    </td>
                    <td className="p-4 text-right text-muted-foreground font-medium">
                      {formatIndianCurrency(row.upper)}
                    </td>
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
