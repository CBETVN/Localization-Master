import React, { useState, useRef } from "react";
// import { TranslateSuggestion } from "./TranslateSuggestion";
import "./PhraseReference.css";

export const PhraseReference = ({ 
  maxHeight = "300px",
  suggestions = [],
  selectedId = null,
  onSelect = () => {},
  onGenerate = () => {},
  isProcessing = false
}) => {

  return (
    <>
      <div className="phrase-reference">
           
            <sp-textarea width="200" height="200" id="phrase-reference-textarea" placeholder="Click &quot;Generate suggestions&quot; to fetch phrase reference." multiline></sp-textarea>

          
        </div>

    </>
  );
};
