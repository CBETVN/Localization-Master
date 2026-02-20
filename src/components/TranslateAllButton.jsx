
import React from "react";
import { translateAll } from "../api/parsingLogic";

export const TranslateAllButton = ({
  onClick,
  label = "Translate All",
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    translateAll();
  };
  return (
    <sp-action-button onClick={handleClick}>
      {label}
    </sp-action-button>
  );
};

