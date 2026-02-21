import React from "react";

export const GenerateSuggestionsButton = ({ onClick, disabled }) => {
  return (
    <sp-action-button onClick={onClick} disabled={disabled}>
      Generate Suggestions
    </sp-action-button>
  );
};