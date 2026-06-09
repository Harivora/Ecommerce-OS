"use client";

import React, { useEffect, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileArchive,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { exportApi, type ExportDataset } from "@/lib/export-api";
import { ApiError } from "@/lib/api";

const ALL_KEY = "__all__";

export default function ExportPage() {
  const { user } = useAuth();
  const canExport =
    user?.role === "owner" || user?.role === "admin" || user?.role === "super_admin";

  const [datasets, setDatasets] = useState<ExportDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canExport) {
      setLoading(false);
      return;
    }
    exportApi
      .datasets()
      .then(setDatasets)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load datasets"))
      .finally(() => setLoading(false));
  }, [canExport]);

  const handleDownload = async (key: string) => {
    setBusyKey(key);
    setError(null);
    try {
      if (key === ALL_KEY) await exportApi.downloadAll();
      else await exportApi.downloadDataset(key);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Download failed");
    } finally {
      setBusyKey(null);
    }
  };

  if (!canExport) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Export restricted</h2>
        <p className="text-sm text-muted-foreground">
          Only owners and admins can export organization data. Ask an admin if you need a copy.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Data Export</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Download your organization&apos;s data as CSV files. Everything is exported per-dataset,
          or grab one ZIP with all of it.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Download all */}
      <Card className="border border-violet-500/30 bg-[#181524]/20 backdrop-blur-md rounded-2xl">
        <CardContent className="p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 flex items-center justify-center">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Download everything (ZIP)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                A single archive containing a CSV for every dataset below.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDownload(ALL_KEY)}
            disabled={busyKey !== null}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            {busyKey === ALL_KEY ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {busyKey === ALL_KEY ? "Preparing…" : "Download ZIP"}
          </button>
        </CardContent>
      </Card>

      {/* Per-dataset */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted/10 border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((d) => {
            const busy = busyKey === d.key;
            return (
              <Card
                key={d.key}
                className="border border-border bg-card/40 backdrop-blur-md rounded-2xl hover:border-border/80 transition-all"
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-muted/10 border border-border text-muted-foreground flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-foreground truncate">{d.label}</span>
                  </div>
                  <button
                    onClick={() => handleDownload(d.key)}
                    disabled={busyKey !== null}
                    title={`Download ${d.label} CSV`}
                    className="shrink-0 p-2 rounded-lg border border-border/80 hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
                  >
                    {busy ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground/70">
        CSV files use UTF-8 encoding. Sensitive fields (password hashes, encrypted credentials)
        are never included.
      </p>
    </div>
  );
}