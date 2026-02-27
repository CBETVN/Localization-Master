import React from "react";
import "./TranslateSelectedTextField.css";

export const TranslateSelectedTextField = ({ value, placeholder, onChange }) => {
  return (
    <sp-textfield
      className="suggestion-textfield"
      quiet
      placeholder={placeholder || "Select suggestion..."}
      value={value || ""}
      onInput={(e) => onChange(e.target.value)}
    />
  );
};

