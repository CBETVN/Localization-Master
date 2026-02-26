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
const { app, constants } = photoshop;
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




/**
 * Scans all visible layers in the active document and identifies unique Smart Objects
 * and matching EN folder names for translation.
 *
 * Fetches all layer info in a single batchPlay call upfront to avoid redundant
 * Photoshop API calls during the loop. Deduplicates Smart Object instances using
 * their shared SO ID so each unique Smart Object is processed only once.
 *
 * @param {Object} appState - Application state.
 * @param {string} appState.selectedLanguage - The target language code (e.g. "DE", "SK").
 * @param {Object} appState.languageData - Map of language code -> array of phrases.
 */
export async function translateAll(appState) {
  const startTime = Date.now();
  if (!appState.selectedLanguage) {
    app.showAlert("Please select a language first");
    return;
  }
  if (!appState.languageData?.["EN"]) {
    app.showAlert("No data loaded.");
    return;
  }

  const allVisibleLayers = ps.getAllVisibleLayers(app.activeDocument.layers);
  const layerIndexMap = new Map(allVisibleLayers.map((l, i) => [l.id, i]));

  // Single batchPlay fetch for all layers
  const allInfos = await batchPlay(
    allVisibleLayers.map(l => ({ _obj: "get", _target: [{ _ref: "layer", _id: l.id }] })),
    { synchronousExecution: true }
  );

  const smartObjectInstances = new Set();
  let processedLayers = 0;
  let uniqueSOsFound = 0;

  for (const layer of allVisibleLayers) {
    if (!layer.visible || smartObjectInstances.has(layer.id)) continue;

    if (ps.isLayerAGroup(layer)) {
      if (isNameENPhrase(layer.name, appState)) {
        processedLayers++;
        console.log(`Layer: ${layer.name} is a matching folder`);
        await processMatchedFolder(layer, appState);
      }
      continue;
    }

    if (layer.kind !== constants.LayerKind.SMARTOBJECT) continue;

    const layerInstances = ps.getSmartObjectInstances(layer, allVisibleLayers, allInfos, layerIndexMap);
    if (!layerInstances) continue;
    processedLayers++;
    uniqueSOsFound++;
    layerInstances.forEach(instance => {
      smartObjectInstances.add(instance.id);
      console.log(instance.name);
    });
  }
  console.log(`Total instances found: ${smartObjectInstances.size}, total processed layers: ${processedLayers}`);
  console.log(`Total layers: ${allVisibleLayers.length}`);
  console.log(`Processed ${processedLayers} layers, found ${uniqueSOsFound} unique SOs with ${smartObjectInstances.size} total instances.`);
  console.log(`translateAll took ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
}





export async function processMatchedFolder(folderLayer, appState) {
    const rawTranslation = extractMatchingPhrase(folderLayer, appState);
    if (!rawTranslation) return;

    const chunks = parseRawPhrase(rawTranslation, "linesArray");
    // Reverse is not needed here
    // const children = [...folderLayer.layers].reverse();
    const children = [...folderLayer.layers];
    const count = Math.min(chunks.length, children.length);

    for (let i = 0; i < count; i++) {
        const layer = children[i];
        const chunk = chunks[i];

        if (!layer.visible) continue;

        if (layer.kind === constants.LayerKind.SMARTOBJECT) {
            await ps.translateSmartObject(layer, chunk);

        } else if (layer.kind === constants.LayerKind.TEXT) {
            console.log(`Text layer — not yet implemented: "${layer.name}", chunk: "${chunk}"`);
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
  const suggestion = extractMatchingPhrase(parentFolder, appState);
  if (suggestion) { 
    console.log("Suggestion found:", suggestion);
    return parsePhraseForSuggestions(suggestion);
  }else {
    app.showAlert("Parent folder does not match any EN phrase.");
      return null;}
}


////////////// Helper functions //////////////////////





/**
 * Matches child layers (Smart Objects or Text layers) to translated lines
 * using name-first, tail-anchored logic.
 *
 * @param {Array} childLayers  - [{ id, name, stackIndex }]
 * @param {Array} enLines      - ["TOTAL", "CREDITS", "WON"]
 * @param {Array} transLines   - ["GESAMTGUTHABEN", "GEWONNEN"]
 * @returns {Object}           - { skipped, reason, confidence, result }
 *                               result is Map<layerId, { text, matchType, enIndex } | null>
 *                               null means untouched
 */
function matchLayersToLines(childLayers, enLines, transLines) {
  const result = new Map();

  // Build normalized EN word → index lookup
  // e.g. "TOTAL" → 0, "CREDITS" → 1, "WON" → 2
  const enIndexByName = new Map(
    enLines.map((word, i) => [word.trim().toUpperCase(), i])
  );

  // Resolve each layer to an EN index using confidence ladder:
  //   1. Exact name match   → layer name matches EN word exactly
  //   2. Fuzzy name match   → layer name starts with EN word ("CREDITS copy 2")
  //   3. Stack index        → last resort, risky if layers were reordered
  const resolved = childLayers.map((layer) => {
    const normalizedName = layer.name.trim().toUpperCase();

    // 1. Exact match
    if (enIndexByName.has(normalizedName)) {
      return { layer, enIndex: enIndexByName.get(normalizedName), matchType: "name" };
    }

    // 2. Fuzzy — layer name starts with an EN word ("CREDITS copy 2" → "CREDITS")
    const fuzzyIndex = enLines.findIndex((word) =>
      normalizedName.startsWith(word.trim().toUpperCase())
    );
    if (fuzzyIndex !== -1) {
      return { layer, enIndex: fuzzyIndex, matchType: "fuzzy" };
    }

    // 3. Stack index — last resort
    return { layer, enIndex: layer.stackIndex, matchType: "stackIndex" };
  });

  // Sort by EN index so assignment is always top-down
  // regardless of how the artist ordered the layers in the panel
  resolved.sort((a, b) => a.enIndex - b.enIndex);

  // Confidence guard — skip folder if too many layers are unrecognizable
  // confidence 1.0 = all matched by name/fuzzy
  // confidence 0.0 = all fell through to stackIndex → skip
  const stackIndexCount = resolved.filter((r) => r.matchType === "stackIndex").length;
  const confidence = 1 - stackIndexCount / resolved.length;

  if (confidence < 0.5) {
    return {
      skipped: true,
      reason: confidence === 0 ? "no_name_matches" : "low_confidence",
      confidence,
      result: null,
    };
  }

  // offset = how many EN lines collapsed into fewer translated lines
  // e.g. EN has 3 lines, DE has 2 → offset = 1 (one word was merged)
  const offset = resolved.length - transLines.length;

  resolved.forEach(({ layer, matchType, enIndex }, i) => {

    // Case A — trans has more lines than layers
    // Translator split a word into more lines than there are layers.
    // Absorb overflow into the last layer by joining remaining lines with a space.
    // e.g. EN: ["YOU", "WIN"] / BG: ["ти", "вече", "спечели"]
    //   YOU → "ти"
    //   WIN → "вече спечели"
    if (resolved.length <= transLines.length) {
      const isLast = i === resolved.length - 1;
      const text = isLast ? transLines.slice(i).join(" ") : transLines[i];
      result.set(layer.id, { text, matchType, enIndex });
      return;
    }

    // Case B — EN has more lines than trans, true tail-anchoring
    // First maps to first, last maps to last, middle gap is untouched.
    // e.g. EN: ["TOTAL", "CREDITS", "WON"] / DE: ["GESAMTGUTHABEN", "GEWONNEN"]
    //   TOTAL   → "GESAMTGUTHABEN"
    //   CREDITS → null (middle gap, untouched)
    //   WON     → "GEWONNEN"
    if (i === 0) {
      result.set(layer.id, { text: transLines[0], matchType, enIndex });
    } else if (i <= offset) {
      result.set(layer.id, null); // middle gap, untouched
    } else {
      result.set(layer.id, { text: transLines[i - offset], matchType, enIndex });
    }
  });

  return { skipped: false, confidence, result };
}

















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


