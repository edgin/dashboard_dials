/**
 * DashboardStore
 * ------------------------------
 * This MobX store models a simple vehicle dashboard simulation.
 *
 * - State:
 *   • power: current engine power level (0–MAX_POWER)
 *   • speed: derived from power as a percentage of MAX_SPEED
 *   • distance: total kilometers traveled, updated over time
 *
 * - Behavior:
 *   • normalizePower(n): clamps engine power within [0, MAX_POWER] and rounds to 1 decimal
 *   • syncSpeed(): recalculates speed from the current power
 *   • inc(step): increases power by step (default 0.1) and updates speed
 *   • dec(step): decreases power by step (default 0.1) and updates speed
 *   • setPower(n): directly sets power, normalized, and syncs speed
 *   • tick(dtMs): simulates travel by adding distance = speed × time
 *
 * - Computed values:
 *   • powerPercent: current power level expressed as percentage (0–100)
 *   • canDec: flag to check if decreasing is possible (false if power & speed are zero)
 *
 * The store is fully observable thanks to `makeAutoObservable`,
 * making it reactive and easy to bind to UI components.
 */

import { makeAutoObservable } from "mobx";

const MAX_POWER = 6;
const MAX_SPEED = 130;

export class DashboardStore {
  speed = 0;
  power = 0;
  distance = 0;

  constructor() {
    makeAutoObservable(this);
  }

  private normalizePower(n: number) {
    const clamped = Math.min(MAX_POWER, Math.max(0, n));
    return Number(clamped.toFixed(1));
  }

  private syncSpeed() {
    const pct = this.power / MAX_POWER;
    this.speed = Math.round(pct * MAX_SPEED);
  }

  inc(step = 0.1) {
    this.power = this.normalizePower(this.power + step);
    this.syncSpeed();
  }
  dec(step = 0.1) {
    this.power = this.normalizePower(this.power - step);
    this.syncSpeed();
  }

  setPower(n: number) {
    this.power = this.normalizePower(Number(n));
    this.syncSpeed();
  }

  tick(dtMs: number) {
    this.distance += this.speed * (dtMs / 3_600_000);
  }

  get powerPercent() {
    return Math.round((this.power / MAX_POWER) * 100);
  }

  get canDec() {
    return !(this.speed === 0 && this.power === 0);
  }
}
