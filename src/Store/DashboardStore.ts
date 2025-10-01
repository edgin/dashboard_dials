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
