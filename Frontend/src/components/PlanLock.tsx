"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

/** Shown in place of a page's content when the org's plan doesn't unlock it. */
export function PlanLock({ feature, plan }: { feature: string; plan: string }) {
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  return (
    <div className="max-w-md mx-auto mt-16 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-300 flex items-center justify-center mx-auto">
        <Lock className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold text-foreground">{feature} is a {planLabel} feature</h2>
      <p className="text-sm text-muted-foreground">
        Your current plan doesn&apos;t include {feature}. Upgrade to the {planLabel} plan to
        unlock it.
      </p>
      <Link
        href="/dashboard/settings"
        className="inline-block px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold"
      >
        View plans
      </Link>
    </div>
  );
}