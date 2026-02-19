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
  const [suggestions, setSuggestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Generate suggestions from your logic
  const handleGenerate = async () => {
    try {
      setIsProcessing(true);
      
      // TODO: Replace this with your actual function that returns an array
      // Example: const phrases = await yourFunctionThatReturnsArray();
      const phrases = ["Example phrase 1", "Example phrase 2", "Example phrase 3"];
      
      // Convert array to suggestion objects
      const newSuggestions = phrases.map((text, index) => ({
        id: index + 1,
        text,
        placeholder: ""
      }));
      
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error("Error generating suggestions:", error);
    } finally {
      setIsProcessing(false);
    }
  };

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
          
          <SuggestionsContainer 
            maxHeight="400px"
            suggestions={suggestions}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onGenerate={handleGenerate}
            isProcessing={isProcessing}
          />
          <button onClick={() => api.getParentFolder(app.activeDocument.activeLayers[0])}>parent folder?</button>
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
