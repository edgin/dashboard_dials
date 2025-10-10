// src/components/Speedometer/SpeedometerObserved.tsx
import React from "react";
import { observer } from "mobx-react-lite";
import SpeedometerView from "./SpeedometerView";

type StoreLike = { speed: number };

const SpeedometerObserved: React.FC<{ store: StoreLike }> = observer(({ store }) => {
  return <SpeedometerView speed={store.speed} />;
});

export default SpeedometerObserved;
