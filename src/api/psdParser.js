class PsdReader {
  constructor(buffer) {
    this.view = new DataView(buffer instanceof ArrayBuffer ? buffer : buffer.buffer);
    this.pos = 0;
    this.isPsb = false;
  }
  readUint8()  { return this.view.getUint8(this.pos++); }
  readUint16() { const v = this.view.getUint16(this.pos, false); this.pos += 2; return v; }
  readUint32() { const v = this.view.getUint32(this.pos, false); this.pos += 4; return v; }
  readInt16()  { const v = this.view.getInt16(this.pos, false);  this.pos += 2; return v; }
  readInt32()  { const v = this.view.getInt32(this.pos, false);  this.pos += 4; return v; }
  readUint64() { const hi = this.readUint32(); const lo = this.readUint32(); return hi * 0x100000000 + lo; }
  readLen()    { return this.isPsb ? this.readUint64() : this.readUint32(); }
  readBytes(n) { const b = new Uint8Array(this.view.buffer, this.pos, n); this.pos += n; return b; }
  readString(n) { return String.fromCharCode(...this.readBytes(n)); }
  readPascalString(padTo) {
    const len = this.readUint8();
    const str = this.readString(len);
    const total = 1 + len;
    this.pos += (padTo - (total % padTo)) % padTo;
    return str;
  }
  skip(n) { this.pos += n; }
  get size() { return this.view.byteLength; }
}

const PSB_LARGE_KEYS = new Set(['LMsk','Lr16','Lr32','Layr','Mt16','Mt32','Mtrn','Alph','FMsk','lnk2','FEid','FXid','PxSD']);

function parsePsd(buffer) {
  const r = new PsdReader(buffer);
  const results = { isValid: false, isPsb: false, layers: [] };
  if (r.readString(4) !== '8BPS') return results;
  results.isValid = true;
  const version = r.readUint16();
  results.isPsb = r.isPsb = (version === 2);
  r.skip(6);
  r.skip(2);
  r.skip(4);
  r.skip(4);
  r.skip(2);
  r.skip(2);
  r.skip(r.readUint32()); // color mode data
  r.skip(r.readUint32()); // image resources

  const layerMaskLen = r.readLen();
  const layerMaskEnd = r.pos + layerMaskLen;
  if (layerMaskLen > 0) parseLayerSection(r, results, layerMaskEnd);

  // Also check globalALI — it may contain the real layers including SOs
  try {
    if (r.pos < layerMaskEnd - 4) {
      const globalMaskLen = r.readUint32();
      r.skip(globalMaskLen);
      parseGlobalAdditionalLayerInfo(r, results, r.pos, layerMaskEnd);
    }
  } catch(e) { /* ignore */ }

  return results;
}

function parseGlobalAdditionalLayerInfo(r, results, startPos, endPos) {
  r.pos = startPos;
  const end = endPos || r.size;
  while (r.pos < end - 8) {
    // Skip null padding bytes between entries
    while (r.pos < end && new DataView(r.view.buffer).getUint8(r.pos) === 0) r.pos++;
    if (r.pos >= end - 8) break;
    const sig = r.readString(4);
    if (sig !== '8BIM' && sig !== '8B64') { r.pos -= 4; break; }
    const key = r.readString(4);
    let len = (r.isPsb && PSB_LARGE_KEYS.has(key)) ? r.readUint64() : r.readUint32();
    if (len % 2 !== 0) len++;
    const blockEnd = r.pos + len;
    if (blockEnd > end) break;

    if (key === 'Layr' || key === 'Lr16' || key === 'Lr32') {
      const savedLayers = results.layers;
      results.layers = [];
      const layerCount = Math.abs(r.readInt16());
      for (let i = 0; i < layerCount; i++) {
        try {
          const { layer } = parseLayerRecord(r);
          results.layers.push(layer);
        } catch(e) { break; }
      }
      // Only use globalALI layers if they add SO flags the original missed
      const newHasSO = results.layers.some(l => l.isSmartObject);
      const oldHasSO = savedLayers.some(l => l.isSmartObject);
      if (!(newHasSO && !oldHasSO)) results.layers = savedLayers;
      r.pos = blockEnd;
      return;
    }

    r.pos = blockEnd;
  }
}

function parseLayerSection(r, results, sectionEnd) {
  let layerInfoLen = r.readLen();
  if (layerInfoLen % 2 !== 0) layerInfoLen++;
  const layerInfoEnd = r.pos + layerInfoLen;
  if (layerInfoLen === 0) return;

  const layerCount = Math.abs(r.readInt16());
  const channelDataLens = [];

  for (let i = 0; i < layerCount; i++) {
    try {
      const { layer, channelLens } = parseLayerRecord(r);
      results.layers.push(layer);
      channelDataLens.push(channelLens);
    } catch(e) {
      break;
    }
  }

  for (let i = 0; i < channelDataLens.length; i++) {
    for (const len of channelDataLens[i]) r.pos += len;
  }

  r.pos = layerInfoEnd;
}

function parseLayerRecord(r) {
  const layer = { name: '', id: null, isSmartObject: false, uuid: null, embeddedBlob: null, additionalInfo: [] };

  r.skip(16); // bounds

  const channelCount = r.readUint16();
  const channelLens = [];
  for (let c = 0; c < channelCount; c++) {
    r.skip(2);
    channelLens.push(r.readLen());
  }

  r.skip(4); // blend sig
  r.skip(4); // blend mode
  r.skip(1); // opacity
  r.skip(1); // clipping
  r.skip(1); // flags
  r.skip(1); // filler

  const extraLen = r.readUint32();
  const extraEnd = r.pos + extraLen;

  r.skip(r.readUint32()); // mask
  r.skip(r.readUint32()); // blend ranges

  layer.name = r.readPascalString(4);

  while (r.pos < extraEnd - 3) {
    if (!parseAdditionalLayerInfo(r, layer, extraEnd)) break;
  }

  r.pos = extraEnd;
  return { layer, channelCount, channelLens };
}

function parseAdditionalLayerInfo(r, layer, limit) {
  if (r.pos + 8 > Math.min(limit, r.size)) return false;
  const sig = r.readString(4);
  if (sig !== '8BIM' && sig !== '8B64') { r.pos -= 4; return false; }

  const key = r.readString(4);
  let len = (r.isPsb && PSB_LARGE_KEYS.has(key)) ? r.readUint64() : r.readUint32();
  if (len % 2 !== 0) len++;
  const blockEnd = r.pos + len;

  if (blockEnd > r.size) { r.pos -= 8; return false; }

  if (key === 'SoLd' || key === 'PlLd') {
    layer.isSmartObject = true;
    layer.uuid = extractUuidFromBlock(r.view.buffer, r.pos, blockEnd);
  } else if (key === 'SoLE') {
    layer.isSmartObject = true;
    layer.embeddedBlob = r.view.buffer.slice(r.pos, blockEnd);
  } else if (key === 'lyid') {
    layer.id = r.readUint32();
  } else if (key === 'luni') {
    const count = r.readUint32();
    let name = '';
    for (let i = 0; i < count; i++) { name += String.fromCharCode(r.view.getUint16(r.pos, false)); r.pos += 2; }
    layer.name = name;
  }

  layer.additionalInfo.push(key);
  r.pos = blockEnd;
  return true;
}

/**
 * Scans raw bytes between start and end for a UUID pattern.
 * Tries both ASCII and UTF-16BE encodings.
 */
function extractUuidFromBlock(buffer, start, end) {
  const bytes = new Uint8Array(buffer);
  const clampedEnd = Math.min(end, bytes.length);

  function isHex(c) {
    return (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x46) || (c >= 0x61 && c <= 0x66);
  }

  // Try ASCII (36 bytes)
  for (let i = start; i <= clampedEnd - 36; i++) {
    if (bytes[i+8] !== 0x2D || bytes[i+13] !== 0x2D ||
        bytes[i+18] !== 0x2D || bytes[i+23] !== 0x2D) continue;
    let valid = true;
    for (let j = 0; j < 36 && valid; j++) {
      if (j === 8 || j === 13 || j === 18 || j === 23) continue;
      valid = isHex(bytes[i + j]);
    }
    if (valid) return String.fromCharCode(...bytes.slice(i, i + 36));
  }

  // Try UTF-16BE (72 bytes, high byte 0x00)
  for (let i = start; i <= clampedEnd - 72; i++) {
    if (bytes[i+16] !== 0x00 || bytes[i+17] !== 0x2D) continue;
    if (bytes[i+26] !== 0x00 || bytes[i+27] !== 0x2D) continue;
    if (bytes[i+36] !== 0x00 || bytes[i+37] !== 0x2D) continue;
    if (bytes[i+46] !== 0x00 || bytes[i+47] !== 0x2D) continue;
    let valid = true;
    let uuid = '';
    for (let j = 0; j < 36 && valid; j++) {
      const high = bytes[i + j * 2];
      const low  = bytes[i + j * 2 + 1];
      if (j === 8 || j === 13 || j === 18 || j === 23) {
        valid = (high === 0x00 && low === 0x2D);
        uuid += '-';
      } else {
        valid = (high === 0x00 && isHex(low));
        uuid += String.fromCharCode(low);
      }
    }
    if (valid) return uuid;
  }

  return null;
}

module.exports = { parsePsd, extractUuidFromBlock };
