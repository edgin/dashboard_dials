import { Application, Graphics, Text, TextStyle, Container } from "pixi.js";
import { IReactionDisposer, reaction } from "mobx";

class EngineSpeedElement extends HTMLElement {
  static get observedAttributes() {
    return ["speed"];
  }

  private root = this.attachShadow({ mode: "open" });
  private wrapper!: HTMLDivElement;

  private app!: Application;
  private stage!: Container;
  private gauge!: Graphics;
  private needle!: Graphics;
  private centerDot!: Graphics;
  private progressArc!: Graphics;

  private _speed = 0;
  private _min = 0;
  private _max = 130;

  private currentAngle = 0;
  private targetAngle = 0;
  private minDeg = -220;
  private maxDeg = 40;

  private mobxDispose?: IReactionDisposer;
  private _store?: { speed: number };

  set store(s: { speed: number } | undefined) {
    if (s === this._store) return;
    this._store = s;
    this.#bindToStore(s);
  }
  get store() {
    return this._store;
  }

  connectedCallback() {
    this.root.innerHTML = /*html*/ `
      <style>
        :host {
          display: inline-block;
          width: 270px;
          height: 270px;
        }
        .wrap {
          position: relative;
          width: 100%;
          height: 100%;
        }
        canvas {
          display: block;
        }
      </style>
      <div class="wrap"></div>
    `;
    this.wrapper = this.root.querySelector(".wrap") as HTMLDivElement;

    this._speed = this.#num(this.getAttribute("speed"), 0);

    this.app = new Application();
    this.app
      .init({
        backgroundAlpha: 0,
        antialias: true,
        resizeTo: this.wrapper,
      })
      .then(() => {
        this.wrapper.appendChild(this.app.canvas);
        this.stage = this.app.stage;

        this.#buildGauge();
        this.#setTargetFromSpeed(this._speed);

        this.app.ticker.add(() => {
          const ease = 0.15;
          this.currentAngle += (this.targetAngle - this.currentAngle) * ease;
          this.#updateProgressArc(this.currentAngle);
          this.#updateNeedle(this.currentAngle);
        });
      });
  }

  disconnectedCallback() {
    this.mobxDispose?.();
    this.mobxDispose = undefined;
    if (this.app) this.app.destroy(true, { children: true, texture: true });
  }

  attributeChangedCallback(name: string, _old: string | null, val: string | null) {
    if (name === "speed") {
      this._speed = this.#num(val, 0);
      this.#setTargetFromSpeed(this._speed);
    }
  }

  get speed() {
    return this._speed;
  }
  set speed(v: number) {
    // No need to check string to number if typeguard is used with REF's
    // const n = Number(v);
    if (!Number.isFinite(v) || v === this._speed) return;
    this.setAttribute("speed", String(v));
  }

  #bindToStore(s?: { speed: number }) {
    this.mobxDispose?.();
    this.mobxDispose = undefined;
    if (!s) return;

    let scheduled = false;
    let nextVal = this._speed;

    this.mobxDispose = reaction(
      () => s.speed,
      (v) => {
        nextVal = Number(v);
        if (!Number.isFinite(nextVal)) return;
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          this.#setTargetFromSpeed(nextVal);
        });
      },
      {
        fireImmediately: true,
        equals: (a, b) => a === b,
      }
    );
  }

  #buildGauge() {
    this.gauge = new Graphics();
    this.needle = new Graphics();
    this.centerDot = new Graphics();
    this.progressArc = new Graphics();

    this.stage.addChild(this.progressArc, this.gauge, this.needle, this.centerDot);
    this.#drawStatic();
  }

  #drawStatic() {
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;
    const cx = w / 2,
      cy = h / 2;
    const radius = Math.min(w, h) * 0.49;
    const deg2rad = (d: number) => (d * Math.PI) / 180;
    const a0 = deg2rad(this.minDeg),
      a1 = deg2rad(this.maxDeg);

    this.gauge
      .arc(cx, cy, radius, a0, a1)
      .stroke({ width: Math.max(1, radius * 0.01), color: 0x1fffff, cap: "round" });

    const majorTicks = this._max / 10;

    const labelStyle = new TextStyle({
      fontFamily: "Inter, system-ui, ui-sans-serif, Arial",
      fontSize: Math.max(10, Math.round(radius * 0.12)),
      fill: 0xe5e7eb,
      fontWeight: "600",
    });

    for (let i = 0; i <= majorTicks; i++) {
      const t = i / majorTicks;
      const ang = a0 + (a1 - a0) * t;
      const r0 = radius * 0.89,
        r1 = radius * 1;
      const x0 = cx + Math.cos(ang) * r0,
        y0 = cy + Math.sin(ang) * r0;
      const x1 = cx + Math.cos(ang) * r1,
        y1 = cy + Math.sin(ang) * r1;

      this.gauge
        .moveTo(x0, y0)
        .lineTo(x1, y1)
        .stroke({ width: Math.max(1, radius * 0.015), color: 0xe5e7eb });

      const val = Math.round(this._min + t * (this._max - this._min));
      const lx = cx + Math.cos(ang) * (radius * 0.8);
      const ly = cy + Math.sin(ang) * (radius * 0.8);

      const tText = new Text({ text: String(val), style: labelStyle });
      tText.anchor.set(0.5);
      tText.position.set(lx, ly);
      this.stage.addChild(tText);
    }

    this.centerDot
      .clear()
      .circle(cx, cy, Math.max(4, radius * 0.06))
      .fill({ color: 0x3a5eef });
  }

  #updateNeedle(angleRad: number) {
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.49;

    const length = radius * 0.65;
    const baseWidth = radius * 0.05;

    // tip (far end of the needle)
    const tipX = cx + Math.cos(angleRad) * length;
    const tipY = cy + Math.sin(angleRad) * length;

    // perpendicular angle for the base width
    const perp = angleRad + Math.PI / 2;

    // two base points (left/right from center)
    const baseX1 = cx + Math.cos(perp) * (baseWidth / 2);
    const baseY1 = cy + Math.sin(perp) * (baseWidth / 2);

    const baseX2 = cx - Math.cos(perp) * (baseWidth / 2);
    const baseY2 = cy - Math.sin(perp) * (baseWidth / 2);

    this.needle
      .clear()
      .moveTo(tipX, tipY)
      .lineTo(baseX1, baseY1)
      .lineTo(baseX2, baseY2)
      .closePath()
      .fill({ color: 0xffffff });
  }

  #updateProgressArc(currentAngleRad: number) {
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;
    const cx = w / 2,
      cy = h / 2;
    const radius = Math.min(w, h) * 0.49;

    // dial bounds in radians
    const a0 = (this.minDeg * Math.PI) / 180;
    const a1 = (this.maxDeg * Math.PI) / 180;

    // clamp current to dial bounds just in case
    const cur = Math.max(Math.min(currentAngleRad, a1), a0);

    this.progressArc.clear();

    const trackRadius = radius * 0.95;
    const trackWidth = Math.max(4, radius * 0.08);
    if (cur > a0 + 1e-6) {
      this.progressArc
        .arc(cx, cy, trackRadius, a0, cur)
        .stroke({ width: trackWidth, color: 0x3a5eef, cap: "butt" });
    }
  }

  #setTargetFromSpeed(speed: number) {
    const clamped = Math.max(this._min, Math.min(this._max, speed));
    const t = (clamped - this._min) / Math.max(1e-6, this._max - this._min);
    const deg = this.minDeg + (this.maxDeg - this.minDeg) * t;
    this.targetAngle = (deg * Math.PI) / 180;
    this._speed = speed;
  }

  #num(v: string | null, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
}

if (!customElements.get("engine-speed")) customElements.define("engine-speed", EngineSpeedElement);
export {};
