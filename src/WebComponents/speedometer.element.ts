/*
  EngineSpeedElement (custom element: <engine-speed>)
  ---------------------------------------------------
  Purpose:
    A self-contained PixiJS speedometer gauge that animates a needle and a progress arc
    based on a numeric "speed" value. It can be driven by:
      • Attribute updates:  <engine-speed speed="45"></engine-speed>
      • Property updates:   el.speed = 45
      • A MobX store:       el.store = { speed: number }  (reaction-coalesced to rAF)

  High-level flow:
    1) Shadow DOM + wrapper div are created so Pixi can size to the element.
    2) A Pixi Application is initialized (async .init) with `resizeTo: wrapper`, then its canvas
       is appended into the shadow root.
    3) Static gauge graphics (arc, tick marks, labels, center dot) are drawn once.
    4) The component maintains two angles:
         - currentAngle: what the needle is currently showing
         - targetAngle:  angle mapped from the desired speed (min..max -> minDeg..maxDeg)
       On every Pixi ticker frame, currentAngle eases toward targetAngle, and the needle/progress
       visuals are redrawn accordingly.
    5) The speed can change via:
         - attributeChangedCallback('speed', …)
         - property setter: el.speed = n  (reflects to attribute)
         - a MobX `store` property; a reaction reads store.speed and schedules one update per frame

  Key properties and ranges:
    - _min/_max:   numeric speed range (0..130 by default)
    - minDeg/maxDeg: dial sweep in degrees (-220..40) => large arc, like a car speedometer
    - currentAngle/targetAngle: internal angles in radians; the ticker interpolates current -> target
    - _speed: current numeric speed cached on the element (also for initial attribute read)

  Lifecycle:
    • connectedCallback():
        - Injects styles and wrapper markup into the shadow root.
        - Reads initial `speed` attribute (if present).
        - Creates and initializes Pixi Application (transparent, antialiased, auto-resize to wrapper).
        - Builds the gauge (graphics, ticks, labels) once.
        - Sets initial target angle from _speed.
        - Starts Pixi ticker: on each frame, ease currentAngle toward targetAngle, then
          call #updateProgressArc and #updateNeedle to redraw moving parts.
    • disconnectedCallback():
        - Disposes the MobX reaction (if any) and destroys the Pixi app (freeing GPU/CPU resources).

  Attribute/property sync:
    • observedAttributes = ["speed"] → attributeChangedCallback updates _speed and targetAngle.
    • getter/setter `speed`:
        - setter coerces to Number, early-returns on NaN or no-change, then reflects via setAttribute,
          which routes through attributeChangedCallback (centralizing the state update).
      Note: For very high-frequency updates, direct state update in the setter (without reflecting)
            is slightly more efficient. Here, attribute reflection helps debugging/devtools.

  MobX store binding (set store = { speed }):
    • #bindToStore(s):
        - Disposes any previous reaction.
        - If provided, creates a reaction on s.speed.
        - Coalesces updates to once per animation frame via requestAnimationFrame:
            reaction → schedule (if not already scheduled) → on next frame: #setTargetFromSpeed(value)
          This avoids redundant per-change work when speed updates occur faster than the display.

  Drawing & geometry:
    • #buildGauge():
        - Creates Graphics objects for the static arc, the dynamic needle, center dot, and progressArc,
          adds them to the Pixi stage, and calls #drawStatic().
    • #drawStatic():
        - Calculates center (cx, cy) and radius from renderer dimensions.
        - Draws the main dial arc between minDeg and maxDeg.
        - Draws major tick marks and labels (Text) from _min.._max at 10-unit intervals.
        - Draws a center dot to cover the needle base.
      Note: Static labels are created once; the stage is destroyed on disconnect, so no manual cleanup needed.
            If the element can resize dynamically, consider re-drawing static parts on resize.
    • #updateNeedle(angleRad):
        - Computes a triangular needle (tip + two base points) and fills it white.
        - Uses current renderer dimensions each frame to stay in sync with resizing.
    • #updateProgressArc(currentAngleRad):
        - Draws a thick arc from the dial start to the current angle as a “progress” track.
        - Slightly inset relative to the main arc to avoid overlap.
    • #setTargetFromSpeed(speed):
        - Clamps speed to [_min, _max], normalizes to t ∈ [0,1], lerps to degrees, converts to radians,
          assigns targetAngle, and stores _speed.

  Ticking / easing:
    • The Pixi ticker runs every frame; currentAngle += (targetAngle - currentAngle) * 0.15
      This exponential ease gives a smooth, natural motion without overshoot (tweak 0.1–0.25 to taste).

  Utilities:
    • #num(v, fallback): robust parse for attributes → returns fallback when not finite.

  Usage examples:
    HTML:
      <engine-speed speed="50"></engine-speed>

    JS (property / ref):
      const el = document.querySelector('engine-speed')!;
      el.speed = 80;            // animate toward 80

    React + MobX (recommended):
      // give the whole store; component will subscribe with a coalesced reaction
      <engine-speed ref={speedRef} />
      useEffect(() => { speedRef.current!.store = store; }, [store]);

  Performance & improvement notes:
    • Attribute reflection is convenient but involves DOM attribute mutation; for 60fps updates,
      the store reaction path already avoids attribute writes and updates the internal state directly.
    • If the element can resize after mount, consider listening for Pixi’s resize or a ResizeObserver
      and re-running #drawStatic() (or recalculating geometry) so ticks/labels realign precisely.
    • For very large labels/ticks, cache text objects or use BitmapText if you need further gains.
    • If you add more dynamic layers, prefer updating existing Graphics paths instead of recreating objects.

  TL;DR:
    This component is a Pixi-powered speedometer. It maps speed → angle, eases the needle toward the target,
    and draws a progress arc. It accepts speed via attribute, property, or a MobX store (coalesced to rAF).
    Cleanly initializes/destroys Pixi, and renders smoothly at the display’s frame rate.
*/
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
