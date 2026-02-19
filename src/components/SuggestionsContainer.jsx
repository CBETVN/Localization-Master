import React, { useState, useRef } from "react";
import "./SuggestionsContainer.css";

export const SuggestionsContainer = ({ maxHeight = "300px" }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

//   const handleCheckUncheck = (action) => {
//     if (action === 'check') {
//       setSuggestions(prev => prev.map(s => ({ ...s, checked: true })));
//     } else if (action === 'uncheck') {
//       setSuggestions(prev => prev.map(s => ({ ...s, checked: false })));
//     }
//   };

  return (
    <>
      <div className="suggestions-container">
        {/* <div className="suggestions-container-header">
          <div className="counters">
            <span className="suggestion-counter">All suggestions ({suggestions.length})</span>
            <span className="checked-counter">Checked ({suggestions.filter(s => s.checked).length})</span>
          </div>
        </div> */}

        {/* Scrollable container */}
        <div 
          className="suggestions-container-scrollable"
          style={{ height: maxHeight }}
        >
          {suggestions.length === 0 ? (
            <div className="suggestions-container-empty">
              No suggestions yet.
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <div key={suggestion.id} className="suggestion-item">
                <div className="suggestion-item-content">
                  {/* Suggestion content goes here */}
                  {suggestion.text}
                </div>
              </div>
            ))
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
