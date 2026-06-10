"use client";

import React, { useEffect, useState } from "react";
import { Users, CreditCard, Building2, Bell, Check, Sparkles, RefreshCw, Crown, ChevronDown, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { aiApi, type AIConfig } from "@/lib/ai-api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { dataApi, type TeamMemberDTO } from "@/lib/data-api";

// Plan pricing (INR/month) — keep in sync with backend app/core/plans.py.
const PLAN_PRICE_INR: Record<string, number> = { starter: 4599, growth: 8599, scale: 21599 };
const fmtINR = (n: number) => "₹" + n.toLocaleString("en-IN");

type TeamRole = "owner" | "admin" | "viewer";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"team" | "billing" | "org" | "notifications" | "ai">("billing");
  const { organization } = useAuth();
  const currentPlan = organization?.plan ?? "starter";
  const currentPlanLabel = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);

  // AI analyst config (per-org Anthropic key)
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [aiKeyInput, setAiKeyInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [aiErr, setAiErr] = useState<string | null>(null);

  useEffect(() => {
    aiApi.getConfig().then(setAiConfig).catch(() => setAiConfig(null));
  }, []);

  const saveAiKey = async () => {
    if (!aiKeyInput.trim()) return;
    setAiBusy(true);
    setAiMsg(null);
    setAiErr(null);
    try {
      const cfg = await aiApi.setKey(aiKeyInput.trim());
      setAiConfig(cfg);
      setAiKeyInput("");
      setAiMsg("API key saved and encrypted. The AI analyst is now active.");
    } catch (e) {
      setAiErr(e instanceof ApiError ? e.message : "Could not save key.");
    } finally {
      setAiBusy(false);
    }
  };

  const removeAiKey = async () => {
    setAiBusy(true);
    setAiMsg(null);
    setAiErr(null);
    try {
      const cfg = await aiApi.clearKey();
      setAiConfig(cfg);
      setAiMsg("API key removed.");
    } catch (e) {
      setAiErr(e instanceof ApiError ? e.message : "Could not remove key.");
    } finally {
      setAiBusy(false);
    }
  };
  const [team, setTeam] = useState<TeamMemberDTO[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("viewer");
  const [teamErr, setTeamErr] = useState<string | null>(null);

  useEffect(() => {
    dataApi.team().then(setTeam).catch(() => setTeam([]));
  }, []);

  // Mock Org States
  const [orgName, setOrgName] = useState("Commerce OS");
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  // Mock Notifications States
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setTeamErr(null);
    try {
      const name = inviteEmail.split("@")[0];
      await dataApi.inviteMember(name, inviteEmail, inviteRole);
      setTeam(await dataApi.team());
      setInviteEmail("");
      setInviteRole("viewer");
    } catch (err) {
      setTeamErr(err instanceof ApiError ? err.message : "Could not invite member.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Manage your team, billing, and organization preferences
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex gap-6 border-b border-border/40 pb-1">
        {[
          { id: "team", label: "Team", icon: Users },
          { id: "billing", label: "Billing", icon: CreditCard },
          { id: "org", label: "Organization", icon: Building2 },
          { id: "ai", label: "AI Analyst", icon: Sparkles },
          { id: "notifications", label: "Notifications", icon: Bell },
        ].map((t) => {
          const isActive = activeTab === t.id;
          const IconComp = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-all relative ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <IconComp className="w-4 h-4" />
              <span>{t.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Team collaborators view */}
      {activeTab === "team" && (
        <div className="space-y-6">
          {/* Invite form */}
          <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/30">
              <h3 className="text-sm font-bold text-foreground">Invite Team Member</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Add people to your organization
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row items-center gap-4">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="flex-1 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-violet-500/50 text-xs outline-none text-foreground placeholder:text-muted-foreground/60"
                  required
                />
                <div className="relative w-full sm:w-36">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-background border border-border focus:border-violet-500/50 text-xs outline-none text-foreground appearance-none cursor-pointer [&>option]:bg-card [&>option]:text-foreground"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  + Send Invite
                </button>
              </form>
            </CardContent>
          </Card>

          {teamErr && (
            <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{teamErr}</p>
          )}

          {/* Members list */}
          <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/30">
              <h3 className="text-sm font-bold text-foreground">Team Members</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{team.length} members</p>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/30">
              {team.length === 0 && (
                <div className="p-4 text-xs text-muted-foreground">No team members yet.</div>
              )}
              {team.map((m) => {
                const isOwner = m.role === "owner";
                const isActive = m.status === "active";

                return (
                  <div key={m.id} className="p-4 flex items-center justify-between hover:bg-muted/5 transition-all">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#8b5cf6] to-[#6366f1] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                        {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground">{m.name}</span>
                          {isOwner && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <span className="text-[11px] text-muted-foreground block mt-0.5">{m.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Status badge */}
                      <Badge
                        variant={isActive ? "success" : "outline"}
                        className="text-[9px] uppercase tracking-wider font-semibold"
                      >
                        {m.status}
                      </Badge>
                      {/* Role */}
                      <div className="flex items-center gap-1 bg-muted/10 border border-border/60 px-3 py-1.5 rounded-xl text-xs text-foreground font-semibold capitalize">
                        <span>{m.role}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subscription / Billing view */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          {/* Current Plan Card */}
          <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl relative overflow-hidden">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-foreground">Current Plan</h3>
                  <p className="text-xs text-muted-foreground">You are on the {currentPlanLabel} plan</p>
                </div>
                <Badge className="bg-violet-600 hover:bg-violet-700 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow-sm">
                  {currentPlanLabel}
                </Badge>
              </div>

              {/* Pricing detail */}
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-3xl font-extrabold text-foreground">{fmtINR(PLAN_PRICE_INR[currentPlan])}</span>
                <span className="text-xs text-muted-foreground">/month</span>
              </div>

              {/* Benefits Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 pt-4 border-t border-border/30">
                <div className="space-y-3">
                  {[
                    "3 Stores",
                    "AI Chat Analyst",
                    "Priority Support",
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-medium">{feat}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {[
                    "5,000 orders/month",
                    "Ad Attribution",
                    "90-day data retention",
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-medium">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing tiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl flex flex-col justify-between hover:border-border/80 transition-all shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-foreground">Starter</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Perfect for small D2C brands getting started with profit tracking.
                  </p>
                </div>
                <div className="flex items-baseline gap-0.5 pt-2">
                  <span className="text-2xl font-extrabold text-foreground">{fmtINR(PLAN_PRICE_INR.starter)}</span>
                  <span className="text-xs text-muted-foreground">/month</span>
                </div>
              </CardContent>
              <div className="px-6 pb-6 pt-2 border-t border-border/30">
                {currentPlan === "starter" ? (
                  <button className="w-full py-2.5 rounded-xl border border-emerald-500/40 text-emerald-400 text-xs font-bold text-center bg-emerald-950/20 cursor-default">
                    Current Plan
                  </button>
                ) : (
                  <button className="w-full py-2.5 rounded-xl border border-border/80 hover:bg-muted/10 hover:border-foreground/40 text-xs font-bold text-foreground transition-all">
                    Switch to Starter
                  </button>
                )}
              </div>
            </Card>

            {/* Growth */}
            <Card className="border border-violet-500/30 bg-[#181524]/20 backdrop-blur-md rounded-2xl flex flex-col justify-between hover:border-violet-500/50 transition-all shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-foreground">Growth</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    For growing brands that need deeper analytics and AI insights.
                  </p>
                </div>
                <div className="flex items-baseline gap-0.5 pt-2">
                  <span className="text-2xl font-extrabold text-foreground">{fmtINR(PLAN_PRICE_INR.growth)}</span>
                  <span className="text-xs text-muted-foreground">/month</span>
                </div>
              </CardContent>
              <div className="px-6 pb-6 pt-2 border-t border-border/30">
                {currentPlan === "growth" ? (
                  <button className="w-full py-2.5 rounded-xl border border-emerald-500/40 text-emerald-400 text-xs font-bold text-center bg-emerald-950/20 cursor-default">
                    Current Plan
                  </button>
                ) : (
                  <button className="w-full py-2.5 rounded-xl border border-border/80 hover:bg-muted/10 hover:border-foreground/40 text-xs font-bold text-foreground transition-all">
                    Switch to Growth
                  </button>
                )}
              </div>
            </Card>

            {/* Scale */}
            <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl flex flex-col justify-between hover:border-border/80 transition-all shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-foreground">Scale</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    For established brands needing full automation and forecasting.
                  </p>
                </div>
                <div className="flex items-baseline gap-0.5 pt-2">
                  <span className="text-2xl font-extrabold text-foreground">{fmtINR(PLAN_PRICE_INR.scale)}</span>
                  <span className="text-xs text-muted-foreground">/month</span>
                </div>
              </CardContent>
              <div className="px-6 pb-6 pt-2 border-t border-border/30">
                {currentPlan === "scale" ? (
                  <button className="w-full py-2.5 rounded-xl border border-emerald-500/40 text-emerald-400 text-xs font-bold text-center bg-emerald-950/20 cursor-default">
                    Current Plan
                  </button>
                ) : (
                  <button className="w-full py-2.5 rounded-xl border border-border/80 hover:bg-muted/10 hover:border-foreground/40 text-xs font-bold text-foreground transition-all">
                    Contact Sales
                  </button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Organization Preferences */}
      {activeTab === "org" && (
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-border/30">
            <h3 className="text-sm font-bold text-foreground">Organization Preferences</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Set details for your organization workspace
            </p>
          </CardHeader>
          <CardContent className="pt-6 space-y-4 max-w-md">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold uppercase">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-violet-500/50 outline-none transition-all text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold uppercase">Workspace Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-violet-500/50 outline-none transition-all text-foreground [&>option]:bg-card [&>option]:text-foreground"
              >
                <option value="INR">INR (₹) Indian Rupee</option>
                <option value="USD">USD ($) US Dollar</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold uppercase">Workspace Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-violet-500/50 outline-none transition-all text-foreground [&>option]:bg-card [&>option]:text-foreground"
              >
                <option value="Asia/Kolkata">IST (GMT+5:30) Mumbai, New Delhi</option>
                <option value="America/New_York">EST (GMT-5:00) New York</option>
              </select>
            </div>
            <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold">
              Save Preferences
            </button>
          </CardContent>
        </Card>
      )}

      {/* Notifications view */}
      {activeTab === "notifications" && (
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl">
          <CardHeader className="pb-3 border-b border-border/30">
            <h3 className="text-sm font-bold text-foreground">Alert Subscriptions</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Select what alerts you want to dispatch to your team
            </p>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/40 max-w-md">
              <div>
                <span className="text-xs font-bold text-foreground block">Email Report Audits</span>
                <span className="text-[10px] text-muted-foreground">Receive weekly margins and returns summaries</span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4.5 h-4.5 border border-border rounded accent-violet-600"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/40 max-w-md">
              <div>
                <span className="text-xs font-bold text-foreground block">Low Stock Alerts</span>
                <span className="text-[10px] text-muted-foreground">Immediate alert when product stock dips below SLA cover threshold</span>
              </div>
              <input
                type="checkbox"
                checked={lowStockAlerts}
                onChange={(e) => setLowStockAlerts(e.target.checked)}
                className="w-4.5 h-4.5 border border-border rounded accent-violet-600"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analyst view */}
      {activeTab === "ai" && (
        <Card className="border border-border bg-card/40 backdrop-blur-md rounded-2xl max-w-2xl">
          <CardHeader className="pb-3 border-b border-border/30">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" /> AI Analyst (Claude)
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Grounded answers about your real profit, computed from your synced data.
            </p>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            {/* Status */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Status:</span>
              {aiConfig?.configured ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5" /> Active
                  <span className="text-muted-foreground font-normal">
                    ({aiConfig.source === "org" ? "your key" : "server key"} · {aiConfig.model})
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" /> Not configured
                </span>
              )}
            </div>

            {/* Pro vs API note */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 leading-relaxed">
              <strong>Note:</strong> a Claude <em>Pro</em> subscription (claude.ai) does
              not provide API access. The in-app analyst needs an{" "}
              <strong>Anthropic API key</strong> (billed per use) from{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-amber-200"
              >
                console.anthropic.com
              </a>
              . Your key is encrypted at rest and never shown again.
            </div>

            {/* Key input */}
            <div className="space-y-1.5 max-w-md">
              <label className="text-xs font-medium text-foreground">Anthropic API Key</label>
              <input
                type="password"
                value={aiKeyInput}
                onChange={(e) => setAiKeyInput(e.target.value)}
                placeholder="sk-ant-..."
                autoComplete="off"
                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-violet-500/50 outline-none transition-all text-foreground"
              />
            </div>

            {aiMsg && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg max-w-md">
                {aiMsg}
              </p>
            )}
            {aiErr && (
              <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg max-w-md">
                {aiErr}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={saveAiKey}
                disabled={aiBusy || !aiKeyInput.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                {aiBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Key
              </button>
              {aiConfig?.source === "org" && (
                <button
                  onClick={removeAiKey}
                  disabled={aiBusy}
                  className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all text-xs font-semibold disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

