
import React from "react";
import { translateSelected } from "../api/parsingLogic";

export const TranslateSelectedButton = ({
  appState,
  label = "Translate Selected",
}) => {
  const handleClick = () => {translateSelected(appState);};
  return (
    <sp-action-button onClick={handleClick}>
      {label}
    </sp-action-button>
  );
};