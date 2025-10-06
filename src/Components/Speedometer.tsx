import React from "react";
import { Application as PixiApp, Container, Graphics, Sprite, RenderTexture } from "pixi.js";

type Props = {
  size?: number;
  value: number;
  min?: number;
  max?: number;
  minDeg?: number;
  maxDeg?: number;
  dprCap?: number;
  ease?: number;
};

function valueToAngle(v: number, min: number, max: number, minDeg: number, maxDeg: number) {
  const t = (Math.min(max, Math.max(min, v)) - min) / Math.max(1e-6, max - min);
  return ((minDeg + (maxDeg - minDeg) * t) * Math.PI) / 180;
}

const SpeedometerPixi: React.FC<Props> = ({
  size = 270,
  value,
  min = 0,
  max = 130,
  minDeg = -220,
  maxDeg = 40,
  dprCap = 2,
  ease = 0.15,
}) => {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const appRef = React.useRef<PixiApp | null>(null);
  const readyRef = React.useRef(false);

  const targetAngleRef = React.useRef(0);
  const currentAngleRef = React.useRef(0);

  const tickerFnRef = React.useRef<((...args: any[]) => void) | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const host = hostRef.current;
    if (!host) return;

    const app = new PixiApp();
    appRef.current = app;

    (async () => {
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, dprCap),
        width: size,
        height: size,
      });

      if (cancelled) return;

      // ❗ Stop the Application while we build the scene
      app.stop();

      // Attach canvas AFTER init
      host.appendChild(app.canvas);

      const stage = app.stage as unknown as Container;

      // Layers
      const gauge = new Graphics();
      const progress = new Graphics();
      stage.addChild(gauge, progress);

      // Layout
      const cx = app.renderer.width / 2;
      const cy = app.renderer.height / 2;
      const radius = Math.min(app.renderer.width, app.renderer.height) * 0.49;

      // Angles
      const a0 = (minDeg * Math.PI) / 180;
      const a1 = (maxDeg * Math.PI) / 180;

      // ----- Static gauge -----
      gauge.setStrokeStyle({ width: Math.max(1, radius * 0.01), color: 0x1fffff, cap: "round" });
      gauge.arc(cx, cy, radius, a0, a1);
      gauge.stroke();

      const major = Math.max(1, Math.round(max / 10));
      for (let i = 0; i <= major; i++) {
        const t = i / major;
        const ang = a0 + (a1 - a0) * t;
        const r0 = radius * 0.89,
          r1 = radius * 1.0;
        const x0 = cx + Math.cos(ang) * r0,
          y0 = cy + Math.sin(ang) * r0;
        const x1 = cx + Math.cos(ang) * r1,
          y1 = cy + Math.sin(ang) * r1;
        gauge.setStrokeStyle({ width: Math.max(1, radius * 0.015), color: 0xe5e7eb });
        gauge.moveTo(x0, y0);
        gauge.lineTo(x1, y1);
        gauge.stroke();
      }

      gauge.setFillStyle({ color: 0x3a5eef });
      gauge.circle(cx, cy, Math.max(4, radius * 0.06));
      gauge.fill();

      // ----- Needle (supersampled sprite) -----
      const buildNeedle = () => {
        const scale = 4;
        const texW = Math.ceil(radius * 1.4 * scale);
        const texH = Math.ceil(radius * 1.4 * scale);
        const rt = RenderTexture.create({ width: texW, height: texH, resolution: 1 });

        const g = new Graphics();
        const length = radius * 0.65;
        const baseWidth = Math.max(1.8, radius * 0.05);
        const w = baseWidth * scale;
        const h = length * scale;
        const cxT = texW / 2;
        const bottom = texH * 0.9;
        const top = bottom - h;
        const corner = Math.max(2 * scale, Math.min(w, h) * 0.15);

        g.setFillStyle({ color: 0xffffff });
        g.roundRect(cxT - w / 2, top, w, h, corner);
        g.fill();

        app.renderer.render(g, { renderTexture: rt });

        const needle = new Sprite(rt);
        needle.anchor.set(0.5, 0.9);
        needle.position.set(cx, cy);
        needle.scale.set(1 / scale);
        return needle;
      };

      const needle = buildNeedle();
      stage.addChild(needle);

      // Initialize angle target
      targetAngleRef.current = valueToAngle(value, min, max, minDeg, maxDeg);

      // Per-frame work (guarded)
      const tick = () => {
        // bail if app/stage is not ready (or tearing down)
        if (cancelled || !appRef.current || !app.stage) return;

        currentAngleRef.current += (targetAngleRef.current - currentAngleRef.current) * ease;

        progress.clear();
        const trackR = radius * 0.95;
        const trackW = Math.max(4, radius * 0.08);
        const cur = Math.max(Math.min(currentAngleRef.current, a1), a0);
        if (cur > a0 + 1e-6) {
          progress.setStrokeStyle({ width: trackW, color: 0x3a5eef });
          progress.arc(cx, cy, trackR, a0, cur);
          progress.stroke();
        }

        // needle might have been removed during teardown; guard it
        if (!needle.destroyed && needle.parent) {
          needle.rotation = currentAngleRef.current;
        }
      };

      tickerFnRef.current = tick;
      app.ticker.add(tick);

      // ✅ Start the Application AFTER scene is ready
      readyRef.current = true;
      app.start();
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;

      const app = appRef.current;
      const tick = tickerFnRef.current;

      // 1) stop application (halts its internal render loop)
      if (app) {
        try {
          app.stop();
        } catch {}
      }

      // 2) remove our ticker callback
      if (app && tick) {
        try {
          app.ticker.remove(tick);
        } catch {}
      }
      tickerFnRef.current = null;

      // 3) clear stage to avoid rendering destroyed children
      if (app && app.stage) {
        try {
          (app.stage as unknown as Container).removeChildren();
        } catch {}
      }

      // 4) destroy app (renderer, textures, children)
      if (app) {
        try {
          app.destroy(true, { children: true, texture: true });
        } catch {}
      }
      appRef.current = null;

      // 5) finally, remove the canvas node from DOM
      const hostNow = hostRef.current;
      if (hostNow && hostNow.firstChild) {
        try {
          hostNow.removeChild(hostNow.firstChild);
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // init once

  // Update target angle when value changes (only when ready)
  React.useEffect(() => {
    if (!readyRef.current) return;
    targetAngleRef.current = valueToAngle(value, min, max, minDeg, maxDeg);
  }, [value, min, max, minDeg, maxDeg]);

  // Resize when size changes (only if renderer exists)
  React.useEffect(() => {
    const app = appRef.current;
    if (!readyRef.current || !app || !app.renderer) return;
    if (app.renderer.width !== size || app.renderer.height !== size) {
      // stop, resize, then start to avoid in-flight render during resize
      try {
        app.stop();
      } catch {}
      try {
        app.renderer.resize(size, size);
      } catch {}
      try {
        app.start();
      } catch {}
    }
  }, [size]);

  return <div ref={hostRef} style={{ width: size, height: size, display: "inline-block" }} />;
};

export default SpeedometerPixi;
