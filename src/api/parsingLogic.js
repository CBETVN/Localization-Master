// Import XLSX - it's a UMD library that may attach to global scope
import "../lib/xlsx.full.min.js";
import { uxp } from "../globals";

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
