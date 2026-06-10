"use client";

import React, { useEffect, useState } from "react";
import { Truck, CheckCircle, RotateCcw, Clock, AlertTriangle, IndianRupee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { dataApi, type ShippingMetricsDTO } from "@/lib/data-api";
import { ApiError } from "@/lib/api";

export default function ShippingPage() {
  const [m, setM] = useState<ShippingMetricsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dataApi
      .shipping()
      .then(setM)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load shipping data"))
      .finally(() => setLoading(false));
  }, []);

  const stats = m
    ? [
        { label: "Total Shipments", value: m.totalShipments.toLocaleString("en-IN"), icon: Truck },
        { label: "Delivered", value: m.delivered.toLocaleString("en-IN"), icon: CheckCircle },
        { label: "In Transit", value: m.inTransit.toLocaleString("en-IN"), icon: Clock },
        { label: "RTO (Returns)", value: `${m.rtoCount} (${m.rtoRate}%)`, icon: RotateCcw },
        { label: "Avg Shipping Cost", value: "₹" + Math.round(m.avgCost).toLocaleString("en-IN"), icon: IndianRupee },
        { label: "Avg Delivery Days", value: `${m.avgDeliveryDays}`, icon: Clock },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Shipping</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Fulfillment, delivery performance, and RTO from your logistics integration.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted/10 border border-border animate-pulse" />
          ))}
        </div>
      ) : !m || m.totalShipments === 0 ? (
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardContent className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/20 text-muted-foreground flex items-center justify-center mx-auto">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No shipping data yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Connect Shiprocket from the Integrations page. Delivery performance, RTO rate, and
              shipping costs will appear here once shipments sync.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
      )}
    </div>
  );
}