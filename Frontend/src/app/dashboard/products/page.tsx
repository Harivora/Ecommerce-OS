"use client";

import React, { useEffect, useState } from "react";
import { Search, LayoutGrid, List, SlidersHorizontal, Plus, AlertCircle, Sparkles, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dataApi } from "@/lib/data-api";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import type { Product } from "@/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await dataApi.products();
        if (!active) return;
        setProducts(
          rows.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku ?? "",
            price: p.price,
            cost: p.cost,
            category: p.category ?? "Uncategorized",
            stock: p.stock,
            sold: p.sold,
            revenue: p.revenue,
            profit: p.profit,
            margin: p.margin,
            status: p.status as Product["status"],
            image: p.image ?? undefined,
          }))
        );
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load products");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Search & Filter
  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" ? true : p.category.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Stats calculations
  const totalProducts = products.length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const averageMargin = totalProducts
    ? Math.round(products.reduce((acc, p) => acc + p.margin, 0) / totalProducts)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Products</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Manage your product catalog and track profitability
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading products…
        </div>
      )}

      {/* Quick Summary Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Total Products</CardTitle>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Search className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-foreground">{totalProducts}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Active</CardTitle>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-foreground">
              {products.filter((p) => p.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Out of Stock</CardTitle>
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
              <AlertCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-red-400 flex items-center gap-2">
              {outOfStockCount}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Avg Margin</CardTitle>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Plus className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold text-foreground">
              {averageMargin}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + view toggle */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border focus:border-primary/50 text-sm outline-none transition-all placeholder:text-muted-foreground/60 text-foreground"
          />
        </div>

        {/* View toggle */}
        <div className="flex bg-muted/10 border border-border rounded-xl p-1 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category filter — own row that scrolls horizontally, so a long category
          list (or one very long category name) can never widen the whole page. */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {categories.map((c) => {
          const label = c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1);
          return (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              title={label}
              className={`shrink-0 max-w-[160px] truncate px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                categoryFilter === c
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/10"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Main Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            return (
              <Card key={p.id} className="overflow-hidden border-border hover:border-primary/20 transition-all flex flex-col group bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-foreground leading-tight">{p.name}</h3>
                      <p className="text-[10px] text-muted-foreground/80 mt-1">{p.sku} • {p.category}</p>
                    </div>
                    {/* Status Badge */}
                    <Badge variant={p.status === "active" ? "success" : "outline"} className="text-[9px] uppercase">
                      {p.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-1 flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-baseline mb-2 mt-1">
                    <span className="text-lg font-extrabold text-foreground">{formatCurrency(p.price)}</span>
                    <span className="text-[10px] text-muted-foreground">Cost: {formatCurrency(p.cost)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/10 border border-border/40 rounded-xl p-2">
                      <span className="text-[9px] text-muted-foreground block font-semibold uppercase">Stock</span>
                      <span className={`font-bold text-xs block mt-0.5 ${p.stock === 0 ? "text-red-400" : p.stock < 100 ? "text-amber-400" : "text-foreground"}`}>{p.stock}</span>
                    </div>
                    <div className="bg-muted/10 border border-border/40 rounded-xl p-2">
                      <span className="text-[9px] text-muted-foreground block font-semibold uppercase">Margin</span>
                      <span className="font-bold text-xs text-emerald-400 block mt-0.5">{p.margin}%</span>
                    </div>
                    <div className="bg-muted/10 border border-border/40 rounded-xl p-2">
                      <span className="text-[9px] text-muted-foreground block font-semibold uppercase">Sold</span>
                      <span className="font-bold text-xs text-foreground block mt-0.5">{p.sold.toLocaleString()}</span>
                    </div>
                    <div className="bg-muted/10 border border-border/40 rounded-xl p-2">
                      <span className="text-[9px] text-muted-foreground block font-semibold uppercase">Revenue</span>
                      <span className="font-bold text-xs text-foreground block mt-0.5">{formatCurrency(p.revenue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card className="border-border overflow-hidden bg-card">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-muted/10 text-muted-foreground border-b border-border">
                  <th className="p-4 font-semibold">Product SKU</th>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold text-right">Price</th>
                  <th className="p-4 font-semibold text-right">COGS</th>
                  <th className="p-4 font-semibold text-right">Margin</th>
                  <th className="p-4 font-semibold text-right">Stock</th>
                  <th className="p-4 font-semibold text-right">Sold</th>
                  <th className="p-4 font-semibold text-right">Revenue</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.stock === 0;
                  return (
                    <tr key={p.id} className="hover:bg-muted/5">
                      <td className="p-4 font-semibold text-primary">{p.sku}</td>
                      <td className="p-4 font-bold text-foreground max-w-[200px] truncate">{p.name}</td>
                      <td className="p-4 text-muted-foreground">{p.category}</td>
                      <td className="p-4 text-right font-semibold text-foreground">{formatCurrency(p.price)}</td>
                      <td className="p-4 text-right text-muted-foreground">{formatCurrency(p.cost)}</td>
                      <td className="p-4 text-right font-bold text-emerald-400">{p.margin}%</td>
                      <td className="p-4 text-right text-foreground">
                        {isOutOfStock ? (
                          <span className="text-red-400 font-bold">Out of stock</span>
                        ) : (
                          <span>{p.stock} units</span>
                        )}
                      </td>
                      <td className="p-4 text-right text-foreground">{p.sold.toLocaleString()}</td>
                      <td className="p-4 text-right font-semibold text-foreground">{formatCurrency(p.revenue)}</td>
                      <td className="p-4">
                        <Badge variant={p.status === "active" ? "success" : p.status === "draft" ? "info" : "outline"} className="text-[9px] uppercase">
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
