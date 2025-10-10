// src/components/Dashboard.tsx
import React from "react";
import { basicStore } from "../Store/Store";
import DistanceTracker from "./DistanceSpeed/DistanceTracker";
import EnginePowerObserved from "./EnginePower/EnginePowerObserved";
import SpeedometerObserved from "./Speedometer/SpeedometerObserved";

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <SpeedometerObserved store={basicStore} />
      <DistanceTracker store={basicStore} />
      <EnginePowerObserved store={basicStore} />
    </div>
  );
};

export default Dashboard;
