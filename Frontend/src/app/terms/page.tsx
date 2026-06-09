"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

// NOTE: Starter Terms of Service. Have a lawyer review and adapt before launch.
export default function TermsPage() {
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
          <h1 className="text-2xl font-extrabold tracking-tight">Terms of Service</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-8">Last updated: 9 June 2026</p>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed [&_h2]:text-foreground [&_h2]:font-bold [&_h2]:text-base [&_h2]:mt-8 [&_h2]:mb-2">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of
            AI Commerce OS (the &quot;Service&quot;). By creating an account or using the
            Service, you agree to these Terms.
          </p>

          <h2>1. The Service</h2>
          <p>
            AI Commerce OS connects to your e-commerce and logistics platforms, computes
            profit analytics, and provides AI-assisted insights. You are responsible for
            the accuracy of the credentials and data you connect.
          </p>

          <h2>2. Accounts</h2>
          <p>
            You must provide accurate information and keep your password secure. You are
            responsible for all activity under your account. Notify us immediately of any
            unauthorized use.
          </p>

          <h2>3. Subscriptions &amp; billing</h2>
          <p>
            Paid plans are billed in advance on a recurring basis. Fees are non-refundable
            except where required by law. We may suspend access for overdue accounts.
          </p>

          <h2>4. Your data</h2>
          <p>
            You retain ownership of the data you connect. We process it only to provide the
            Service, as described in our{" "}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            Connected platform credentials are encrypted at rest.
          </p>

          <h2>5. Acceptable use</h2>
          <p>
            You agree not to misuse the Service, attempt to access other tenants&apos; data,
            reverse-engineer the platform, or use it for unlawful purposes.
          </p>

          <h2>6. Third-party services</h2>
          <p>
            The Service integrates with third parties (e.g. Shopify, Shiprocket, Anthropic).
            Your use of those services is governed by their own terms.
          </p>

          <h2>7. Disclaimers &amp; liability</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties. Analytics and AI
            outputs are informational and not financial advice. To the extent permitted by
            law, our liability is limited to the fees you paid in the prior three months.
          </p>

          <h2>8. Termination</h2>
          <p>
            You may cancel at any time. We may suspend or terminate accounts that violate
            these Terms. You can export your data before deletion (see the Privacy Policy).
          </p>

          <h2>9. Changes</h2>
          <p>
            We may update these Terms; material changes will be notified in-app or by email.
            Continued use after changes constitutes acceptance.
          </p>

          <h2>10. Contact</h2>
          <p>
            Questions about these Terms? Contact us at{" "}
            <a href="mailto:support@yourdomain.com" className="text-primary hover:underline">
              support@yourdomain.com
            </a>
            .
          </p>

          <p className="text-xs text-muted-foreground/70 pt-6 border-t border-border/40">
            This is a starter template, not legal advice. Have a qualified lawyer review and
            tailor it to your jurisdiction before going live.
          </p>
        </div>
      </div>
    </div>
  );
}