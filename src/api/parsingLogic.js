// import { asModal as executeAsModal } from "./utils/photoshop-utils.js";
// import { photoshop } from "../globals";
// Import XLSX - it's a UMD library that may attach to global scope
import "../lib/xlsx.full.min.js";
import { uxp } from "../globals";
import { photoshop } from "../globals";
import * as ps from "./photoshop.js"; // Import all Photoshop API functions as ps
// import {app} from "../globals"; // Import app for showing alerts, etc.
// Access XLSX from global scope
const XLSX = window.XLSX;
const { app } = photoshop;
const { executeAsModal } = photoshop.core;
const { batchPlay } = photoshop.action;

/**
 * Parse Excel file and extract language data
 * @param {File|ArrayBuffer} fileOrArrayBuffer - UXP file object or ArrayBuffer
 * @returns {Object} - { languageData, availableLanguages }
 */
export async function parseExcelFile(fileOrArrayBuffer) {
  let arrayBuffer;
  
  // Check if it's a UXP file object or already an ArrayBuffer
  if (fileOrArrayBuffer.read && typeof fileOrArrayBuffer.read === 'function') {
    // It's a UXP file object - read it
    arrayBuffer = await fileOrArrayBuffer.read({ format: uxp.storage.formats.binary });
  } else {
    // It's already an ArrayBuffer
    arrayBuffer = fileOrArrayBuffer;
  }
  
  // Parse XLSX file
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  // Extract language data from workbook
  return extractLanguageData(workbook);
}

/**
 * Extract language data from workbook
 * @param {Object} workbook - XLSX workbook object
 * @returns {Object} - { languageData, availableLanguages }
 */
// function extractLanguageData(workbook) {
//   // Get the first worksheet
//   const sheetName = workbook.SheetNames[0];
//   const worksheet = workbook.Sheets[sheetName];
  
//   // Convert to array of arrays (first row becomes headers)
//   const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
//   const languageData = {};
//   const availableLanguages = [];
  
//   if (jsonData.length > 0) {
//     // First row contains language keys (ENG, BG, DE, etc.)
//     const languages = jsonData[0];
    
//     // Columns to ignore (not language data) - case insensitive
//     const ignoredColumns = ["screen preview"];
    
//     // Store available languages (filter out empty cells and ignored columns)
//     languages.forEach(lang => {
//       if (lang && lang.trim() && !ignoredColumns.includes(lang.trim().toLowerCase())) {
//         availableLanguages.push(lang);
//         languageData[lang] = [];
//       }
//     });
    
//     // Process remaining rows (translation data for each language)
//     for (let i = 1; i < jsonData.length; i++) {
//       const row = jsonData[i];
//       row.forEach((cell, columnIndex) => {
//         const language = languages[columnIndex];
//         if (language && cell && typeof cell === 'string' && !ignoredColumns.includes(language.trim().toLowerCase())) {
//           languageData[language].push(cell);
//         }
//       });
//     }
//   }
  
//   return { languageData, availableLanguages };
// }

function extractLanguageData(workbook) {
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const languageData = {};
  const availableLanguages = [];

  if (jsonData.length > 0) {
    const languages = jsonData[0];
    const ignoredColumns = ["screen preview"];

    languages.forEach(lang => {
      if (lang && lang.trim() && !ignoredColumns.includes(lang.trim().toLowerCase())) {
        availableLanguages.push(lang);
        languageData[lang] = [];
      }
    });

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      availableLanguages.forEach((language) => {
        const columnIndex = languages.indexOf(language);
        const cell = row[columnIndex];
        languageData[language].push((cell && typeof cell === 'string') ? cell : "");
      });
    }
  }

  return { languageData, availableLanguages };
}

// Translates all visible group layers whose names match EN entries, in a modal scope
export async function translateAll(appState) {
  // Validate required state
  if (!appState.selectedLanguage) {
    app.showAlert("Please select a language first");
    return;
  }
  if (!appState.languageData || !appState.languageData["EN"]) {
    app.showAlert("No English language data loaded.");
    return;
  }

  let instances = [];
  const allLayers = ps.getAllLayers(photoshop.app.activeDocument.layers);

  for (const layer of allLayers) {
    let parentFolder = ps.getParentFolder(layer);
    if (parentFolder !== null && layer.visible === true && isNameENPhrase(parentFolder, appState)) {
      // console.log(`Layer: ${layer.name} is in matching parent folder: ${parentFolder} and will be translated by using "translateByFolder" function`);
      console.log("+1");
    } else if (layer.visible === true ) {
      // console.log(`Layer name: ${layer.name}`);
      // console.log(`Layer: ${layer.name} has no parent folder but is visible, checking if it matches EN list and will be translated by using "compareLayerTextToEN" function`);
      compareLayerNameToEN(layer, appState);
    }
  
  }
}


// Serch for parent folder and translate
export function translateByFolder(appState, allLayers) {
  
    for (const layer of allLayers) {
      // Only process visible group layers
      if (ps.isLayerAGroup(layer) && layer.visible === true) {
        if (isNameENPhrase(layer.name, appState)) {
          console.log(`Layer: ${layer.name} is in EN list and will be translated`);
          // Example action: hide the layer (replace with translation logic)
          // layer.visible = false;
          let childrenLayers = layer.layers;
          for (const child of childrenLayers) {
            console.log(`Child layer: ${child.name} of parent ${layer.name}`);
            if (child.kind === "textLayer" && child.visible === true) {
              console.log(`--> Text layer found: ${child.name}`);
            } else if (child.kind === "smartObject" && child.visible === true) {
              console.log(`--> SmartObject layer found: ${child.name}`);
            }
          }
        }
      }
    }


}





export async function translateSelectedLayer(appState) {
  console.log("Translating selected layer...");
  const activeLayer = app.activeDocument.activeLayers[0];
  if (!activeLayer) return;

  const suggestion = extractMatchingPhrase(activeLayer, appState);
  if (suggestion) {
    console.log("Suggestion found:", suggestion);
    await ps.translateSmartObject(activeLayer, suggestion);
  } else {
    console.log("No matching phrase found for selected layer.");
  }
}


export async function generateSuggestions(layer, appState) {
  let parentFolder = layer.parent;
  if (!parentFolder) {
    app.showAlert("Cant find phrase reference for this layer.");
    return null;
  }

  if (extractMatchingPhrase(parentFolder, appState)) {
    const suggestion = extractMatchingPhrase(parentFolder, appState);
    console.log("Suggestion found:", suggestion);
    if (!suggestion) {
      app.showAlert("No matching translation found for this layer.");
      return null;
    }
    return parsePhraseForSuggestions(suggestion);
  }

  app.showAlert("Parent folder does not match any EN phrase.");
  return null;
}


////////////// Helper functions //////////////////////



/**
 * Parses a raw phrase string into different representations based on the requested mode.
 * Strips (…) annotations in all modes.
 * Modes:
 *   "raw"      — returns phrase with \n intact and [] preserved, only (…) stripped
 *   "oneLiner" — collapses all lines into one space-separated string, [] content stripped
 *   "withLines"— returns array of individual words across all lines, [] content stripped
 *   "strict"   — same as oneLiner but drops entire lines that contain [...] placeholders
 */
export function parseRawPhrase(phrase, mode = "oneLiner") {

  // strip (…) annotations in ALL modes
  const cleaned = phrase.replace(/\(.*?\)/g, "").replace(/\s+\n/g, "\n").trim();

  // raw — return with \n intact, [] preserved, just (…) stripped
  if (mode === "raw") return cleaned;

  // strip […] placeholders and split into lines
  const lines = cleaned
    .split("\n")
    .map(l => l.trim().replace(/\[.*?\]/g, "").trim())
    .filter(Boolean);

  // oneLiner — all lines collapsed into one space-separated string
  if (mode === "oneLiner") return lines.join(" ").replace(/\s+/g, " ").trim();

  // withLines — individual words from all lines, one per entry
  if (mode === "linesArray") return lines.flatMap(l => l.split(/\s+/)).filter(Boolean);

  // test — remove entire line if it contains [...], keep rest as oneLiner
  if (mode === "strict") {
    const strictLines = cleaned
      .split("\n")
      .map(l => l.trim())
      .filter(l => l && !/\[.*?\]/.test(l));
    return strictLines.join(" ").replace(/\s+/g, " ").trim();
  }

  throw new Error(`parseRawPhrase: unknown mode "${mode}"`);
}


// Parses a newline-delimited phrase into an array of translation candidates.
// Returns individual lines, individual words, adjacent line pairs, and the full phrase joined by spaces.
// Used to maximize matching coverage against the EN translation table.

export function parsePhraseForSuggestions(phrase) {
    // Split into lines, trim, strip trailing punctuation
  const lines = phrase
    .split("\n")
    .map(l => l.trim().replace(/[.,!?]+$/, ""))
    .filter(Boolean);

  const results = new Set();

  // 1. Individual lines as-is
  lines.forEach(line => results.add(line));

  // 2. Individual words from each line
  lines.forEach(line => {
    line.split(/\s+/).forEach(word => results.add(word));
  });

  // 3. Sliding window — adjacent line pairs joined with space
  for (let i = 0; i < lines.length - 1; i++) {
    results.add(lines[i] + " " + lines[i + 1]);
  }

  // 4. Full phrase — all lines joined with space
  results.add(lines.join(" "));

  return Array.from(results);

}




//parse a phrase into lines and ignore lines with () or [] (like [NUMBER])
export function parseForTranslation(text) {
  return text
    .split('\n') // Split into lines
    .map(line => line.trim()) // Remove extra spaces
    .filter(line => line && !line.includes('(') && !line.includes('[')); // Ignore lines with () or []
}


// Checks if a layer name matches any line in the EN phrases array from appState.languageData
export function isNameENPhrase(layerName, appState) {
  const engKey = appState.languageData && appState.languageData["EN"];
  if (!engKey || !Array.isArray(engKey)) return false;
  for (const entry of engKey) {
    const lines = entry.split('\n').map(line => line.trim());
      // Split, trim, and filter out lines with (), [], or {}
      const validLines = entry
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !/[\[\](){}]/.test(line));
      const joined = validLines.join(' ');
      if (joined === layerName) {
      return true;
    }
  }
  return false;
}


export function getChildrenLayers(layer) {
    if (layer.kind === "group" && layer.layers && layer.layers.length > 0) {
        return layer.layers;
    }
    return [];
}






// Compare layer.name to parsed EN lines, log and break on first match
export function compareLayerNameToEN(layer, appState) {
  const enEntries = appState.languageData && appState.languageData["EN"];
  if (!enEntries || !Array.isArray(enEntries)) return false;
  // Preprocess all EN lines to uppercase for case-insensitive comparison
  const enLines = [];
  for (const entry of enEntries) {
    enLines.push(...parseForTranslation(entry).map(line => line.toUpperCase()));
  }
  const enLineSet = new Set(enLines);
  // Compare layer.name uppercased
  const layerNameUpper = layer.name.toUpperCase();
  if (enLineSet.has(layerNameUpper)) {
    console.log(`Layer name "${layer.name}" matches EN line.`);
    return true;
  }
  return false;
}



//Temporary function to generate suggestions based on selected language - replace with actual logic
export function extractMatchingPhrase(layer, appState) {
  const enEntries = appState.languageData && appState.languageData["EN"];
  const selectedLang = appState.selectedLanguage;
  const langEntries = appState.languageData && appState.languageData[selectedLang];
  if (!enEntries || !Array.isArray(enEntries) || !langEntries || !Array.isArray(langEntries)) return null;

  for (let i = 0; i < enEntries.length; i++) {
    // Normalize EN phrase: replace all whitespace (tabs, newlines, etc.) with a single space, then uppercase
    const normalizedEN = parseRawPhrase(enEntries[i], "strict");
    // console.log(`Comparing: "${layer.name.toUpperCase().trim()}" vs "${normalizedEN}"`);

    if (layer.name.toUpperCase() === normalizedEN.toUpperCase()) {
      const phrase = parseRawPhrase(langEntries[i], "strict"); // Get the corresponding phrase in the selected language
      // console.log(`Layer name: ${layer.name}, Phrase: ${enEntries[i]}, Suggestion: ${phrase}`);
      return phrase !== undefined ? phrase : null;
    }
  }
  return null;
}


