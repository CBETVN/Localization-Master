import { asModal as executeAsModal } from "./utils/photoshop-utils.js";

// Import XLSX - it's a UMD library that may attach to global scope
import "../lib/xlsx.full.min.js";
import { uxp } from "../globals";
import { photoshop } from "../globals";
import * as ps from "./photoshop.js"; // Import all Photoshop API functions as ps
// import {app} from "../globals"; // Import app for showing alerts, etc.
// Access XLSX from global scope
const XLSX = window.XLSX;

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
function extractLanguageData(workbook) {
  // Get the first worksheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to array of arrays (first row becomes headers)
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  const languageData = {};
  const availableLanguages = [];
  
  if (jsonData.length > 0) {
    // First row contains language keys (ENG, BG, DE, etc.)
    const languages = jsonData[0];
    
    // Columns to ignore (not language data) - case insensitive
    const ignoredColumns = ["screen preview"];
    
    // Store available languages (filter out empty cells and ignored columns)
    languages.forEach(lang => {
      if (lang && lang.trim() && !ignoredColumns.includes(lang.trim().toLowerCase())) {
        availableLanguages.push(lang);
        languageData[lang] = [];
      }
    });
    
    // Process remaining rows (translation data for each language)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      row.forEach((cell, columnIndex) => {
        const language = languages[columnIndex];
        if (language && cell && typeof cell === 'string' && !ignoredColumns.includes(language.trim().toLowerCase())) {
          languageData[language].push(cell);
        }
      });
    }
  }
  
  return { languageData, availableLanguages };
}

//parse a phrase into lines and ignore lines with () or [] (like [NUMBER])
export function parseForTranslation(text) {
  return text
    .split('\n') // Split into lines
    .map(line => line.trim()) // Remove extra spaces
    .filter(line => line && !line.includes('(') && !line.includes('[')); // Ignore lines with () or []
}


// Checks if a layer name matches any line in the EN phrases array from appState.languageData
export function isLayerNameInEN(layerName, appState) {
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






// Translates all visible group layers whose names match EN entries, in a modal scope
export async function translateAll(appState) {
  // Validate required state
  if (!appState.selectedLanguage) {
    photoshop.app.showAlert("Please select a language first");
    return;
  }
  if (!appState.languageData || !appState.languageData["EN"]) {
    photoshop.app.showAlert("No English language data loaded.");
    return;
  }

  await executeAsModal("Translate All Layers", async () => {
    const allLayers = ps.getAllLayers(photoshop.app.activeDocument.layers);
    for (const layer of allLayers) {
      // Only process visible group layers
      if (ps.isLayerAGroup(layer) && layer.visible === true) {
        if (isLayerNameInEN(layer.name, appState)) {
          console.log(`Layer: ${layer.name} is in EN list and will be translated`);
          // Example action: hide the layer (replace with translation logic)
          layer.visible = false;
        }
      }
    }
  });
}