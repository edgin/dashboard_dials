import { observer } from "mobx-react-lite";
import { useEffect, useRef } from "react";
import { useStore } from "../Store/DashboardContext";
import "../WebComponents/engine-power.element";
import "../WebComponents/distance-tracker.element";
import "../WebComponents/speedometer.element";
import ControlButton from "./Button/ControlButton";
import "./Button/ControlButton.scss";

const Dashboard: React.FC = observer(() => {
  const store = useStore();
  console.log("Dashboard render", { power: store.power });

  const distRef = useRef<HTMLElement | null>(null);
  const speedRef = useRef<any>(null);

  useEffect(() => {
    if (!distRef.current) return;
    (distRef.current as any).distance = store.distance;
    (distRef.current as any).speed = store.speed;
  }, [store.distance, store.speed]);

  useEffect(() => {
    if (speedRef.current) {
      speedRef.current.store = store;
    }
  }, [store]);

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
      <engine-speed ref={speedRef} />
      <SimulationLoop />
      <distance-tracker ref={distRef} />
      <div className="engine-power-wrapper">
        <div className="engine-power-control">
          <engine-power power={String(store.power)} />
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
