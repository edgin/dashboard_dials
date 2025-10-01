/**
 * StoreContext + Provider + Hook
 * --------------------------------
 * This file sets up a React Context for the `DashboardStore` so
 * that any component in the tree can access the same MobX store
 * instance without prop-drilling.
 *
 * - StoreContext:
 *   • A React context holding a `DashboardStore` or `null`.
 *
 * - StoreProvider:
 *   • Creates a single `DashboardStore` instance (memoized so it’s not recreated
 *     on every render).
 *   • Provides the store to all descendant components via Context.
 *
 * - useStore():
 *   • A custom hook to easily access the `DashboardStore` from React components.
 *   • Throws an error if called outside of a `StoreProvider` to prevent misuse.
 *
 * Usage:
 *   <StoreProvider>
 *     <Dashboard />
 *   </StoreProvider>
 *
 *   Inside Dashboard:
 *   const store = useStore();
 *   store.inc(); store.dec(); etc.
 */

import React, { createContext, useContext } from "react";
import { DashboardStore } from "./DashboardStore";

export const StoreContext = createContext<DashboardStore | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = React.useMemo(() => new DashboardStore(), []);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error("StoreProvider missing");
  return s;
}
