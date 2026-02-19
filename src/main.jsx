import React, { useEffect, useState } from "react";

// import boltUxpLogo from "./assets/bolt-uxp.png";
// import viteLogo from "./assets/vite.png";
// import tsLogo from "./assets/typescript.png";
// import sassLogo from "./assets/sass.png";
// import reactLogo from "./assets/react.png";

import { uxp, photoshop} from "./globals";
import { api } from "./api/api";
import { TranslateSuggestion } from "./components/TranslateSuggestion";
import { SuggestionsContainer } from "./components/SuggestionsContainer";

import * as XLSX from "./lib/xlsx.full.min.js";
const { app, core, action } = photoshop;

export const App = () => {
  const webviewUI = import.meta.env.VITE_BOLT_WEBVIEW_UI === "true";
  
  const [count, setCount] = useState(0);
  const increment = () => setCount((currentValue) => currentValue + 1);

  const [selectedId, setSelectedId] = useState(null);
  const [suggestions, setSuggestions] = useState([
    { id: 1, text: "", placeholder: "Suggestion..." },
    { id: 2, text: "", placeholder: "Suggestion..." },
    { id: 3, text: "", placeholder: "Suggestion..." },
    { id: 4, text: "", placeholder: "Suggestion..." },
    { id: 5, text: "", placeholder: "Suggestion..." },
  ]);

  // Example: Dynamically update suggestion text
  const updateSuggestion = (id, newText) => {
    setSuggestions(prev =>
      prev.map(s => s.id === id ? { ...s, text: newText } : s)
    );
  };

  const hostName = (uxp.host.name).toLowerCase();

  //* Call Functions Conditionally by App
  // if (hostName === "photoshop") {
  //   console.log("Hello from Photoshop", photoshop);
  // }
      
  //* Or call the unified API object directly and the correct app function will be used
  const simpleAlert = () => {
    api.notify("Hello World");
  };

  function test() {
    app.showAlert("Hello from the API!");
  }



  return (
    <>
      {!webviewUI ? (
        <main>
        <sp-menu>
          {suggestions.map(suggestion => (
            <TranslateSuggestion
              key={suggestion.id}
              text={suggestion.text}
              placeholder={suggestion.placeholder}
              isSelected={selectedId === suggestion.id}
              onClick={() => setSelectedId(suggestion.id)}
            />
          ))}
        </sp-menu>
          <div className="card">

          </div>
          <p>
            Some text
          </p>
          <div className="card">


            <button onClick={async () => {
            const activeLayer = app.activeDocument.activeLayers[0];
            const info = await api.doesSelectedSOhaveInstances(activeLayer);
            }}>Check Layer Info
          </button>
          {/* <button onClick={increment}>Count is {count}</button> */}
          <button onClick={test}>Complex Alert</button>
          <button onClick={() => updateSuggestion(1, "Updated Suggestion!")}>
              Update First Suggestion
          </button>
          <SuggestionsContainer maxHeight="200px" />
          </div>
        </main>
      ) : (
        <div>
          <h1>Hello World</h1>
          <p>This is a Bolt WebView UI plugin.</p>
        </div>
      )}
    </>
  );
};
