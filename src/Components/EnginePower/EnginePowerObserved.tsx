import React from "react";
import { observer } from "mobx-react-lite";
import EnginePowerView from "./EnginePowerView";

type StoreLike = {
  power: number;
  incPower: (d?: number) => void;
  decPower: (d?: number) => void;
};

const EnginePowerObserved: React.FC<{ store: StoreLike }> = observer(({ store }) => {
  return <EnginePowerView power={store.power} onInc={store.incPower} onDec={store.decPower} />;
});

export default EnginePowerObserved;
