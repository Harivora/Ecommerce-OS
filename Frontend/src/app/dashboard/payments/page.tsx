"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, ArrowDownRight, Wallet, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dataApi, type PaymentSettlementDTO } from "@/lib/data-api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { planAllows } from "@/lib/entitlements";
import { PlanLock } from "@/components/PlanLock";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function PaymentsPage() {
  const { organization } = useAuth();
  const allowed = planAllows(organization?.plan, "payments");
  const [rows, setRows] = useState<PaymentSettlementDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    dataApi
      .payments()
      .then(setRows)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load payments"))
      .finally(() => setLoading(false));
  }, [allowed]);

  if (!allowed) return <PlanLock feature="Payments" plan="growth" />;

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const totalFees = rows.reduce((s, r) => s + r.fees, 0);
  const totalNet = rows.reduce((s, r) => s + r.netAmount, 0);

  const stats = [
    { label: "Gross Settled", value: inr(totalAmount), icon: CreditCard },
    { label: "Gateway Fees", value: inr(totalFees), icon: ArrowDownRight },
    { label: "Net Received", value: inr(totalNet), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Settlements and gateway fees across your payment providers.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {loading ? (
        <div className="h-64 rounded-2xl bg-muted/10 border border-border animate-pulse" />
      ) : rows.length === 0 ? (
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/20 text-muted-foreground flex items-center justify-center mx-auto">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No settlements yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Connect Razorpay or Cashfree from the Integrations page. Settlements and gateway
              fees will appear here.
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
                    <th className="px-5 py-3 font-semibold">Gateway</th>
                    <th className="px-5 py-3 font-semibold">Method</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">Amount</th>
                    <th className="px-5 py-3 font-semibold text-right">Fees</th>
                    <th className="px-5 py-3 font-semibold text-right">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/5">
                      <td className="px-5 py-3 font-semibold text-foreground">{r.gateway}</td>
                      <td className="px-5 py-3 text-muted-foreground">{r.method}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {r.date ? new Date(r.date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={r.status === "settled" ? "success" : "outline"} className="text-[9px] uppercase">
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right text-foreground">{inr(r.amount)}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{inr(r.fees)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-foreground">{inr(r.netAmount)}</td>
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