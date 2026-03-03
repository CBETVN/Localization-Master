import { photoshop } from "../globals";
const { app, core,action, constants } = photoshop;
const { executeAsModal } = photoshop.core;
const { batchPlay } = photoshop.action;
import { uxp } from "../globals";


const { parsePsd, extractUuidFromBlock } = require("./psdParser.js");
const { localFileSystem: fs, formats } = require("uxp").storage;
const { entrypoints } = require("uxp");
const { app, core, uxp, action, constants } = require("photoshop");
const { batchPlay } = require("photoshop").action;
// const{uxp} = require("photoshop");
const { executeAsModal } = require("photoshop").core;
const { localFileSystem: fs, formats } = uxp.storage



async function getDataFromSO() {
  try {
    const doc = app.activeDocument;
    if (!doc) { console.error('No active document.'); return; }

    const filePath = doc.path;
    console.log('Scanning file:', filePath);

    const entry = await fs.getEntryWithUrl(toUXPUrl(filePath));
    const t0 = Date.now();
    const buffer = await entry.read({ format: formats.binary });
    console.log(`Buffer size: ${buffer.byteLength} — read in ${Date.now()-t0}ms`);

    const t1 = Date.now();
    const nestedSOMap = buildNestedSOMapFast(buffer);
    console.log(`nestedSOMap: ${Object.keys(nestedSOMap).length} entries — parsed in ${Date.now()-t1}ms`);

    const allLayers = getAllLayers(doc.layers);
    for (const layer of allLayers) {
      if (layer.kind === 'smartObject') {
        const res = await batchPlay([{ _obj: 'get', _target: [{ _ref: 'layer', _id: layer.id }] }], {});
        const uuid = res[0]?.smartObjectMore?.ID;
        const hasNested = uuid ? (nestedSOMap[uuid] ?? false) : false;
        console.log(`"${layer.name}" (id:${layer.id}) - SO - ${hasNested ? 'has nested SO' : 'no nested SO'}`);
      }
    }
  } catch (err) {
    console.error('getDataFromSO error:', err.message, err.stack);
  }
}



function extractPsbFromLiFD(view, bytes, start, end) {
  // Scan FORWARDS for the FIRST '8BPS' signature — that is the start of the PSB.
  // (Scanning backwards would find nested PSBs inside Smart Objects first.)
  for (let i = start; i <= end - 4; i++) {
    if (bytes[i]===0x38 && bytes[i+1]===0x42 && bytes[i+2]===0x50 && bytes[i+3]===0x53) {
      return view.buffer.slice(i, end);
    }
  }
  return null;
}






function bytesHasLnk2(bytes, view, start, end, isPsb) {
  for (let i = start; i < end - 12; i++) {
    // Check for '8BIM' (38 42 49 4D) or '8B64' (38 42 36 34)
    if (bytes[i] !== 0x38 || bytes[i+1] !== 0x42) continue;
    const is8B64 = bytes[i+2] === 0x36 && bytes[i+3] === 0x34;
    const is8BIM = bytes[i+2] === 0x49 && bytes[i+3] === 0x4D;
    if (!is8BIM && !is8B64) continue;
    // Check for 'lnk2' (6C 6E 6B 32), 'lnkD' (6C 6E 6B 44), 'lnk3' (6C 6E 6B 33)
    if (bytes[i+4] !== 0x6C || bytes[i+5] !== 0x6E || bytes[i+6] !== 0x6B) continue;
    const b7 = bytes[i+7];
    if (b7 !== 0x32 && b7 !== 0x44 && b7 !== 0x33) continue;
    const useLarge = is8B64 || isPsb;
    const len = useLarge
      ? view.getUint32(i+8, false) * 0x100000000 + view.getUint32(i+12, false)
      : view.getUint32(i+8, false);
    if (len > 0) return true;
  }
  return false;
}












function buildNestedSOMapFast(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const map = {};
  const isPsb = bytes[4] === 0x00 && bytes[5] === 0x02;

  // Jump through sections to reach Layer and Mask Info
  const colorModeLen = view.getUint32(26, false);
  const imgResOffset = 26 + 4 + colorModeLen;
  const imgResLen = view.getUint32(imgResOffset, false);
  const layerMaskOffset = imgResOffset + 4 + imgResLen;

  const layerMaskLen = isPsb
    ? view.getUint32(layerMaskOffset, false) * 0x100000000 + view.getUint32(layerMaskOffset + 4, false)
    : view.getUint32(layerMaskOffset, false);
  const layerMaskStart = layerMaskOffset + (isPsb ? 8 : 4);
  const layerMaskEnd = layerMaskStart + layerMaskLen;

  // Inside Layer and Mask Info, skip Layer Info block
  // Layer Info length: 8 bytes in PSB, 4 bytes in PSD
  let pos = layerMaskStart;
  const layerInfoLen = isPsb
    ? view.getUint32(pos, false) * 0x100000000 + view.getUint32(pos + 4, false)
    : view.getUint32(pos, false);
  pos += (isPsb ? 8 : 4) + layerInfoLen;
  // Align to 2 bytes
  if (pos % 2 !== 0) pos++;

  // Skip Global Layer Mask Info block (always 4-byte length)
  const globalMaskLen = view.getUint32(pos, false);
  pos += 4 + globalMaskLen;

  // Now we're at Global Additional Layer Info — lnk2 lives here
  const galiStart = pos;
  const galiEnd = Math.min(layerMaskEnd, buffer.byteLength);

  console.log(`Skipped to GALI at offset ${galiStart}, scanning ${galiEnd - galiStart} bytes (${Math.round((galiEnd-galiStart)/buffer.byteLength*100)}% of file)`);

  const tScan = Date.now();
  for (let i = galiStart; i < galiEnd - 12; i++) {
    // '8B' prefix check first (fast reject)
    if (bytes[i] !== 0x38 || bytes[i+1] !== 0x42) continue;
    const is8B64 = bytes[i+2] === 0x36 && bytes[i+3] === 0x34;
    const is8BIM = bytes[i+2] === 0x49 && bytes[i+3] === 0x4D;
    if (!is8BIM && !is8B64) continue;
    // 'lnk' prefix check
    if (bytes[i+4] !== 0x6C || bytes[i+5] !== 0x6E || bytes[i+6] !== 0x6B) continue;
    const b7 = bytes[i+7];
    if (b7 !== 0x32 && b7 !== 0x44 && b7 !== 0x33) continue;

    const useLarge = is8B64 || isPsb;
    const blockLen = useLarge
      ? view.getUint32(i+8, false) * 0x100000000 + view.getUint32(i+12, false)
      : view.getUint32(i+8, false);
    if (blockLen === 0) continue;

    const blockStart = i + (useLarge ? 16 : 12);
    const blockEnd = Math.min(blockStart + blockLen, galiEnd);

    // Scan for liFD signatures directly — robust against padding/alignment quirks
    let nRec = 0;
    for (let j = blockStart; j < blockEnd - 8; j++) {
      // 'liFD' = 6C 69 46 44
      if (bytes[j] !== 0x6c || bytes[j+1] !== 0x69 || bytes[j+2] !== 0x46 || bytes[j+3] !== 0x44) continue;
      nRec++;
      const recLen = view.getUint32(j - 4, false);
      const recStart = j - 4;
      const recEnd = Math.min(recStart + 4 + recLen, blockEnd);
      const uuid = extractUuidFromBlock(buffer, j, recEnd);
      if (uuid && !(uuid in map)) {
        map[uuid] = liFDRecordHasNestedSO(bytes, view, recStart, recEnd);
      }
      j = recEnd - 1; // skip to end of record
    }
    console.log(`nestedSOMapFast: ${nRec} records scanned in ${Date.now()-tScan}ms`);
    i = blockStart + blockLen - 1;
  }
  return map;
}


















function toUXPUrl(nativePath) {
  // Replace backslashes with forward slashes
  const normalized = nativePath.replace(/\\/g, '/');
  // Prefix with 'file:/'
  return 'file:/' + normalized;
}
