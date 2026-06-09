import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "AI Commerce OS — AI CFO for E-commerce Brands",
  description:
    "The AI-powered profit engine for Indian D2C brands. Track true profit, optimize ad spend, and make smarter decisions with AI insights.",
  keywords: ["ecommerce", "profit analytics", "AI CFO", "D2C", "India"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
