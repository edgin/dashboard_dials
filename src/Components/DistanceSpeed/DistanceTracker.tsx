// src/components/DistanceTracker.tsx
import React from "react";
import { observer } from "mobx-react-lite";
import "./DistanceTracker.scss";

type Props = {
  store: { speed: number; distance: number };
  round?: boolean; // defaults to true (integer display)
};

const DistanceTracker: React.FC<Props> = observer(({ store, round = true }) => {
  const speed = Number.isFinite(store.speed) ? store.speed : 0;
  const distance = Number.isFinite(store.distance) ? store.distance : 0;

  const speedText = round ? Math.round(speed).toString() : speed.toFixed(1);
  const distanceText = round ? Math.round(distance).toString() : distance.toFixed(1);

  return (
    <div className="distance-tracker">
      <div className="block">
        <span className="value">{speedText}</span>
        <span className="unit">km/h</span>
      </div>
      <div className="block">
        <span className="value">{distanceText}</span>
        <span className="unit">km</span>
      </div>
    </div>
  );
});

export default DistanceTracker;
