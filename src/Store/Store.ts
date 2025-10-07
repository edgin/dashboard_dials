// src/store.ts
import { makeAutoObservable } from "mobx";

class DashboardStore {
  speed = 30; // km/h

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setSpeed(n: number) {
    this.speed = Math.max(0, Math.min(240, Math.round(n)));
  }

  inc(delta = 5) {
    this.setSpeed(this.speed + delta);
  }
  dec(delta = 5) {
    this.setSpeed(this.speed - delta);
  }
}

export const store = new DashboardStore();

// Optional: expose for quick console testing in dev
// @ts-ignore
if (import.meta.env?.DEV) (window as any).store = store;
