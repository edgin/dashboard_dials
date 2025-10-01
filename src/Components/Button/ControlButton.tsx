// src/components/ControlButton.tsx
import React from "react";
import plusIcon from "../../assets/arrow-up-sm.svg";
import minusIcon from "../../assets/arrow-down-sm.svg";

interface ControlButtonProps {
  onClick: () => void;
  variant?: "plus" | "minus";
}

const ControlButton: React.FC<ControlButtonProps> = ({ onClick, variant }) => {
  return (
    <button className="control-btn" onClick={onClick}>
      <img src={variant === "plus" ? plusIcon : minusIcon} alt={variant} className="icon"></img>
    </button>
  );
};

export default ControlButton;
