// ============================================================
// Data API — typed reads for dashboard + resource pages.
// All endpoints are tenant-scoped on the backend via the JWT.
// ============================================================
import { api } from "./api";

export interface KPIData {
  label: string;
  value: number;
  change: number;
  changeLabel: string;
  prefix?: string | null;
  suffix?: string | null;
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

export interface ProfitBreakdownItem {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

export interface OrderDTO {
  id: string;
  customer: string | null;
  email: string | null;
  date: string | null;
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  items: number;
  status: string;
  paymentMethod: string | null;
  profit: number;
  channel: string | null;
}

export interface ProductDTO {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  cost: number;
  category: string | null;
  stock: number;
  sold: number;
  revenue: number;
  profit: number;
  margin: number;
  status: string;
  image?: string | null;
}

export interface CustomerDTO {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  totalOrders: number;
  totalSpent: number;
  ltv: number;
  lastOrder: string | null;
  city: string | null;
  segment: string;
}

export interface CustomerOrderRow {
  id: string;
  orderNumber: string | null;
  date: string | null;
  total: number;
  status: string;
  items: number;
  profit: number;
}

export interface CustomerProductRow {
  title: string | null;
  sku: string | null;
  quantity: number;
  revenue: number;
}

export interface CustomerDetailDTO extends CustomerDTO {
  orders: CustomerOrderRow[];
  products: CustomerProductRow[];
  syncedOrders: number;
  syncedRevenue: number;
}

export interface AdCampaignDTO {
  id: string;
  name: string;
  platform: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpa: number;
}

export interface TeamMemberDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  lastActive: string | null;
  status: string;
}

export interface ForecastPointDTO {
  month: string;
  actual: number | null;
  predicted: number;
  lower: number;
  upper: number;
}

export interface ShippingMetricsDTO {
  totalShipments: number;
  delivered: number;
  inTransit: number;
  rtoCount: number;
  rtoRate: number;
  avgCost: number;
  avgDeliveryDays: number;
}

export interface PaymentSettlementDTO {
  id: string;
  gateway: string;
  amount: number;
  fees: number;
  netAmount: number;
  date: string | null;
  status: string;
  method: string;
}

export const dataApi = {
  // Dashboard
  kpis: () => api.get<{ kpis: KPIData[] }>("/dashboard/kpis"),
  revenue: () => api.get<RevenueDataPoint[]>("/dashboard/revenue"),
  profitBreakdown: () => api.get<ProfitBreakdownItem[]>("/dashboard/profit-breakdown"),

  // Resources
  orders: (limit = 50, offset = 0, start?: string, end?: string) => {
    let url = `/orders?limit=${limit}&offset=${offset}`;
    if (start) url += `&start=${encodeURIComponent(start)}`;
    if (end) url += `&end=${encodeURIComponent(end)}`;
    return api.get<OrderDTO[]>(url);
  },
  products: () => api.get<ProductDTO[]>("/products"),
  customers: (limit = 50, offset = 0) =>
    api.get<CustomerDTO[]>(`/customers?limit=${limit}&offset=${offset}`),
  customerDetail: (id: string) =>
    api.get<CustomerDetailDTO>(`/customers/${encodeURIComponent(id)}`),

  // Ad spend
  ads: () => api.get<AdCampaignDTO[]>("/ads"),

  // Team
  team: () => api.get<TeamMemberDTO[]>("/team"),
  inviteMember: (name: string, email: string, role: string) =>
    api.post<TeamMemberDTO>("/team", { name, email, role }),

  // Forecasting / shipping / payments
  forecasting: () => api.get<ForecastPointDTO[]>("/forecasting"),
  shipping: () => api.get<ShippingMetricsDTO>("/shipping"),
  payments: () => api.get<PaymentSettlementDTO[]>("/payments"),
};
