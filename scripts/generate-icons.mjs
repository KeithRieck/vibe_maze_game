/**
 * Icon generator — creates favicon.ico and PWA icon PNGs using only
 * Node.js built‑in modules (zlib, buffer, fs).
 *
 * Usage: node scripts/generate-icons.mjs
 */

import { createWriteStream, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';

const PUBLIC_DIR = 'public';
const ICONS_DIR = `${PUBLIC_DIR}/assets/icons`;

// ─── PNG utilities ────────────────────────────────────────────────

/** PNG signature (8 bytes). */
const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** 32‑bit CRC (used by PNG). */
function crc32(buf) {
  // Precompute CRC table once per process
  if (!crc32.table) {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      t[n] = c;
    }
    crc32.table = t;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crc32.table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeB, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeB, data, crcVal]);
}

/** Build the IHDR chunk. */
function ihdrChunk(w, h) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(w, 0);
  data.writeUInt32BE(h, 4);
  data[8] = 8;  // bit depth
  data[9] = 2;  // color type = RGB
  data[10] = 0; // compression
  data[11] = 0; // filter
  data[12] = 0; // interlace
  return pngChunk('IHDR', data);
}

/** Build the IDAT chunk from raw RGBA pixel data (w × h × 4). */
function idatChunk(w, h, rgba) {
  const rawSize = h * (1 + w * 3);
  const raw = Buffer.alloc(rawSize);
  let off = 0;
  for (let y = 0; y < h; y++) {
    raw[off++] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const src = (y * w + x) * 4;
      raw[off++] = rgba[src];
      raw[off++] = rgba[src + 1];
      raw[off++] = rgba[src + 2];
    }
  }
  const compressed = deflateSync(raw, { level: 9 });
  return pngChunk('IDAT', compressed);
}

/** Build complete PNG file buffer. */
function buildPng(w, h, rgba) {
  return Buffer.concat([
    PNG_SIG,
    ihdrChunk(w, h),
    idatChunk(w, h, rgba),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Drawing helpers ───────────────────────────────────────────────

function setPixel(rgba, w, x, y, r, g, b, a = 255) {
  const i = (y * w + x) * 4;
  rgba[i] = r;
  rgba[i + 1] = g;
  rgba[i + 2] = b;
  rgba[i + 3] = a;
}

function fill(rgba, w, h, r, g, b, a = 255) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      setPixel(rgba, w, x, y, r, g, b, a);
    }
  }
}

function fillCircle(rgba, w, h, cx, cy, radius, r, g, b, a = 255) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        setPixel(rgba, w, x, y, r, g, b, a);
      }
    }
  }
}

function drawMazePattern(rgba, w, h, r, g, b, a = 255) {
  const cell = Math.floor(Math.min(w, h) / 7);
  const lineW = Math.max(2, Math.floor(cell * 0.4));

  // Horizontal passages
  for (let row = 1; row < 7; row += 2) {
    const y = row * cell;
    for (let dy = 0; dy < lineW; dy++) {
      if (y + dy < h) {
        for (let x = cell; x < w - cell; x++) {
          setPixel(rgba, w, x, y + dy, r, g, b, a);
        }
      }
    }
  }

  // Vertical connectors
  for (let col = 2; col < 6; col += 2) {
    const x = col * cell;
    for (let dx = 0; dx < lineW; dx++) {
      if (x + dx < w) {
        for (let y = cell; y < h - cell; y++) {
          setPixel(rgba, w, x + dx, y, r, g, b, a);
        }
      }
    }
  }
}

// ─── ICO utilities (embeds a PNG) ──────────────────────────────────

function buildIco(pngBuf) {
  // ICO header: reserved(2) + type=1(2) + count(2)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);  // reserved
  header.writeUInt16LE(1, 2);  // type = ICO
  header.writeUInt16LE(1, 4);  // 1 image

  // Directory entry (16 bytes)
  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0);        // width
  entry.writeUInt8(32, 1);        // height (same for ICO)
  entry.writeUInt8(0, 2);         // palette
  entry.writeUInt8(0, 3);         // reserved
  entry.writeUInt16LE(1, 4);      // planes
  entry.writeUInt16LE(32, 6);     // bpp
  entry.writeUInt32LE(pngBuf.length, 8);  // size
  entry.writeUInt32LE(22, 12);    // offset (6 header + 16 entry)

  return Buffer.concat([header, entry, pngBuf]);
}

// ─── Generate icons ────────────────────────────────────────────────

function makeIcon(size, pattern) {
  const rgba = Buffer.alloc(size * size * 4);
  // Dark background (#1a1a2e)
  fill(rgba, size, size, 26, 26, 46, 255);

  if (pattern) {
    // Green maze path (#00ff88)
    drawMazePattern(rgba, size, size, 0, 255, 136, 255);
  }

  // Green circle overlay
  fillCircle(rgba, size, size, size / 2, size / 2, size * 0.35, 0, 255, 136, 255);

  return buildPng(size, size, rgba);
}

// Ensure directories exist
mkdirSync(ICONS_DIR, { recursive: true });

// Favicon (32×32 embedded in ICO)
const faviconPng = makeIcon(32, false);
const ico = buildIco(faviconPng);
createWriteStream(`${PUBLIC_DIR}/favicon.ico`).end(ico);
console.log(`Created ${PUBLIC_DIR}/favicon.ico (32x32)`);

// PWA icons
for (const size of [192, 512]) {
  const png = makeIcon(size, true);
  createWriteStream(`${ICONS_DIR}/icon-${size}.png`).end(png);
  console.log(`Created ${ICONS_DIR}/icon-${size}.png (${size}x${size})`);
}
