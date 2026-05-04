import "../lib/xlsx.full.min.js";
import { uxp } from "../globals";
const XLSX = window.XLSX




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



