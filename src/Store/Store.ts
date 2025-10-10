// src/store.ts
import { configure, makeObservable, observable, computed, action } from "mobx";

configure({ enforceActions: "observed" });

const MAX_POWER = 6;
const MAX_SPEED = 130;
const SOME_DISTANCE = 500;

export class DashboardStore {
  power = 2; // 0..6

  constructor() {
    makeObservable(this, {
      power: observable,
      speed: computed,
      distance: computed,
      setPower: action.bound,
      incPower: action.bound,
      decPower: action.bound,
    });
  }

  // derived speed from power
  get speed() {
    const pct = Math.min(1, Math.max(0, this.power / MAX_POWER));
    return Math.round(pct * MAX_SPEED);
  }

  // derived distance from power (for visualization only)
  get distance() {
    const pct = Math.min(1, Math.max(0, this.power / MAX_POWER));
    return Math.round(pct * SOME_DISTANCE);
  }

  private clampPower(n: number) {
    return Math.min(MAX_POWER, Math.max(0, Number(n)));
  }

  setPower(n: number) {
    this.power = this.clampPower(n);
  }

  incPower(delta = 0.1) {
    this.setPower(this.power + delta);
  }

  decPower(delta = 0.1) {
    this.setPower(this.power - delta);
  }
}

export const basicStore = new DashboardStore();
