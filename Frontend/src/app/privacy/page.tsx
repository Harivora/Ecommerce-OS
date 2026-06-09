"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

// NOTE: Starter Privacy Policy. Have a lawyer review and adapt (DPDP/GDPR) before launch.
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to home
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Privacy Policy</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-8">Last updated: 9 June 2026</p>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed [&_h2]:text-foreground [&_h2]:font-bold [&_h2]:text-base [&_h2]:mt-8 [&_h2]:mb-2">
          <p>
            This Privacy Policy explains how AI Commerce OS collects, uses, and protects your
            information when you use the Service.
          </p>

          <h2>1. Information we collect</h2>
          <p>
            <strong>Account data</strong> (name, email, organization). <strong>Connected
            platform data</strong> you authorize us to sync (orders, products, customers,
            shipments, payouts). <strong>Credentials</strong> for connected platforms, stored
            encrypted. <strong>Usage data</strong> (logs, device/browser info).
          </p>

          <h2>2. How we use it</h2>
          <p>
            To operate the Service: compute profit analytics, power the AI analyst, sync your
            data, provide support, and secure the platform. We do not sell your data.
          </p>

          <h2>3. AI processing</h2>
          <p>
            The AI analyst sends a scoped summary of your business data to our AI provider
            (Anthropic) to generate answers. It is used only to respond to your queries.
          </p>

          <h2>4. Data security</h2>
          <p>
            Connected credentials are encrypted at rest; data is transmitted over TLS;
            access is tenant-isolated. No system is perfectly secure, but we follow industry
            practices to protect your data.
          </p>

          <h2>5. Data retention &amp; your rights</h2>
          <p>
            You can <strong>export</strong> your organization&apos;s data (including via the
            NAS backup feature) and <strong>request deletion</strong> of your account and
            data at any time. Depending on your region (e.g. GDPR/DPDP), you may have rights
            to access, correct, or erase your data. Contact us to exercise them.
          </p>

          <h2>6. Sub-processors</h2>
          <p>
            We use trusted providers to run the Service, including cloud hosting (AWS) and
            AI processing (Anthropic). They process data only on our instructions.
          </p>

          <h2>7. Cookies</h2>
          <p>
            We use essential cookies/local storage to keep you signed in. We do not use
            advertising trackers.
          </p>

          <h2>8. Changes</h2>
          <p>
            We may update this policy; material changes will be notified in-app or by email.
          </p>

          <h2>9. Contact</h2>
          <p>
            For privacy questions or data requests, contact{" "}
            <a href="mailto:privacy@yourdomain.com" className="text-primary hover:underline">
              privacy@yourdomain.com
            </a>
            .
          </p>

          <p className="text-xs text-muted-foreground/70 pt-6 border-t border-border/40">
            This is a starter template, not legal advice. Have a qualified lawyer review it
            for DPDP (India) / GDPR compliance before going live.
          </p>
        </div>
      </div>
    </div>
  );
}