"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import {
  adminApi,
  impersonation,
  type AdminClient,
  type OrgStatus,
  type ResetPasswordResult,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api";

const STATUSES: OrgStatus[] = ["active", "past_due", "suspended", "cancelled"];

function statusClass(s: OrgStatus) {
  switch (s) {
    case "active":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "past_due":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "suspended":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-muted/20 text-muted-foreground border-border";
  }
}

function inr(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(null);

  const load = async () => {
    try {
      setError(null);
      setClients(await adminApi.clients());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeStatus = async (id: string, status: OrgStatus) => {
    setBusyId(id);
    try {
      const updated = await adminApi.setStatus(id, status);
      setClients((cs) => cs.map((c) => (c.id === id ? updated : c)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update status");
    } finally {
      setBusyId(null);
    }
  };

  const resetPassword = async (id: string) => {
    setBusyId(id);
    try {
      setResetResult(await adminApi.resetPassword(id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reset password");
    } finally {
      setBusyId(null);
    }
  };

  const impersonate = async (id: string) => {
    setBusyId(id);
    try {
      await impersonation.start(id);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not impersonate");
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Clients</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Every subscriber: plan, status, activity. Suspend overdue accounts to
          cut off access at login.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Owner login</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">MRR</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Last active</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Loading clients…
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No clients yet.
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="border-b border-border/40 hover:bg-muted/10">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clients/${c.id}`}
                        className="font-semibold hover:text-primary"
                      >
                        {c.name}
                      </Link>
                      <div className="text-[11px] text-muted-foreground">
                        {c.userCount} users · {c.storeCount} stores
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.ownerEmail || "—"}
                    </td>
                    <td className="px-4 py-3 capitalize">{c.plan}</td>
                    <td className="px-4 py-3">{inr(c.monthlyPrice)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={c.status}
                        disabled={busyId === c.id}
                        onChange={(e) => changeStatus(c.id, e.target.value as OrgStatus)}
                        className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border bg-transparent outline-none cursor-pointer ${statusClass(
                          c.status
                        )}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-card text-foreground">
                            {s.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {c.lastActive ? new Date(c.lastActive).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="Log in as this client"
                          disabled={busyId === c.id}
                          onClick={() => impersonate(c.id)}
                          className="p-1.5 rounded-lg border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 disabled:opacity-50"
                        >
                          <Icons.LogIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Reset owner password"
                          disabled={busyId === c.id}
                          onClick={() => resetPassword(c.id)}
                          className="p-1.5 rounded-lg border border-border hover:bg-muted/30 disabled:opacity-50"
                        >
                          <Icons.KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/admin/clients/${c.id}`}
                          title="View profile"
                          className="p-1.5 rounded-lg border border-border hover:bg-muted/30"
                        >
                          <Icons.ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Temp password modal */}
      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setResetResult(null)}
          />
          <div className="relative max-w-md w-full bg-card border border-border rounded-2xl p-6 shadow-2xl">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
              <Icons.KeyRound className="w-4 h-4 text-amber-400" /> Temporary password
            </h3>
            <p className="text-xs text-muted-foreground mb-3">{resetResult.detail}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Login</span>
                <span className="font-mono">{resetResult.email}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground">Temp password</span>
                <code className="font-mono bg-muted/30 px-2 py-1 rounded select-all">
                  {resetResult.temporaryPassword}
                </code>
              </div>
            </div>
            <p className="text-[11px] text-amber-400 mt-3">
              Shown once. Copy it now and share it securely.
            </p>
            <button
              onClick={() => setResetResult(null)}
              className="mt-4 w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}