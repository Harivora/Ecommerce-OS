"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bot,
  ChevronRight,
  CreditCard,
  Globe,
  LayoutDashboard,
  Megaphone,
  Package,
  Shield,
  Sparkles,
  TrendingUp,
  Truck,
  Zap,
  Check,
  Menu,
  X,
  ArrowRight,
  Star,
} from "lucide-react";
import { pricingPlans } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-mesh opacity-40 pointer-events-none" />
      <div className="fixed inset-0 dot-grid opacity-20 pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-50 border-b border-border/50 backdrop-blur-xl bg-background/80 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold gradient-text">
                Commerce OS
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </a>
              <a
                href="#integrations"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Integrations
              </a>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl p-4 space-y-3 animate-slide-up">
            <a
              href="#features"
              className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Pricing
            </a>
            <Link
              href="/login"
              className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="block px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-primary to-accent text-white text-center"
            >
              Start Free Trial
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-8 animate-fade-in">
            <Zap className="w-4 h-4" />
            <span>AI-Powered Profit Intelligence</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 animate-fade-in-up">
            Your AI CFO for
            <br />
            <span className="gradient-text-vivid">E-commerce Growth</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up delay-200">
            Stop guessing your true profit. Commerce OS connects your Shopify
            store, ad platforms, and shipping providers to give you real-time
            profit analytics with AI-powered insights.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
            <Link
              href="/signup"
              className="group px-8 py-3.5 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 transition-all shadow-xl shadow-primary/25 flex items-center gap-2"
            >
              Start Free — No Card Required
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-3.5 text-base font-semibold rounded-xl border border-border hover:border-primary/50 text-foreground hover:bg-primary/5 transition-all flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              View Live Demo
            </Link>
          </div>

          {/* Social Proof */}
          <div className="mt-16 flex flex-col items-center gap-3 animate-fade-in-up delay-500">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-4 h-4 text-yellow-500 fill-yellow-500"
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Trusted by <strong className="text-foreground">500+</strong>{" "}
              Indian D2C brands
            </p>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-20 relative max-w-5xl mx-auto animate-fade-in-up delay-700">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-3xl" />
            <div className="relative glass-card rounded-2xl overflow-hidden border border-white/10 p-1">
              <div className="bg-card rounded-xl p-6 space-y-4">
                {/* Mock Dashboard Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    dashboard.commerceos.ai
                  </div>
                  <div className="w-20" />
                </div>

                {/* Mock KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Revenue",
                      value: "₹28.5L",
                      change: "+12.5%",
                      positive: true,
                    },
                    {
                      label: "Net Profit",
                      value: "₹8.5L",
                      change: "+8.3%",
                      positive: true,
                    },
                    {
                      label: "Orders",
                      value: "1,247",
                      change: "+15.2%",
                      positive: true,
                    },
                    {
                      label: "AOV",
                      value: "₹2,283",
                      change: "-2.1%",
                      positive: false,
                    },
                  ].map((kpi) => (
                    <div
                      key={kpi.label}
                      className="bg-background/50 rounded-lg p-3 border border-border/50"
                    >
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {kpi.label}
                      </p>
                      <p className="text-lg font-bold mt-1">{kpi.value}</p>
                      <p
                        className={`text-[10px] font-medium mt-0.5 ${kpi.positive ? "text-emerald-500" : "text-red-400"}`}
                      >
                        {kpi.change}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Mock Chart Area */}
                <div className="bg-background/50 rounded-lg p-4 border border-border/50 h-40 flex items-end gap-1">
                  {[40, 55, 45, 65, 58, 72, 68, 78, 82, 85, 92, 100].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/60 to-accent/40"
                        style={{ height: `${h}%` }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to{" "}
              <span className="gradient-text">maximize profit</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From order tracking to AI-powered forecasting, Commerce OS is your
              complete profit analytics platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: "True Profit Analytics",
                desc: "See real profit after COGS, shipping, ads, fees, and returns — not just revenue.",
                gradient: "from-indigo-500 to-blue-500",
              },
              {
                icon: Bot,
                title: "AI Chat Analyst",
                desc: 'Ask questions like "Why did profit drop last week?" and get instant, data-backed answers.',
                gradient: "from-violet-500 to-purple-500",
              },
              {
                icon: Megaphone,
                title: "Ad Attribution",
                desc: "True ROAS tracking across Meta & Google Ads, factoring in returns and shipping costs.",
                gradient: "from-pink-500 to-rose-500",
              },
              {
                icon: Truck,
                title: "Shipping Intelligence",
                desc: "Compare courier performance, track RTO rates, and optimize shipping costs.",
                gradient: "from-cyan-500 to-teal-500",
              },
              {
                icon: CreditCard,
                title: "Payment Analytics",
                desc: "Track gateway fees, settlement timelines, and payment method preferences.",
                gradient: "from-amber-500 to-orange-500",
              },
              {
                icon: TrendingUp,
                title: "Revenue Forecasting",
                desc: "AI-powered revenue and profit predictions with confidence intervals.",
                gradient: "from-emerald-500 to-green-500",
              },
              {
                icon: Globe,
                title: "Multi-Store Support",
                desc: "Connect multiple Shopify/WooCommerce stores and get unified analytics across all brands.",
                gradient: "from-blue-500 to-indigo-500",
              },
              {
                icon: Shield,
                title: "Team & Roles",
                desc: "Invite your team with Owner, Admin, and Viewer roles for secure access.",
                gradient: "from-slate-500 to-zinc-500",
              },
              {
                icon: Package,
                title: "Product Intelligence",
                desc: "Know which products are truly profitable and which are losing money after all costs.",
                gradient: "from-fuchsia-500 to-pink-500",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group glass-card rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section
        id="integrations"
        className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 border-t border-border/30"
      >
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Connects with your <span className="gradient-text">entire stack</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-12">
            Plug into Shopify, Meta Ads, Google Ads, Shiprocket, Razorpay, and
            more. One dashboard for everything.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {[
              "Shopify",
              "Meta Ads",
              "Google Ads",
              "Shiprocket",
              "Razorpay",
              "Cashfree",
            ].map((name) => (
              <div
                key={name}
                className="glass-card rounded-xl px-8 py-4 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 border-t border-border/30"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, transparent{" "}
              <span className="gradient-text">pricing</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Start free. Upgrade as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative glass-card rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 ${plan.popular ? "border-primary/50 shadow-xl shadow-primary/10" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-white text-xs font-semibold">
                    Most Popular
                  </div>
                )}

                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {plan.description}
                </p>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold">
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {plan.period}
                  </span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`block w-full text-center py-3 rounded-xl text-sm font-semibold transition-all ${
                    plan.popular
                      ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:opacity-90"
                      : "border border-border hover:border-primary/50 text-foreground hover:bg-primary/5"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold gradient-text">
                Commerce OS
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Support
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Blog
              </a>
            </div>

            <p className="text-xs text-muted-foreground">
              © 2024 Commerce OS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
