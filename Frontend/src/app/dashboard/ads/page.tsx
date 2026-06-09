"use client";

import React, { useState } from "react";
import { Megaphone, Play, Pause, Search, DollarSign, TrendingUp, Target, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface AdCampaign {
  id: string;
  name: string;
  platform: "Meta Ads" | "Google Ads";
  spend: number;
  revenue: number;
  impressions: number;
  conversions: number;
  status: "active" | "paused";
  cpa: number;
}

const initialCampaigns: AdCampaign[] = [
  {
    id: "CAM001",
    name: "Vitamin C Serum",
    platform: "Meta Ads",
    spend: 40000,
    revenue: 195000,
    impressions: 320000,
    conversions: 260,
    status: "active",
    cpa: 154,
  },
  {
    id: "CAM002",
    name: "Kurta Set",
    platform: "Meta Ads",
    spend: 32000,
    revenue: 245000,
    impressions: 280000,
    conversions: 200,
    status: "active",
    cpa: 160,
  },
  {
    id: "CAM003",
    name: "Brand Search",
    platform: "Google Ads",
    spend: 18000,
    revenue: 178000,
    impressions: 120000,
    conversions: 115,
    status: "active",
    cpa: 157,
  },
  {
    id: "CAM004",
    name: "Shopping",
    platform: "Google Ads",
    spend: 38000,
    revenue: 232000,
    impressions: 210000,
    conversions: 240,
    status: "active",
    cpa: 158,
  },
  {
    id: "CAM005",
    name: "Retargeting",
    platform: "Meta Ads",
    spend: 20000,
    revenue: 165000,
    impressions: 150000,
    conversions: 122,
    status: "active",
    cpa: 164,
  },
  {
    id: "CAM006",
    name: "Hair Oil",
    platform: "Google Ads",
    spend: 12000,
    revenue: 124214,
    impressions: 90000,
    conversions: 75,
    status: "active",
    cpa: 160,
  },
];

export default function AdsComparisonPage() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>(initialCampaigns);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "meta" | "google">("all");

  const toggleCampaignStatus = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextStatus: AdCampaign["status"] = c.status === "active" ? "paused" : "active";
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesPlatform =
      platformFilter === "all"
        ? true
        : platformFilter === "meta"
        ? c.platform === "Meta Ads"
        : c.platform === "Google Ads";
    return matchesSearch && matchesPlatform;
  });

  // Calculate static target values matching screenshot exactly
  const totalSpend = 160000;
  const totalRevenue = 1139214;
  const roas = (totalRevenue / totalSpend).toFixed(1); // 7.1x
  const blendedCPA = 158;

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
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Ad Spend</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Track and optimize your advertising performance
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        {/* Total Spend */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">Total Spend</span>
              <div className="text-2xl font-bold text-foreground mt-0.5">
                ₹{totalSpend.toLocaleString("en-IN")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">Revenue</span>
              <div className="text-2xl font-bold text-foreground mt-0.5">
                ₹{totalRevenue.toLocaleString("en-IN")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ROAS */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 flex items-center justify-center shrink-0">
              <Target className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">ROAS</span>
              <div className="text-2xl font-bold text-foreground mt-0.5">{roas}x</div>
            </div>
          </CardContent>
        </Card>

        {/* Avg CPA */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">Avg CPA</span>
              <div className="text-2xl font-bold text-foreground mt-0.5">₹{blendedCPA}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platforms Tab Filters */}
      <div className="flex gap-2.5 border-b border-border/40 pb-5">
        {[
          { label: "All Platforms", val: "all" },
          { label: "Meta Ads", val: "meta" },
          { label: "Google Ads", val: "google" },
        ].map((t) => {
          const isActive = platformFilter === t.val;
          return (
            <button
              key={t.val}
              onClick={() => setPlatformFilter(t.val as any)}
              className={`px-4.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                isActive
                  ? "bg-[#181524] border border-violet-500/40 text-foreground"
                  : "bg-muted/10 border border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Spend vs Revenue chart */}
      <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
        <CardHeader className="pb-3 border-b border-border/30">
          <h3 className="text-lg font-bold text-foreground">Spend vs Revenue</h3>
        </CardHeader>
        <CardContent className="pt-6 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={campaigns} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis
                dataKey="name"
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
              <Bar dataKey="spend" fill="#f59e0b" name="Spend" barSize={16} radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" barSize={16} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Active Campaigns Ledger */}
      <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/30">
          <div>
            <h3 className="text-sm font-bold text-foreground">Active Campaigns Ledger</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Synced from Meta Business Manager & Google Ads APIs.
            </p>
          </div>

          <div className="relative w-48 mt-3 sm:mt-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-background border border-border focus:border-violet-500/50 text-xs outline-none text-foreground placeholder:text-muted-foreground/60"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-muted/10 text-muted-foreground border-b border-border/40">
                <th className="p-4 font-semibold">Campaign Name</th>
                <th className="p-4 font-semibold">Channel</th>
                <th className="p-4 font-semibold text-right">Budget Spend</th>
                <th className="p-4 font-semibold text-right">Impressions</th>
                <th className="p-4 font-semibold text-right">Conversions</th>
                <th className="p-4 font-semibold text-right">ROAS</th>
                <th className="p-4 font-semibold text-right">CPA</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-center">Toggle Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredCampaigns.map((c) => {
                const roasVal = (c.revenue / c.spend).toFixed(1);
                return (
                  <tr key={c.id} className="hover:bg-muted/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">{c.name}</td>
                    <td className="p-4 text-muted-foreground">{c.platform}</td>
                    <td className="p-4 text-right font-medium text-foreground">
                      ₹{c.spend.toLocaleString("en-IN")}
                    </td>
                    <td className="p-4 text-right text-muted-foreground">
                      {c.impressions.toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-foreground">{c.conversions}</td>
                    <td className="p-4 text-right font-bold text-emerald-400">{roasVal}x</td>
                    <td className="p-4 text-right font-medium text-foreground">₹{c.cpa}</td>
                    <td className="p-4">
                      <Badge
                        variant={c.status === "active" ? "success" : "outline"}
                        className="text-[9px] uppercase tracking-wider font-semibold"
                      >
                        {c.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleCampaignStatus(c.id)}
                        className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition-all inline-flex items-center gap-1.5 ${
                          c.status === "active"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                        }`}
                      >
                        {c.status === "active" ? "Pause" : "Resume"}
                      </button>
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

