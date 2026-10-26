"use client";

import { createContext, useContext, useState, useMemo, type ReactNode } from "react";

const NavigationContext = createContext<{
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (value: boolean) => void;
} | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const value = useMemo(
    () => ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }),
    [collapsed, mobileOpen]
  );
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const value = useContext(NavigationContext);
  if (!value) throw new Error("Navigation must be rendered inside the application shell.");
  return value;
}
