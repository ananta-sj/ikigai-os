export type CompanionDocumentKind = 'pdf' | 'docx' | 'markdown' | 'text';

export interface ExtractedCompanionDocument {
  kind: CompanionDocumentKind;
  text: string;
  truncated: boolean;
}

export const COMPANION_DOCUMENT_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const COMPANION_DOCUMENT_MAX_TEXT_CHARS = 24_000;
export const COMPANION_DOCUMENT_MAX_TOTAL_TEXT_CHARS = 48_000;
export const COMPANION_DOCUMENT_MAX_FILES = 3;

const MAX_INFLATED_STREAM_BYTES = 4 * 1024 * 1024;
const MAX_PDF_STREAMS = 220;
const MAX_PDF_TOTAL_STREAM_BYTES = 12 * 1024 * 1024;
const MAX_PDF_SCAN_BYTES = COMPANION_DOCUMENT_MAX_FILE_BYTES;

function extensionOf(name: string) {
  const match = name.trim().toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match?.[1] ?? '';
}

export function companionDocumentKind(name: string, mimeType = ''): CompanionDocumentKind | null {
  const extension = extensionOf(name);
  const mime = mimeType.toLowerCase().split(';', 1)[0].trim();

  // An explicit filename extension wins over browser-supplied MIME metadata.
  // This keeps legacy/macro Word files (or disguised arbitrary files) from
  // entering a parser merely because the platform reported a generic type.
  if (extension) {
    if (extension === '.pdf') return 'pdf';
    if (extension === '.docx') return 'docx';
    if (extension === '.md' || extension === '.markdown') return 'markdown';
    if (extension === '.txt') return 'text';
    return null;
  }

  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (mime === 'text/markdown') return 'markdown';
  if (mime === 'text/plain') return 'text';
  return null;
}

export function companionDocumentSupportMessage(name: string) {
  const extension = extensionOf(name);
  if (extension === '.doc') return 'Old Word .doc files are not parsed safely in-browser. Save it as .docx, PDF, Markdown, or plain text first.';
  if (extension === '.docm') return 'Macro-enabled Word files are not accepted. Save a clean copy as .docx first.';
  return 'Use PDF, Word .docx, Markdown (.md), or plain text (.txt).';
}

function normalizeExtractedText(input: string) {
  return input
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/[ \u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function boundedText(input: string): { text: string; truncated: boolean } {
  const normalized = normalizeExtractedText(input);
  if (normalized.length <= COMPANION_DOCUMENT_MAX_TEXT_CHARS) return { text: normalized, truncated: false };
  return { text: normalized.slice(0, COMPANION_DOCUMENT_MAX_TEXT_CHARS).trimEnd(), truncated: true };
}

function copyBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function inflate(bytes: Uint8Array, format: 'deflate' | 'deflate-raw', limit = MAX_INFLATED_STREAM_BYTES) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot safely unpack this compressed document. Try Markdown or plain text instead.');
  const source = new Blob([copyBuffer(bytes)]).stream();
  const reader = source.pipeThrough(new DecompressionStream(format)).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
    total += chunk.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error('The compressed document expands beyond Ikigai’s safe local parsing limit.');
    }
    chunks.push(chunk);
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return output;
}

function u16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32(bytes: Uint8Array, offset: number) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function zipEocdOffset(bytes: Uint8Array) {
  const floor = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= floor; offset -= 1) {
    if (u32(bytes, offset) === 0x06054b50) return offset;
  }
  return -1;
}

async function zipEntry(bytes: Uint8Array, wanted: string) {
  const eocd = zipEocdOffset(bytes);
  if (eocd < 0) throw new Error('This Word file does not look like a valid .docx archive.');
  const totalEntries = Math.min(u16(bytes, eocd + 10), 5000);
  const centralOffset = u32(bytes, eocd + 16);
  if (centralOffset >= bytes.length) throw new Error('This Word file has an invalid archive directory.');

  let offset = centralOffset;
  const decoder = new TextDecoder('utf-8');
  for (let index = 0; index < totalEntries && offset + 46 <= bytes.length; index += 1) {
    if (u32(bytes, offset) !== 0x02014b50) break;
    const method = u16(bytes, offset + 10);
    const compressedSize = u32(bytes, offset + 20);
    const uncompressedSize = u32(bytes, offset + 24);
    const nameLength = u16(bytes, offset + 28);
    const extraLength = u16(bytes, offset + 30);
    const commentLength = u16(bytes, offset + 32);
    const localOffset = u32(bytes, offset + 42);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    if (name === wanted) {
      if (uncompressedSize > MAX_INFLATED_STREAM_BYTES) throw new Error('The Word document body is too large to parse safely.');
      if (localOffset + 30 > bytes.length || u32(bytes, localOffset) !== 0x04034b50) throw new Error('The Word document archive entry is malformed.');
      const localNameLength = u16(bytes, localOffset + 26);
      const localExtraLength = u16(bytes, localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const end = start + compressedSize;
      if (start < 0 || end > bytes.length) throw new Error('The Word document archive entry is incomplete.');
      const compressed = bytes.subarray(start, end);
      if (method === 0) return compressed.slice();
      if (method === 8) return inflate(compressed, 'deflate-raw');
      throw new Error('This Word file uses a compression method Ikigai does not support.');
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error('The Word document has no readable document body.');
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, raw: string) => String.fromCodePoint(Number(raw)))
    .replace(/&#x([0-9a-f]+);/gi, (_, raw: string) => String.fromCodePoint(parseInt(raw, 16)));
}

async function extractDocx(bytes: Uint8Array) {
  const body = await zipEntry(bytes, 'word/document.xml');
  const xml = new TextDecoder('utf-8').decode(body);
  const text = decodeXmlEntities(xml
    .replace(/<w:tab\b[^>]*\/>/gi, '\t')
    .replace(/<w:(?:br|cr)\b[^>]*\/>/gi, '\n')
    .replace(/<\/w:(?:p|tr)>/gi, '\n')
    .replace(/<\/w:tc>/gi, '\t')
    .replace(/<[^>]+>/g, ''));
  const bounded = boundedText(text);
  if (bounded.text.length < 12) throw new Error('No readable text was found in this Word document.');
  return bounded;
}

function latin1(bytes: Uint8Array) {
  const chunk = 0x8000;
  let output = '';
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    output += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + chunk)));
  }
  return output;
}

function hexBytes(raw: string) {
  const clean = raw.replace(/\s+/g, '');
  const padded = clean.length % 2 ? `${clean}0` : clean;
  const out = new Uint8Array(padded.length / 2);
  for (let i = 0; i < padded.length; i += 2) out[i / 2] = parseInt(padded.slice(i, i + 2), 16) || 0;
  return out;
}

function decodeUtf16Be(bytes: Uint8Array) {
  let output = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) output += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
  return output;
}

function decodePdfBytes(bytes: Uint8Array) {
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return decodeUtf16Be(bytes.subarray(2));
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    let output = '';
    for (let i = 2; i + 1 < bytes.length; i += 2) output += String.fromCharCode(bytes[i] | (bytes[i + 1] << 8));
    return output;
  }
  let zeroOdd = 0;
  for (let i = 1; i < Math.min(bytes.length, 120); i += 2) if (bytes[i] === 0) zeroOdd += 1;
  if (bytes.length > 4 && zeroOdd >= Math.min(8, Math.floor(bytes.length / 4))) return decodeUtf16Be(bytes);
  return new TextDecoder('windows-1252').decode(bytes);
}

function pdfLiteralBytes(raw: string) {
  const values: number[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i) & 0xff;
    if (code !== 0x5c) { values.push(code); continue; }
    const next = raw[++i];
    if (next === undefined) break;
    if (next === 'n') { values.push(10); continue; }
    if (next === 'r') { values.push(13); continue; }
    if (next === 't') { values.push(9); continue; }
    if (next === 'b') { values.push(8); continue; }
    if (next === 'f') { values.push(12); continue; }
    if (next === '\n') continue;
    if (next === '\r') { if (raw[i + 1] === '\n') i += 1; continue; }
    if (/[0-7]/.test(next)) {
      let octal = next;
      for (let count = 0; count < 2 && /[0-7]/.test(raw[i + 1] ?? ''); count += 1) octal += raw[++i];
      values.push(parseInt(octal, 8) & 0xff);
      continue;
    }
    values.push(next.charCodeAt(0) & 0xff);
  }
  return new Uint8Array(values);
}

function parseLiteral(content: string, start: number): { raw: string; end: number } | null {
  if (content[start] !== '(') return null;
  let depth = 1;
  let escaped = false;
  let raw = '';
  for (let i = start + 1; i < content.length; i += 1) {
    const char = content[i];
    if (escaped) { raw += `\\${char}`; escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (char === '(') { depth += 1; raw += char; continue; }
    if (char === ')') {
      depth -= 1;
      if (depth === 0) return { raw, end: i + 1 };
      raw += char;
      continue;
    }
    raw += char;
  }
  return null;
}

function skipSpace(content: string, offset: number) {
  let cursor = offset;
  while (cursor < content.length && /\s/.test(content[cursor])) cursor += 1;
  return cursor;
}

function decodeCmapDestination(raw: string) {
  const bytes = hexBytes(raw);
  return decodeUtf16Be(bytes).replace(/\u0000/g, '');
}

function extractCMap(streams: string[]) {
  const map = new Map<string, string>();
  for (const stream of streams) {
    if (!/begin(?:bfchar|bfrange)/.test(stream)) continue;
    for (const block of stream.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for (const match of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        const value = decodeCmapDestination(match[2]);
        if (value) map.set(match[1].toUpperCase(), value);
      }
    }
    for (const block of stream.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      for (const match of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        const start = parseInt(match[1], 16);
        const end = parseInt(match[2], 16);
        const destination = parseInt(match[3], 16);
        const width = match[1].length;
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 512) continue;
        for (let value = start; value <= end; value += 1) {
          const sourceHex = value.toString(16).toUpperCase().padStart(width, '0');
          const destHex = (destination + value - start).toString(16).toUpperCase().padStart(match[3].length, '0');
          const decoded = decodeCmapDestination(destHex);
          if (decoded) map.set(sourceHex, decoded);
        }
      }
    }
  }
  return map;
}

function decodePdfHex(raw: string, cmap: Map<string, string>) {
  const clean = raw.replace(/\s+/g, '').toUpperCase();
  if (cmap.size) {
    const widths = [...new Set([...cmap.keys()].map(key => key.length))].sort((a, b) => b - a);
    let cursor = 0;
    let mapped = '';
    let hits = 0;
    while (cursor < clean.length) {
      let found = false;
      for (const width of widths) {
        const token = clean.slice(cursor, cursor + width);
        const value = cmap.get(token);
        if (!value) continue;
        mapped += value;
        cursor += width;
        hits += 1;
        found = true;
        break;
      }
      if (!found) { cursor += 2; mapped += ' '; }
    }
    if (hits) return mapped;
  }
  return decodePdfBytes(hexBytes(clean));
}

function extractPdfContentText(content: string, cmap: Map<string, string>) {
  const pieces: string[] = [];
  const add = (value: string) => {
    const clean = normalizeExtractedText(value);
    if (clean) pieces.push(clean);
  };

  for (const textBlock of content.matchAll(/BT([\s\S]*?)ET/g)) {
    const block = textBlock[1];
    let cursor = 0;
    while (cursor < block.length) {
      const char = block[cursor];
      if (char === '(') {
        const parsed = parseLiteral(block, cursor);
        if (!parsed) { cursor += 1; continue; }
        const operatorAt = skipSpace(block, parsed.end);
        const operator = block.slice(operatorAt, operatorAt + 2);
        if (operator.startsWith('Tj') || block[operatorAt] === "'" || block[operatorAt] === '"') add(decodePdfBytes(pdfLiteralBytes(parsed.raw)));
        cursor = parsed.end;
        continue;
      }
      if (char === '<' && block[cursor + 1] !== '<') {
        const end = block.indexOf('>', cursor + 1);
        if (end > cursor) {
          const operatorAt = skipSpace(block, end + 1);
          if (block.slice(operatorAt, operatorAt + 2).startsWith('Tj') || block[operatorAt] === "'" || block[operatorAt] === '"') add(decodePdfHex(block.slice(cursor + 1, end), cmap));
          cursor = end + 1;
          continue;
        }
      }
      if (char === '[') {
        const end = block.indexOf(']', cursor + 1);
        if (end > cursor) {
          const operatorAt = skipSpace(block, end + 1);
          if (block.slice(operatorAt, operatorAt + 2) === 'TJ') {
            const segment = block.slice(cursor + 1, end);
            let inner = 0;
            const values: string[] = [];
            while (inner < segment.length) {
              if (segment[inner] === '(') {
                const parsed = parseLiteral(segment, inner);
                if (!parsed) { inner += 1; continue; }
                values.push(decodePdfBytes(pdfLiteralBytes(parsed.raw)));
                inner = parsed.end;
                continue;
              }
              if (segment[inner] === '<' && segment[inner + 1] !== '<') {
                const hexEnd = segment.indexOf('>', inner + 1);
                if (hexEnd > inner) { values.push(decodePdfHex(segment.slice(inner + 1, hexEnd), cmap)); inner = hexEnd + 1; continue; }
              }
              inner += 1;
            }
            add(values.join(''));
          }
          cursor = end + 1;
          continue;
        }
      }
      cursor += 1;
    }
  }
  return pieces.join('\n');
}

async function pdfStreams(bytes: Uint8Array) {
  const binary = latin1(bytes);
  const streams: Array<{ text: string; contentCandidate: boolean }> = [];
  let cursor = 0;
  let count = 0;
  let totalDecoded = 0;
  while (count < MAX_PDF_STREAMS && totalDecoded < MAX_PDF_TOTAL_STREAM_BYTES) {
    const streamIndex = binary.indexOf('stream', cursor);
    if (streamIndex < 0) break;
    const afterKeyword = streamIndex + 6;
    let dataStart = afterKeyword;
    if (binary.slice(dataStart, dataStart + 2) === '\r\n') dataStart += 2;
    else if (binary[dataStart] === '\n' || binary[dataStart] === '\r') dataStart += 1;
    else { cursor = afterKeyword; continue; }
    const endIndex = binary.indexOf('endstream', dataStart);
    if (endIndex < 0) break;
    let dataEnd = endIndex;
    if (binary[dataEnd - 1] === '\n') dataEnd -= 1;
    if (binary[dataEnd - 1] === '\r') dataEnd -= 1;
    const dictStart = Math.max(binary.lastIndexOf('<<', streamIndex), streamIndex - 6000);
    const dictionary = binary.slice(dictStart >= 0 ? dictStart : Math.max(0, streamIndex - 1200), streamIndex);
    const raw = bytes.subarray(dataStart, dataEnd);
    cursor = endIndex + 9;
    count += 1;
    if (/\/Subtype\s*\/Image\b/.test(dictionary) || raw.byteLength > MAX_INFLATED_STREAM_BYTES) continue;
    try {
      let decoded = raw.slice();
      if (/\/FlateDecode\b/.test(dictionary)) decoded = await inflate(raw, 'deflate');
      else if (/\/Filter\b/.test(dictionary)) continue;
      totalDecoded += decoded.byteLength;
      if (totalDecoded > MAX_PDF_TOTAL_STREAM_BYTES) break;
      const text = latin1(decoded);
      if (/\bBT\b/.test(text) || /begin(?:bfchar|bfrange|cmap)/.test(text)) streams.push({ text, contentCandidate: /\bBT\b/.test(text) });
    } catch {
      // A malformed or unsupported stream should not make the whole document unsafe.
    }
  }
  return streams;
}

async function extractPdf(bytes: Uint8Array) {
  if (bytes.length > MAX_PDF_SCAN_BYTES) throw new Error('This PDF is larger than Ikigai’s local parsing limit.');
  const header = latin1(bytes.subarray(0, Math.min(bytes.length, 12)));
  if (!header.startsWith('%PDF-')) throw new Error('This file does not look like a valid PDF.');
  const binary = latin1(bytes);
  if (/\/Encrypt\b/.test(binary)) throw new Error('Encrypted or password-protected PDFs are not read by the Familiar. Export an unlocked copy first.');

  const streams = await pdfStreams(bytes);
  const cmap = extractCMap(streams.map(item => item.text));
  const content = streams.filter(item => item.contentCandidate).map(item => extractPdfContentText(item.text, cmap)).filter(Boolean).join('\n');
  const fallback = content || extractPdfContentText(binary, cmap);
  const bounded = boundedText(fallback);
  if (bounded.text.length < 12) throw new Error('No readable text was found in this PDF. If it is a scan or image-only PDF, export an OCR/text version first.');
  return bounded;
}

export async function extractCompanionDocument(bytes: Uint8Array, name: string, mimeType = ''): Promise<ExtractedCompanionDocument> {
  if (!bytes.byteLength) throw new Error('The selected document is empty.');
  if (bytes.byteLength > COMPANION_DOCUMENT_MAX_FILE_BYTES) throw new Error('Keep each attached document under 8 MB.');
  const kind = companionDocumentKind(name, mimeType);
  if (!kind) throw new Error(companionDocumentSupportMessage(name));

  if (kind === 'markdown' || kind === 'text') {
    const bounded = boundedText(new TextDecoder('utf-8').decode(bytes));
    if (bounded.text.length < 1) throw new Error('No readable text was found in this document.');
    return { kind, ...bounded };
  }
  if (kind === 'docx') return { kind, ...(await extractDocx(bytes)) };
  return { kind, ...(await extractPdf(bytes)) };
}
