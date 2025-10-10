import React from "react";
import { Application, Graphics } from "pixi.js";
import "./EnginePower.scss";
import ControlButton from "../Button/ControlButton";
import "../Button/ControlButton.scss";

export type EnginePowerViewProps = {
  power: number; // 0..6
  onInc?: (delta?: number) => void;
  onDec?: (delta?: number) => void;
};

const EnginePowerView: React.FC<EnginePowerViewProps> = ({ power, onInc, onDec }) => {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const appRef = React.useRef<Application | null>(null);
  const gfxRef = React.useRef<Graphics | null>(null);

  // Init Pixi once
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;

    (async () => {
      const app = new Application();
      await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true });
      if (cancelled) {
        app.destroy(true);
        return;
      }
      host.appendChild(app.canvas);
      appRef.current = app;

      const gfx = new Graphics();
      app.stage.addChild(gfx);
      gfxRef.current = gfx;

      draw(power);
    })();

    return () => {
      cancelled = true;
      try {
        gfxRef.current?.destroy();
      } catch {}
      gfxRef.current = null;

      const app = appRef.current;
      appRef.current = null;
      if (app) {
        try {
          app.destroy(true);
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // init once

  // Re-draw when power changes
  React.useEffect(() => {
    draw(power);
  }, [power]);

  function draw(p: number) {
    const gfx = gfxRef.current;
    if (!gfx) return;

    const w = 55;
    const h = 219;

    const clamped = Math.max(0, Math.min(6, Number(p) || 0));
    const fillH = Math.max(0, Math.min(h - 2, (clamped / 6) * (h - 2)));
    const innerYBottom = h - 1;
    const innerW = w - 2;

    gfx.clear();
    gfx.rect(1, innerYBottom - fillH, innerW, fillH).fill({ color: 0x3b82f6 });
    gfx.rect(0.5, 0.5, w - 1, h - 1).stroke({ width: 1, color: 0xffffff, alignment: 0.5 });
  }

  return (
    <div className="engine-power-wrapper">
      <div className="engine-power-control">
        <div className="engine-power" ref={hostRef} />
        <div className="controls">
          <ControlButton variant="plus" onClick={() => onInc?.(0.1)} />
          <ControlButton variant="minus" onClick={() => onDec?.(0.1)} />
        </div>
      </div>
    </div>
  );
};

export default EnginePowerView;
