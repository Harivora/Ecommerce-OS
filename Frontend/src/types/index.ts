// ============================================================
// AI Commerce OS — TypeScript Types
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "owner" | "admin" | "viewer" | "super_admin";
  organizationId: string;
}

export interface Organization {
  id: string;
  name: string;
  logo?: string;
  plan: "starter" | "growth" | "scale";
  timezone: string;
  currency: string;
}

export interface Store {
  id: string;
  name: string;
  platform: "shopify" | "woocommerce" | "custom";
  url: string;
  status: "connected" | "disconnected";
  lastSync?: string;
  organizationId: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  category: string;
  stock: number;
  sold: number;
  revenue: number;
  profit: number;
  margin: number;
  status: "active" | "inactive" | "draft";
  image?: string;
}

export interface Order {
  id: string;
  customer: string;
  email: string;
  date: string;
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  items: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  paymentMethod: string;
  profit: number;
  channel: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  ltv: number;
  lastOrder: string;
  city: string;
  segment: "vip" | "regular" | "new" | "at-risk";
  avatar?: string;
}

export interface KPIData {
  label: string;
  value: number;
  change: number;
  changeLabel: string;
  prefix?: string;
  suffix?: string;
  format: "currency" | "number" | "percent";
  sparklineData: number[];
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  profit: number;
  orders: number;
  adSpend: number;
}

export interface ProfitBreakdown {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "connected" | "available" | "coming-soon";
  phase: number;
  lastSync?: string;
  category: "ecommerce" | "ads" | "shipping" | "payments";
  features: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isTyping?: boolean;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AdCampaign {
  id: string;
  name: string;
  platform: "meta" | "google";
  status: "active" | "paused" | "ended";
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpa: number;
}

export interface ShippingMetrics {
  totalShipments: number;
  delivered: number;
  inTransit: number;
  rtoCount: number;
  rtoRate: number;
  avgCost: number;
  avgDeliveryDays: number;
}

export interface PaymentSettlement {
  id: string;
  gateway: string;
  amount: number;
  fees: number;
  netAmount: number;
  date: string;
  status: "settled" | "pending" | "processing";
  method: string;
}

export interface ForecastDataPoint {
  month: string;
  actual?: number;
  predicted: number;
  lower: number;
  upper: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  children?: NavItem[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "viewer";
  avatar?: string;
  lastActive: string;
  status: "active" | "invited" | "inactive";
}

export interface PricingPlan {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
  gradient: string;
}
