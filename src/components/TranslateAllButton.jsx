
import React from "react";
import { translateAll } from "../api/parsingLogic";

export const TranslateAllButton = ({
  appState,
  label = "Translate All",
}) => {
  const handleClick = () => {translateAll(appState);};
  return (
    <sp-action-button onClick={handleClick}>
      {label}
    </sp-action-button>
  );
};

