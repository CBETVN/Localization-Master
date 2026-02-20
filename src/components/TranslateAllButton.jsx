
import React from "react";
import { translateAll } from "../api/parsingLogic";

export const TranslateAllButton = ({
  appState,
  onClick,
  label = "Translate All",
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    translateAll(appState);
  };
  return (
    <sp-action-button onClick={handleClick}>
      {label}
    </sp-action-button>
  );
};

