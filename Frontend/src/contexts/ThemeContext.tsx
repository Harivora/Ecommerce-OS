"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system" | "moonlight";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;

    const applyTheme = () => {
      // Clean up existing theme classes
      root.classList.remove("dark", "moonlight");

      if (theme === "dark") {
        root.classList.add("dark");
      } else if (theme === "moonlight") {
        root.classList.add("dark", "moonlight"); // both dark (for Tailwind dark:) and moonlight variables
      } else if (theme === "light") {
        // Keep standard root
      } else if (theme === "system") {
        const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (systemDark) {
          root.classList.add("dark");
        }
      }
    };

    applyTheme();
    localStorage.setItem("theme", theme);

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme();
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }
  }, [theme, mounted]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
