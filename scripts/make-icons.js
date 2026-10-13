/**
 * Generates the GHOSTED app icon, adaptive icon layers, splash mark and favicon
 * into ./assets. Zero dependencies: shapes are signed-distance fields, encoded
 * as PNG with Node's zlib. Run: `node scripts/make-icons.js`.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [3, 7, 13];
const GLOW = [8, 40, 62];
const MARK_TOP = [194, 244, 255];
const MARK_BOTTOM = [79, 216, 255];

// --- PNG encoding -----------------------------------------------------------
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- The mark: a geometric "G" (open ring + crossbar), in unit space ---------
const R = 0.3; // ring radius
const W = 0.075; // stroke width
const OPEN_FROM = -58; // degrees, y-down: opening in the upper right
const OPEN_TO = 0;

function capsule(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Signed distance (unit space, centred at 0,0, scale = mark size). */
function markDistance(x, y) {
  const angle = (Math.atan2(y, x) * 180) / Math.PI;
  let ring;
  if (angle > OPEN_FROM && angle < OPEN_TO) {
    const end = (deg) => [R * Math.cos((deg * Math.PI) / 180), R * Math.sin((deg * Math.PI) / 180)];
    const [ax, ay] = end(OPEN_FROM);
    const [bx, by] = end(OPEN_TO);
    ring = Math.min(Math.hypot(x - ax, y - ay), Math.hypot(x - bx, y - by)) - W / 2;
  } else {
    ring = Math.abs(Math.hypot(x, y) - R) - W / 2;
  }
  const bar = capsule(x, y, 0.02, 0, R, 0) - W / 2;
  return Math.min(ring, bar);
}

function render(size, { background, scale, mono }) {
  const out = Buffer.alloc(size * size * 4);
  const ss = 3; // supersampling per axis
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let cover = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const ux = ((px + (sx + 0.5) / ss) / size - 0.5) / scale;
          const uy = ((py + (sy + 0.5) / ss) / size - 0.5) / scale;
          if (markDistance(ux, uy) <= 0) cover++;
        }
      }
      const a = cover / (ss * ss);
      const t = py / size;
      const mark = mono
        ? [255, 255, 255]
        : MARK_TOP.map((c, i) => Math.round(c + (MARK_BOTTOM[i] - c) * t));
      const i = (py * size + px) * 4;
      if (background) {
        const d = Math.hypot(px / size - 0.5, py / size - 0.42) / 0.6;
        const g = Math.max(0, 1 - d);
        const bg = BG.map((c, k) => c + (GLOW[k] - c) * g * g);
        for (let k = 0; k < 3; k++) out[i + k] = Math.round(bg[k] * (1 - a) + mark[k] * a);
        out[i + 3] = 255;
      } else {
        for (let k = 0; k < 3; k++) out[i + k] = mark[k];
        out[i + 3] = Math.round(a * 255);
      }
    }
  }
  return png(size, out);
}

const assets = path.join(__dirname, '..', 'assets');
const files = {
  'icon.png': render(1024, { background: true, scale: 0.78 }),
  // Adaptive icon: Android masks to ~66% of the canvas, so keep the mark small.
  'android-icon-foreground.png': render(1024, { background: false, scale: 0.52 }),
  'android-icon-monochrome.png': render(1024, { background: false, scale: 0.52, mono: true }),
  'splash-icon.png': render(512, { background: false, scale: 0.9 }),
  'favicon.png': render(48, { background: true, scale: 0.8 }),
};
for (const [name, data] of Object.entries(files)) {
  fs.writeFileSync(path.join(assets, name), data);
  console.log(`${name} ${(data.length / 1024).toFixed(1)} KB`);
}
