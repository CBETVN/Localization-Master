import * as XLSX from "../../lib/xlsx.full.min.js";

/**
 * Parse Excel file and extract language data
 * @param {File} file - The Excel file to parse
 * @returns {Object} - { languageData, availableLanguages }
 */
export async function parseExcelFile(file) {
  // TODO: Read file as array buffer
  // TODO: Parse with XLSX
  // TODO: Extract first row as language headers
  // TODO: Extract subsequent rows as translation data
  // TODO: Return structured data
}

/**
 * Extract language data from workbook
 * @param {Object} workbook - XLSX workbook object
 * @returns {Object} - { languageData, availableLanguages }
 */
function extractLanguageData(workbook) {
  // TODO: Get first sheet
  // TODO: Convert to array of arrays
  // TODO: First row = languages
  // TODO: Build languageData object { "ENG": [...], "BG": [...] }
  // TODO: Return both languageData and availableLanguages array
}
