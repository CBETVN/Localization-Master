import React, { useState, useRef } from "react";
import { TranslateSuggestion } from "./TranslateSuggestion";
import "./SuggestionsContainer.css";

export const SuggestionsContainer = ({ 
  maxHeight = "300px",
  suggestions = [],
  selectedId = null,
  onSelect = () => {},
  onGenerate = () => {},
  isProcessing = false
}) => {

  return (
    <>
      <div className="suggestions-container">
        <div 
          className="suggestions-container-scrollable"
          style={{ height: maxHeight }}
        >
          {suggestions.length === 0 ? (
            <div className="suggestions-container-empty">
              No suggestions yet.
            </div>
          ) : (
            <sp-menu>
              {suggestions.map((suggestion) => (
                <TranslateSuggestion
                  key={suggestion.id}
                  text={suggestion.text}
                  placeholder={suggestion.placeholder}
                  isSelected={selectedId === suggestion.id}
                  onClick={() => onSelect(suggestion.id)}
                />
              ))}
            </sp-menu>
          )}
        </div>

        {/* Footer buttons */}
        {/* <div className="suggestions-footer">
          <sp-action-button size="xl" disabled={isProcessing}>
            Apply All
          </sp-action-button>
          <sp-action-button size="xl" disabled={isProcessing}>
            Apply Selected
          </sp-action-button>
        </div> */}
      </div>
    </>
  );
};
