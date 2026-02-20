import React from "react";

export const TranslateAllButton = ({
  onClick = () => {},
  label = "Translate All",
}) => {
  return (
    <sp-action-button onClick={onClick}>
      {label}
    </sp-action-button>
  );
};
