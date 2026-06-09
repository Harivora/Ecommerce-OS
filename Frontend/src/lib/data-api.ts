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

export const dataApi = {
  // Dashboard
  kpis: () => api.get<{ kpis: KPIData[] }>("/dashboard/kpis"),
  revenue: () => api.get<RevenueDataPoint[]>("/dashboard/revenue"),
  profitBreakdown: () => api.get<ProfitBreakdownItem[]>("/dashboard/profit-breakdown"),

  // Resources
  orders: (limit = 50, offset = 0) =>
    api.get<OrderDTO[]>(`/orders?limit=${limit}&offset=${offset}`),
  products: () => api.get<ProductDTO[]>("/products"),
  customers: (limit = 50, offset = 0) =>
    api.get<CustomerDTO[]>(`/customers?limit=${limit}&offset=${offset}`),
  customerDetail: (id: string) =>
    api.get<CustomerDetailDTO>(`/customers/${encodeURIComponent(id)}`),
};
