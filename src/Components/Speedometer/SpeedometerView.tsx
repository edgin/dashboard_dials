// src/components/Speedometer/SpeedometerView.tsx
import React, { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import "./Speedometer.scss";

const MIN = 0;
const MAX = 130;
const MIN_DEG = -220;
const MAX_DEG = 40;
const deg2rad = (d: number) => (d * Math.PI) / 180;
const mapSpeedToAngle = (v: number) => {
  const t = Math.max(0, Math.min(1, (v - MIN) / (MAX - MIN)));
  return MIN_DEG + t * (MAX_DEG - MIN_DEG);
};

export type SpeedometerViewProps = {
  speed: number; // plain number prop
};

const SpeedometerView: React.FC<SpeedometerViewProps> = ({ speed }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const stageRef = useRef<Container | null>(null);
  const needleRef = useRef<Graphics | null>(null);
  const progressRef = useRef<Graphics | null>(null);
  const stateRef = useRef({
    cx: 0,
    cy: 0,
    r: 0,
    needleLen: 0,
    startA: deg2rad(MIN_DEG),
    current: 0,
    target: 0,
  });

  // init Pixi once
  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    let cancelled = false;

    (async () => {
      const app = new Application();
      await app.init({
        antialias: true,
        backgroundAlpha: 0,
        resizeTo: node,
        autoDensity: true,
      });
      if (cancelled) {
        app.destroy();
        return;
      }
      appRef.current = app;
      node.replaceChildren(app.canvas);

      const stage = new Container();
      app.stage.addChild(stage);
      stageRef.current = stage;

      const w = node.clientWidth || 270;
      const h = node.clientHeight || 270;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h * 1.3) * 0.45;

      stateRef.current.cx = cx;
      stateRef.current.cy = cy;
      stateRef.current.r = r;
      stateRef.current.needleLen = r * 0.68;

      // static arc
      const arc = new Graphics();
      arc
        .arc(cx, cy, r, deg2rad(MIN_DEG), deg2rad(MAX_DEG))
        .stroke({ width: 2, color: 0xffffff, cap: "round" });
      stage.addChild(arc);

      // labels
      const arcThickness = 2;
      const fontSize = Math.max(10, Math.round(r * 0.15));
      const labelPad = 25;
      const labelRadius = r - arcThickness / 2 - labelPad;
      for (let spd = MIN; spd <= MAX; spd += 10) {
        const ang = deg2rad(mapSpeedToAngle(spd));
        const lx = cx + Math.cos(ang) * labelRadius;
        const ly = cy + Math.sin(ang) * labelRadius;

        const label = new Text({
          text: String(spd),
          style: {
            fontFamily: "system-ui, sans-serif",
            fontSize,
            fill: 0xffffff,
            fontWeight: "600",
          },
        });
        label.anchor.set(0.5);
        label.x = lx;
        label.y = ly;
        stage.addChild(label);
      }

      // major ticks
      const tickLenMajor = 10;
      const tickWidth = 2;
      const majorTicks = new Graphics();
      for (let spd = MIN; spd <= MAX; spd += 10) {
        const ang = deg2rad(mapSpeedToAngle(spd));
        const outerR = r - arcThickness * 0.5;
        const innerR = outerR - tickLenMajor;

        const ox = cx + Math.cos(ang) * outerR;
        const oy = cy + Math.sin(ang) * outerR;
        const ix = cx + Math.cos(ang) * innerR;
        const iy = cy + Math.sin(ang) * innerR;

        majorTicks.moveTo(ox, oy).lineTo(ix, iy);
      }
      majorTicks.stroke({ width: tickWidth, color: 0xffffff, cap: "round" });
      stage.addChild(majorTicks);

      // animated parts
      const progress = new Graphics();
      const needle = new Graphics();
      progressRef.current = progress;
      needleRef.current = needle;
      stage.addChild(progress, needle);

      // hub
      stage.addChild(new Graphics().circle(cx, cy, Math.max(4, r * 0.07)).fill(0x3a9dfc));

      // initial angles
      const initial = deg2rad(mapSpeedToAngle(speed));
      stateRef.current.current = initial;
      stateRef.current.target = initial;

      drawNeedleAt(initial);
      drawProgressAt(initial);

      // ticker
      const ease = 0.12;
      const epsilon = deg2rad(0.2);
      const tick = () => {
        const { current, target } = stateRef.current;
        const d = target - current;
        if (Math.abs(d) > epsilon) {
          stateRef.current.current = current + d * ease;
          drawNeedleAt(stateRef.current.current);
          drawProgressAt(stateRef.current.current);
        }
      };
      app.ticker.add(tick);
    })();

    return () => {
      cancelled = true;
      try {
        node.replaceChildren();
      } catch {}
      try {
        appRef.current?.ticker?.stop();
      } catch {}
      try {
        appRef.current?.destroy(true);
      } catch {}
      stageRef.current = null;
      progressRef.current = null;
      needleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update target when prop `speed` changes
  useEffect(() => {
    stateRef.current.target = deg2rad(mapSpeedToAngle(speed));
  }, [speed]);

  function drawNeedleAt(ang: number) {
    const needle = needleRef.current;
    if (!needle) return;
    const { cx, cy, needleLen, r } = stateRef.current;
    const nx = cx + Math.cos(ang) * needleLen;
    const ny = cy + Math.sin(ang) * needleLen;
    needle.clear();
    needle
      .moveTo(cx, cy)
      .lineTo(nx, ny)
      .stroke({ width: Math.max(3, r * 0.04), color: 0xffffff, cap: "round" });
  }

  function drawProgressAt(ang: number) {
    const progress = progressRef.current;
    if (!progress) return;
    const { cx, cy, r } = stateRef.current;
    progress.clear();
    progress
      .arc(cx, cy, r - 4, deg2rad(MIN_DEG), ang)
      .stroke({ width: 6, color: 0x3a9dfc, cap: "butt" });
  }

  return (
    <div className="speedometer">
      <div className="dial" ref={hostRef} />
    </div>
  );
};

export default SpeedometerView;
