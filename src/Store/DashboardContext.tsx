import React, { createContext, useContext } from "react";
import { DashboardStore } from "./DashboardStore";

export const StoreContext = createContext<DashboardStore | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = React.useMemo(() => new DashboardStore(), []);
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error("StoreProvider missing");
  return s;
}
