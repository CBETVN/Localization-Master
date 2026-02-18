import React from "react";
import "./TranslateSuggestion.css";

export const TranslateSuggestion = ({ text, placeholder, isSelected, onClick }) => {
  return (
    <sp-menu-item 
      className="translate-suggestion" 
      selected={isSelected} 
      onClick={onClick}
    >
      {text || placeholder || "Suggestion..."}
    </sp-menu-item>
  );
};
