"use client";

import React from "react";
import { CreditCard, ArrowDownRight, Percent, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PaymentMethodShare {
  method: string;
  percentage: number;
  amount: number;
  fees: number;
}

interface SettlementLog {
  id: string;
  gateway: string;
  method: string;
  amount: number;
  fees: number;
  net: number;
  date: string;
  status: "Settled" | "Processing" | "Pending";
}

const methodShares: PaymentMethodShare[] = [
  { method: "UPI", percentage: 42, amount: 1195950, fees: 11960 },
  { method: "Credit Card", percentage: 22, amount: 626450, fees: 13782 },
  { method: "Debit Card", percentage: 15, amount: 427125, fees: 6407 },
  { method: "Net Banking", percentage: 8, amount: 227800, fees: 5695 },
  { method: "COD", percentage: 13, amount: 370175, fees: 19162 },
];

const settlements: SettlementLog[] = [
  {
    id: "SET001",
    gateway: "Razorpay",
    method: "UPI",
    amount: 485000,
    fees: 9700,
    net: 475300,
    date: "15 Oct 2024",
    status: "Settled",
  },
  {
    id: "SET002",
    gateway: "Razorpay",
    method: "Credit Card",
    amount: 320000,
    fees: 7040,
    net: 312960,
    date: "14 Oct 2024",
    status: "Settled",
  },
  {
    id: "SET003",
    gateway: "Cashfree",
    method: "Net Banking",
    amount: 180000,
    fees: 3240,
    net: 176760,
    date: "14 Oct 2024",
    status: "Settled",
  },
  {
    id: "SET004",
    gateway: "Razorpay",
    method: "UPI",
    amount: 290000,
    fees: 5800,
    net: 284200,
    date: "13 Oct 2024",
    status: "Processing",
  },
  {
    id: "SET005",
    gateway: "Cashfree",
    method: "Debit Card",
    amount: 145000,
    fees: 2610,
    net: 142390,
    date: "13 Oct 2024",
    status: "Pending",
  },
];

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Track settlements, gateway fees, and payment methods
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        {/* Total Processed */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/25 text-violet-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">Total Processed</span>
              <div className="text-2xl font-bold text-foreground mt-0.5">₹28,47,500</div>
            </div>
          </CardContent>
        </Card>

        {/* Gateway Fees */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">Gateway Fees</span>
              <div className="text-2xl font-bold text-foreground mt-0.5">₹56,950</div>
            </div>
          </CardContent>
        </Card>

        {/* Fee % */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
              <Percent className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">Fee %</span>
              <div className="text-2xl font-bold text-foreground mt-0.5">2%</div>
            </div>
          </CardContent>
        </Card>

        {/* Settled */}
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground/85 font-semibold block">Settled</span>
              <div className="text-2xl font-bold text-foreground mt-0.5">3</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid splits and settlement table */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Payment Methods Splits (takes ~40% / 2 columns) */}
        <Card className="lg:col-span-2 border border-border bg-card/40 backdrop-blur-md rounded-2xl flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/30">
            <h3 className="text-sm font-bold text-foreground">Payment Methods</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Share of payment volume</p>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {methodShares.map((m, idx) => (
              <div key={idx} className="space-y-1">
                {/* Channel split details */}
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-foreground">{m.method}</span>
                  <span className="text-muted-foreground">
                    {m.percentage}% (₹{m.amount.toLocaleString("en-IN")})
                  </span>
                </div>
                {/* Horizontal Progress Bar */}
                <div className="h-2 w-full rounded-full bg-muted border border-border/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-600"
                    style={{ width: `${m.percentage}%` }}
                  />
                </div>
                {/* Small Fees Label underneath */}
                <span className="text-[10px] text-muted-foreground/60 block pt-0.5">
                  Fees: ₹{m.fees.toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Payout Settlement Logs (takes ~60% / 3 columns) */}
        <Card className="lg:col-span-3 border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-border/30">
            <h3 className="text-sm font-bold text-foreground">Recent Settlements</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Gateway settlements and fee tracking</p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-muted/10 text-muted-foreground border-b border-border/40">
                  <th className="p-4 font-semibold uppercase tracking-wider">ID</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Gateway</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Method</th>
                  <th className="p-4 font-semibold text-right uppercase tracking-wider">Amount</th>
                  <th className="p-4 font-semibold text-right uppercase tracking-wider">Fees</th>
                  <th className="p-4 font-semibold text-right uppercase tracking-wider">Net</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Date</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {settlements.map((s) => {
                  const isSettled = s.status === "Settled";
                  const isProcessing = s.status === "Processing";

                  return (
                    <tr key={s.id} className="hover:bg-muted/5 transition-colors">
                      <td className="p-4 font-semibold text-foreground">{s.id}</td>
                      <td className="p-4 text-muted-foreground font-semibold">{s.gateway}</td>
                      <td className="p-4 text-muted-foreground">{s.method}</td>
                      <td className="p-4 text-right font-medium text-foreground">
                        ₹{s.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 text-right text-rose-400/90 font-medium">
                        -₹{s.fees.toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 text-right font-bold text-foreground">
                        ₹{s.net.toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 text-muted-foreground">{s.date}</td>
                      <td className="p-4">
                        <Badge
                          variant={isSettled ? "success" : isProcessing ? "warning" : "outline"}
                          className="text-[9px] uppercase tracking-wider font-semibold"
                        >
                          {s.status}
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
    </div>
  );
}

