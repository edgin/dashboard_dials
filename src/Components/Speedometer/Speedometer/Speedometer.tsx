// src/components/Speedometer.tsx
import { observer } from "mobx-react-lite";
import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import { store } from "../../../Store/Store";
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

const Speedometer = observer(function Speedometer() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;

    let cancelled = false;
    let app: Application | null = null;

    (async () => {
      const a = new Application();
      await a.init({
        antialias: true,
        backgroundAlpha: 0,
        resizeTo: node,
        autoDensity: true,
      });

      // if unmounted during init, kill and bail
      if (cancelled) {
        a.destroy();
        return;
      }

      // ensure a single canvas (no duplicates)
      node.replaceChildren(a.canvas);
      app = a;

      // --- draw a static base arc so you see something
      const stage = new Container();
      app.stage.addChild(stage);

      const w = node.clientWidth || 270;
      const h = node.clientHeight || 270;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h * 1.3) * 0.45;

      const arc = new Graphics();
      arc
        .arc(cx, cy, r, deg2rad(MIN_DEG), deg2rad(MAX_DEG))
        .stroke({ width: 2, color: 0xffffff, cap: "round" });
      stage.addChild(arc);

      // Setup labels

      const arcThickness = 2;
      const fontSize = Math.max(10, Math.round(r * 0.15));
      const labelPad = 25;

      const labelRadius = r - arcThickness / 2 - labelPad; // was r + ...

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
      // Add ticks
      const tickLenMajor = 10;
      const tickWidth = 2;

      const majorTicks = new Graphics();
      for (let spd = MIN; spd <= MAX; spd += 10) {
        const ang = deg2rad(mapSpeedToAngle(spd));
        const outerR = r - arcThickness * 0.5; // start just inside arc edge
        const innerR = outerR - tickLenMajor; // go inward by tick length

        const ox = cx + Math.cos(ang) * outerR;
        const oy = cy + Math.sin(ang) * outerR;
        const ix = cx + Math.cos(ang) * innerR;
        const iy = cy + Math.sin(ang) * innerR;

        majorTicks.moveTo(ox, oy).lineTo(ix, iy);
      }
      majorTicks.stroke({ width: tickWidth, color: 0xffffff, cap: "round" });
      stage.addChild(majorTicks);

      // --- static needle pointing at current store.speed
      const needle = new Graphics();
      const needleLen = r * 0.68; // length toward the arc
      const angle = deg2rad(mapSpeedToAngle(store.speed));
      const nx = cx + Math.cos(angle) * needleLen;
      const ny = cy + Math.sin(angle) * needleLen;

      needle
        .moveTo(cx, cy)
        .lineTo(nx, ny)
        .stroke({ width: Math.max(3, r * 0.04), color: 0xffffff, cap: "round" });

      stage.addChild(needle);

      // --- hub (center cap)
      stage.addChild(new Graphics().circle(cx, cy, Math.max(4, r * 0.07)).fill(0x3a9dfc));

      // Progress strip from MIN_DEG up to current speed angle
      const progressArcThicknes = 6;
      const progress = new Graphics();
      const startA = deg2rad(MIN_DEG);
      const currA = deg2rad(mapSpeedToAngle(store.speed));

      progress
        .arc(cx, cy, r - 4, startA, currA)
        .stroke({ width: progressArcThicknes, color: 0x3a9dfc, cap: "butt" });

      stage.addChild(progress);
    })();

    return () => {
      cancelled = true;
      try {
        node.replaceChildren();
      } catch {}
      try {
        app?.destroy();
      } catch {}
      app = null;
    };
  }, []);

  return (
    <div className="speedometer">
      <div className="dial" ref={hostRef} />
      <div className="readout">
        <span className="value">{store.speed}</span>
        <span className="unit">km/h</span>
      </div>
    </div>
  );
});

export default Speedometer;
