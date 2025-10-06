import { observer } from "mobx-react-lite";
import { useEffect, useRef } from "react";
import { useStore } from "../Store/DashboardContext";
import "../WebComponents/engine-power.element";
import "../WebComponents/distance-tracker.element";
// import "../WebComponents/engine-speed.element";
import SpeedometerPixi from "./Speedometer";
import ControlButton from "./Button/ControlButton";
import "./Button/ControlButton.scss";

type EnginePowerEl = HTMLElement & { power: number };
type DistanceTrackerEl = HTMLElement & { distance: number; speed: number };
type EngineSpeedEl = HTMLElement & { store: unknown };

/**
 * Dashboard:
 * - Observed by MobX, so it re-renders when observable values used here change.
 * - Wires the store to web components via properties (fast) instead of attributes (stringy).
 * - Runs the simulation loop that calls store.tick(dt).
 */

const Dashboard: React.FC = observer(() => {
  const store = useStore();
  /**
   *  Forwarding data as refs properties seems
   *  more efficient for FPS situations
   */
  const distRef = useRef<DistanceTrackerEl | null>(null);
  const speedRef = useRef<EngineSpeedEl | null>(null);
  const powerRef = useRef<EnginePowerEl | null>(null);

  // Keep distance-tracker's live props in sync with the store.
  // This uses direct property assignment (no attributeChangedCallback overhead).
  useEffect(() => {
    if (!distRef.current) return;
    (distRef.current as any).distance = store.distance;
    (distRef.current as any).speed = store.speed;
  }, [store.distance, store.speed]);

  // Provide the store object to engine-speed once (or when store identity changes).
  // The element can subscribe internally and render at its own pace.
  useEffect(() => {
    if (speedRef.current) {
      speedRef.current.store = store;
    }
  }, [store]);

  // Property-based sync for engine-power (no attributes, no string conversion)
  useEffect(() => {
    const el = powerRef.current;
    if (!el) return;
    if (el.power !== store.power) el.power = store.power;
  }, [store.power]);

  /**
   * SimulationLoop
   * - requestAnimationFrame loop that advances the MobX store over time.
   * - Uses refs to store frame/timestamps without re-rendering.
   * - Calls store.tick(dtMs) each frame with a clamped delta.
   * - Cleans up on unmount.
   */
  const SimulationLoop = () => {
    const store = useStore();
    const last = useRef<number | null>(null);
    const raf = useRef<number | null>(null);

    useEffect(() => {
      const loop = (t: number) => {
        if (last.current != null) {
          const dt = Math.min(100, t - last.current);
          store.tick(dt);
        }
        last.current = t;
        raf.current = requestAnimationFrame(loop);
      };
      raf.current = requestAnimationFrame(loop);
      return () => {
        if (raf.current) cancelAnimationFrame(raf.current);
        last.current = null;
      };
    }, [store]);

    return null;
  };

  return (
    <div className="dashboard">
      {/* <speedometer ref={speedRef} /> */}
      <SpeedometerPixi value={120} size={270} />
      <SimulationLoop />
      <distance-tracker ref={distRef} />
      <div className="engine-power-wrapper">
        <div className="engine-power-control">
          <engine-power ref={powerRef} />
        </div>
        <div className="controls">
          <ControlButton variant="plus" onClick={() => store.inc()} />
          <ControlButton variant="minus" onClick={() => store.dec()} />
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
