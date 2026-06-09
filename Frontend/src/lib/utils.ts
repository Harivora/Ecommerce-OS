import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString("en-IN");
}

export function formatPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatRelativeTime(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    delivered: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    shipped: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    processing: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    pending: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    refunded: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    inactive: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    connected: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    disconnected: "bg-red-500/10 text-red-500 border-red-500/20",
    available: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "coming-soon": "bg-slate-500/10 text-slate-400 border-slate-500/20",
    vip: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    regular: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    "at-risk": "bg-red-500/10 text-red-500 border-red-500/20",
    new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };
  return colors[status.toLowerCase()] || colors.pending;
}
