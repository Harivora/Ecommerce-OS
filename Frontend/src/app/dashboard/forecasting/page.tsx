"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dataApi, type ForecastPointDTO } from "@/lib/data-api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { planAllows } from "@/lib/entitlements";
import { PlanLock } from "@/components/PlanLock";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function ForecastingPage() {
  const { organization } = useAuth();
  const allowed = planAllows(organization?.plan, "forecasting");
  const [points, setPoints] = useState<ForecastPointDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    dataApi
      .forecasting()
      .then(setPoints)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load forecast"))
      .finally(() => setLoading(false));
  }, [allowed]);

  if (!allowed) return <PlanLock feature="Forecasting" plan="growth" />;

  const future = points.filter((p) => p.actual === null);
  const nextMonth = future[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Forecasting</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Revenue projection based on your synced monthly profit history.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 rounded-2xl bg-muted/10 border border-border animate-pulse" />
      ) : points.length === 0 ? (
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/20 text-muted-foreground flex items-center justify-center mx-auto">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">Not enough data to forecast yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Once a few months of orders have synced (so we have a revenue history), a projection
              with a confidence range will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {nextMonth && (
            <Card className="border border-violet-500/30 bg-[#181524]/20 backdrop-blur-md rounded-2xl">
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Projected revenue — {nextMonth.month}
                    </p>
                    <p className="text-2xl font-extrabold text-foreground">{inr(nextMonth.predicted)}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  Range<br />
                  <span className="text-foreground font-semibold">
                    {inr(nextMonth.lower)} – {inr(nextMonth.upper)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3 font-semibold">Month</th>
                      <th className="px-5 py-3 font-semibold">Type</th>
                      <th className="px-5 py-3 font-semibold text-right">Revenue / Forecast</th>
                      <th className="px-5 py-3 font-semibold text-right">Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {points.map((p, i) => {
                      const isActual = p.actual !== null;
                      return (
                        <tr key={`${p.month}-${i}`} className="hover:bg-muted/5">
                          <td className="px-5 py-3 font-semibold text-foreground">{p.month}</td>
                          <td className="px-5 py-3">
                            <Badge variant={isActual ? "outline" : "success"} className="text-[9px] uppercase">
                              {isActual ? "Actual" : "Forecast"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-right text-foreground font-semibold">
                            {inr(isActual ? (p.actual as number) : p.predicted)}
                          </td>
                          <td className="px-5 py-3 text-right text-muted-foreground">
                            {isActual ? "—" : `${inr(p.lower)} – ${inr(p.upper)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}