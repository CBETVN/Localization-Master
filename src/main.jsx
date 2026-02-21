import React, { useEffect, useState } from "react";

import { uxp, photoshop} from "./globals";
import { api } from "./api/api";
import { TranslateSuggestion } from "./components/TranslateSuggestion";
import { SuggestionsContainer } from "./components/SuggestionsContainer";
import { PhraseReference } from "./components/PhraseReference";
import { LoadFDiskButton } from "./components/LoadFDiskButton";
import { LoadFURLButton } from "./components/LoadFURLButton";
import { TranslateAllButton } from "./components/TranslateAllButton";
import { LanguageSelectorDropdown } from "./components/LanguageSelectorDropdown";
import { DataStatusIcon } from "./components/DataStatusIcon";
import { GenerateSuggestionsButton } from "./components/GenerateSuggestionsButton";
import * as pl from "./api/parsingLogic";
// import * as XLSX from "./lib/xlsx.full.min.js";

const { app, core, action } = photoshop;

export const App = () => {
  const webviewUI = import.meta.env.VITE_BOLT_WEBVIEW_UI === "true";
  
  // const [count, setCount] = useState(0);
  // const increment = () => setCount((currentValue) => currentValue + 1);
  const [languageData, setLanguageData] = useState({});
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Bundle all relevant state into a single object to pass to logic/helpers or child components
  const appState = {
  languageData,
  availableLanguages,
  selectedLanguage,
  isDataLoaded,
  // ...add more as needed
  };


  const [selectedId, setSelectedId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);


  const handleFileLoaded = (parsedData) => {
    const hasLanguageData =
      parsedData &&
      parsedData.languageData &&
      Object.keys(parsedData.languageData).length > 0;
    const hasAvailableLanguages =
      parsedData &&
      Array.isArray(parsedData.availableLanguages) &&
      parsedData.availableLanguages.length > 0;

    if (!hasLanguageData || !hasAvailableLanguages) {
      setIsDataLoaded(false);
      return;
    }

    setLanguageData(parsedData.languageData);
    setAvailableLanguages(parsedData.availableLanguages);
    setIsDataLoaded(true);
    // Don't auto-select - let user choose
  };



  // Generate suggestions from your logic
  const handleGenerate = async () => {
    
    const count = Math.floor(Math.random() * 10) + 1; // random 1–10 suggestions
    const newSuggestions = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      text: `Suggestion #${Math.floor(Math.random() * 100)}`,
      placeholder: ""
    }));
    setSuggestions(newSuggestions);
    // // Validate that a language is selected
    // if (!selectedLanguage) {
    //   api.notify("Please select a language first");
    //   return;
    // }
    
    // // Validate that language data exists
    // if (!languageData[selectedLanguage]) {
    //   api.notify("No translation data available for selected language");
    //   return;
    // }
    
    // try {
    //   setIsProcessing(true);
      
    //   // TODO: Replace this with your actual function that returns an array
    //   // Example: const phrases = languageData[selectedLanguage];
    //   const phrases = ["Example phrase 1", "Example phrase 2", "Example phrase 3"];
      
    //   // Convert array to suggestion objects
    //   const newSuggestions = phrases.map((text, index) => ({
    //     id: index + 1,
    //     text,
    //     placeholder: ""
    //   }));
      
    //   setSuggestions(newSuggestions);
    // } catch (error) {
    //   console.error("Error generating suggestions:", error);
    // } finally {
    //   setIsProcessing(false);
    // }
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

  function findLayersPosition() {
  const selectedLayer = app.activeDocument.activeLayers[0];

  if (selectedLayer.kind === "group") {
      const groupLayers = selectedLayer.layers;

      console.log(`Layers in group "${selectedLayer.name}":`);
      groupLayers.forEach((layer, index) => {
          console.log(`Position ${index} (0 = top): ${layer.name}`);
      });
  } else {
      console.log("Selected layer is not a group.");
  }
  }



  return (
    <>
      {!webviewUI ? (
        <main>

          <DataStatusIcon isActive={isDataLoaded} />

          <LoadFDiskButton onFileLoaded={handleFileLoaded} />
          <LoadFURLButton onFileLoaded={handleFileLoaded} />
          <div className="card">

            <LanguageSelectorDropdown
            availableLanguages={availableLanguages}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />
          </div>
          <TranslateAllButton appState={appState} />
          <div className="card">
            <button onClick={async () => {
            // const activeLayer = app.activeDocument.activeLayers[0];
            const info = await pl.translateSelectedLayer(appState);
            }}>Translate Selected
          </button>
          {/* <button onClick={increment}>Count is {count}</button> */}
          <button onClick={() => updateSuggestion(1, "Updated Suggestion!")}>
              Update First Suggestion
          </button>
          <div className="translate-selected-container">
            <GenerateSuggestionsButton onClick={handleGenerate} disabled={isProcessing || !selectedLanguage} />
            <div className="phrase-reference-container">
              <SuggestionsContainer 
                maxHeight="200px"
                suggestions={suggestions}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onGenerate={handleGenerate}
                isProcessing={isProcessing}
              />
              <PhraseReference/>
            </div>
            <button onClick={() => api.getParentFolder(app.activeDocument.activeLayers[0])}>parent folder?</button>
          </div>
          <button onClick={findLayersPosition}>Complex Alert</button>

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
