"use client";

import React, { useEffect, useState } from "react";
import { Megaphone, DollarSign, TrendingUp, Target, ShoppingCart, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dataApi, type AdCampaignDTO } from "@/lib/data-api";
import { ApiError } from "@/lib/api";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function AdsPage() {
  const [campaigns, setCampaigns] = useState<AdCampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dataApi
      .ads()
      .then(setCampaigns)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load ad spend"))
      .finally(() => setLoading(false));
  }, []);

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const roas = totalSpend ? totalRevenue / totalSpend : 0;

  const stats = [
    { label: "Total Ad Spend", value: inr(totalSpend), icon: DollarSign },
    { label: "Attributed Revenue", value: inr(totalRevenue), icon: TrendingUp },
    { label: "Blended ROAS", value: `${roas.toFixed(2)}x`, icon: Target },
    { label: "Conversions", value: totalConversions.toLocaleString("en-IN"), icon: ShoppingCart },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Ad Spend</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Campaign spend, attributed revenue, and ROAS across your ad platforms.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
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

      {/* Campaigns */}
      {loading ? (
        <div className="h-64 rounded-2xl bg-muted/10 border border-border animate-pulse" />
      ) : campaigns.length === 0 ? (
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/20 text-muted-foreground flex items-center justify-center mx-auto">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No ad spend yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Connect Meta Ads or Google Ads from the Integrations page (or add spend manually).
              Your campaigns, ROAS, and CPA will appear here.
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
                    <th className="px-5 py-3 font-semibold">Campaign</th>
                    <th className="px-5 py-3 font-semibold">Platform</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">Spend</th>
                    <th className="px-5 py-3 font-semibold text-right">Revenue</th>
                    <th className="px-5 py-3 font-semibold text-right">ROAS</th>
                    <th className="px-5 py-3 font-semibold text-right">CPA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/5">
                      <td className="px-5 py-3 font-semibold text-foreground">{c.name}</td>
                      <td className="px-5 py-3 text-muted-foreground capitalize">{c.platform}</td>
                      <td className="px-5 py-3">
                        <Badge variant={c.status === "active" ? "success" : "outline"} className="text-[9px] uppercase">
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right text-foreground">{inr(c.spend)}</td>
                      <td className="px-5 py-3 text-right text-foreground">{inr(c.revenue)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-foreground">{c.roas.toFixed(2)}x</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{inr(c.cpa)}</td>
                    </tr>
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