// main.ts — make.fun entry for news-image-20261124
// Deterministic editorial news poster. Node standard library only, no deps.
// Writes <MAKEFUN_OUTPUT_DIR>/entry.png (default /output/entry.png).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const C = {
  paper:  [246, 243, 235],
  white:  [255, 255, 255],
  ink:    [22, 28, 34],
  soft:   [58, 66, 74],
  muted:  [104, 108, 112],
  rule:   [203, 199, 186],
  red:    [186, 43, 38],
  blue:   [26, 76, 124],
  green:  [32, 112, 84],
  gold:   [190, 142, 38],
  globe:  [220, 230, 236],
  grid:   [236, 233, 224],
};

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Uppercase ASCII plus the punctuation this poster needs.
// ---------------------------------------------------------------------------
const GLYPHS = {
  'A': '.###./#...#/#...#/#####/#...#/#...#/#...#',
  'B': '####./#...#/#...#/####./#...#/#...#/####.',
  'C': '.####/#..../#..../#..../#..../#..../.####',
  'D': '####./#...#/#...#/#...#/#...#/#...#/####.',
  'E': '#####/#..../#..../####./#..../#..../#####',
  'F': '#####/#..../#..../####./#..../#..../#....',
  'G': '.####/#..../#..../#..##/#...#/#...#/.####',
  'H': '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  'I': '#####/..#../..#../..#../..#../..#../#####',
  'J': '..###/...#./...#./...#./...#./#..#./.##..',
  'K': '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  'L': '#..../#..../#..../#..../#..../#..../#####',
  'M': '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
  'N': '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
  'O': '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  'P': '####./#...#/#...#/####./#..../#..../#....',
  'Q': '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
  'R': '####./#...#/#...#/####./#.#../#..#./#...#',
  'S': '.####/#..../#..../.###./....#/....#/####.',
  'T': '#####/..#../..#../..#../..#../..#../..#..',
  'U': '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  'V': '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  'W': '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
  'X': '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  'Y': '#...#/#...#/.#.#./..#../..#../..#../..#..',
  'Z': '#####/....#/...#./..#../.#.../#..../#####',
  '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
  '1': '..#../.##../..#../..#../..#../..#../.###.',
  '2': '.###./#...#/....#/...#./..#../.#.../#####',
  '3': '####./....#/....#/.###./....#/....#/####.',
  '4': '...#./..##./.#.#./#..#./#####/...#./...#.',
  '5': '#####/#..../#..../####./....#/....#/####.',
  '6': '.###./#..../#..../####./#...#/#...#/.###.',
  '7': '#####/....#/...#./..#../.#.../.#.../.#...',
  '8': '.###./#...#/#...#/.###./#...#/#...#/.###.',
  '9': '.###./#...#/#...#/.####/....#/....#/.###.',
  ' ': '...../...../...../...../...../...../.....',
  '.': '...../...../...../...../...../.##../.##..',
  ',': '...../...../...../...../.##../.##../.#...',
  '/': '....#/....#/...#./..#../.#.../#..../#....',
  ':': '...../.##../.##../...../.##../.##../.....',
  '-': '...../...../...../#####/...../...../.....',
  '+': '...../..#../..#../#####/..#../..#../.....',
  '%': '##..#/##..#/...#./..#../.#.../#..##/#..##',
  '$': '..#../.####/#.#../.###./..#.#/####./..#..',
  '&': '.##../#..#./#.#../.#.../#.#.#/#..#./.##.#',
  '(': '...#./..#../.#.../.#.../.#.../..#../...#.',
  ')': '.#.../..#../...#./...#./...#./..#../.#...',
  "'": '..#../..#../...../...../...../...../.....',
  '!': '..#../..#../..#../..#../..#../...../..#..',
  '?': '.###./#...#/....#/...#./..#../...../..#..',
};
const FONT = {};
for (const k of Object.keys(GLYPHS)) FONT[k] = GLYPHS[k].split('/');

function adv(scale) {
  return scale >= 3 ? 5 * scale + 2 : 6 * scale;
}
function textWidth(s, scale) {
  if (!s.length) return 0;
  return (s.length - 1) * adv(scale) + 5 * scale;
}

// ---------------------------------------------------------------------------
// Raster primitives
// ---------------------------------------------------------------------------
function setPixel(x, y, col) {
  x |= 0;
  y |= 0;
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = col[0];
  px[i + 1] = col[1];
  px[i + 2] = col[2];
}
function fill(col) {
  for (let i = 0; i < px.length; i += 3) {
    px[i] = col[0];
    px[i + 1] = col[1];
    px[i + 2] = col[2];
  }
}
function rect(x, y, w, h, col) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, col);
  }
}
function frame(x, y, w, h, col, t) {
  t = t || 1;
  rect(x, y, w, t, col);
  rect(x, y + h - t, w, t, col);
  rect(x, y, t, h, col);
  rect(x + w - t, y, t, h, col);
}
function hline(x, y, len, col, t) {
  rect(x, y, len, t || 1, col);
}
function vline(x, y, len, col, t) {
  rect(x, y, t || 1, len, col);
}
function line(x0, y0, x1, y1, col, t) {
  t = t || 1;
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    rect(x0, y0, t, t, col);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}
function disc(cx, cy, r, col, filled) {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) {
        if (filled !== false) setPixel(cx + x, cy + y, col);
        else if (x * x + y * y >= (r - 2) * (r - 2)) setPixel(cx + x, cy + y, col);
      }
    }
  }
}
function ellipse(cx, cy, rx, ry, col, t) {
  t = t || 1;
  for (let a = 0; a < 360; a++) {
    const r = a * Math.PI / 180;
    setPixel(Math.round(cx + rx * Math.cos(r)), Math.round(cy + ry * Math.sin(r)), col);
    if (t > 1) setPixel(Math.round(cx + rx * Math.cos(r)) + 1, Math.round(cy + ry * Math.sin(r)), col);
  }
}
function text(s, x, y, scale, col, bold) {
  s = String(s).toUpperCase();
  for (let i = 0; i < s.length; i++) {
    const g = FONT[s[i]] || FONT[' '];
    const ox = Math.round(x + i * adv(scale));
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 5; c++) {
        if (g[r][c] === '#') {
          rect(ox + c * scale, y + r * scale, scale, scale, col);
          if (bold && scale >= 2) rect(ox + c * scale + 1, y + r * scale, scale, scale, col);
        }
      }
    }
  }
}

// Small region icons; all built from primitives so no assets are needed.
function icon(kind, cx, cy, col) {
  switch (kind) {
    case 'ship':
      hline(cx - 11, cy + 8, 22, col, 2);
      hline(cx - 8, cy + 12, 16, col, 2);
      line(cx - 9, cy + 4, cx + 9, cy + 4, col, 2);
      line(cx - 6, cy + 4, cx - 9, cy - 3, col, 2);
      line(cx - 9, cy - 3, cx + 7, cy - 3, col, 2);
      line(cx + 7, cy - 3, cx + 9, cy + 4, col, 2);
      break;
    case 'radar':
      disc(cx, cy, 11, col, false);
      disc(cx, cy, 6, col, false);
      hline(cx - 12, cy, 24, col);
      vline(cx, cy - 12, 24, col);
      disc(cx, cy, 3, col, true);
      break;
    case 'globe':
      disc(cx, cy, 11, col, false);
      ellipse(cx, cy, 5, 11, col, 1);
      hline(cx - 11, cy, 22, col);
      break;
    case 'alert':
      line(cx, cy - 12, cx - 12, cy + 10, col, 2);
      line(cx - 12, cy + 10, cx + 12, cy + 10, col, 2);
      line(cx + 12, cy + 10, cx, cy - 12, col, 2);
      rect(cx - 1, cy - 5, 2, 9, col);
      rect(cx - 1, cy + 7, 2, 2, col);
      break;
    case 'mountain':
      line(cx - 13, cy + 9, cx - 3, cy - 9, col, 2);
      line(cx - 3, cy - 9, cx + 5, cy + 9, col, 2);
      line(cx - 1, cy + 9, cx + 7, cy - 4, col, 2);
      line(cx + 7, cy - 4, cx + 14, cy + 9, col, 2);
      hline(cx - 14, cy + 10, 28, col, 2);
      break;
    case 'plane':
      line(cx - 13, cy + 8, cx + 12, cy - 8, col, 2);
      line(cx + 12, cy - 8, cx + 6, cy - 7, col, 2);
      line(cx + 12, cy - 8, cx + 11, cy - 2, col, 2);
      line(cx - 13, cy + 8, cx - 7, cy + 7, col, 2);
      line(cx - 13, cy + 8, cx - 12, cy + 2, col, 2);
      break;
    case 'chip':
      frame(cx - 9, cy - 9, 18, 18, col, 2);
      frame(cx - 4, cy - 4, 8, 8, col, 1);
      for (let i = -6; i <= 6; i += 6) {
        hline(cx - 13, cy + i, 4, col, 2);
        hline(cx + 9, cy + i, 4, col, 2);
        vline(cx + i, cy - 13, 4, col, 2);
        vline(cx + i, cy + 9, 4, col, 2);
      }
      break;
    case 'chart':
      rect(cx - 12, cy + 6, 6, 6, col);
      rect(cx - 3, cy, 6, 12, col);
      rect(cx + 6, cy - 8, 6, 20, col);
      break;
  }
}

// ---------------------------------------------------------------------------
// Poster composition
// ---------------------------------------------------------------------------
function masthead() {
  rect(0, 0, W, 118, C.ink);
  rect(0, 118, W, 6, C.red);
  text('WORLD NEWS', 36, 22, 5, C.white, true);
  text('TUESDAY 24 NOVEMBER 2026', 38, 78, 2, C.gold);
  text('THE DAILY BRIEF', 704, 30, 2, C.white, true);
  text('EIGHT STORIES', 704, 60, 2, C.gold);
  text('VERIFIED REPORTS', 704, 84, 2, C.gold);
  vline(680, 26, 64, C.soft, 2);
}

function leadingStory() {
  const x = 32, y = 140, w = 616, h = 208;
  rect(x, y, w, h, C.white);
  frame(x, y, w, h, C.rule);
  rect(x, y, w, 6, C.red);
  text('MARKETS  /  UNITED STATES', x + 16, y + 18, 2, C.red, true);
  text('HUANG REINSTATED', x + 16, y + 44, 3, C.ink, true);
  text('AS NVIDIA CEO', x + 16, y + 70, 3, C.ink, true);
  text('Unanimous board vote after', x + 16, y + 106, 2, C.soft);
  text('Trump pressed the board.', x + 16, y + 126, 2, C.soft);
  text('Shares +31%; S&P 500 +4.73%.', x + 16, y + 146, 2, C.soft);
  hline(x + 16, y + 172, w - 32, C.rule);

  // Rising-market sparkline, symbolic rather than a plotted series.
  const gx = 470, gy = 300;
  hline(gx, gy, 150, C.rule, 2);
  vline(gx, gy - 90, 90, C.rule, 2);
  line(gx + 4, gy - 6, gx + 30, gy - 22, C.blue, 3);
  line(gx + 30, gy - 22, gx + 56, gy - 16, C.blue, 3);
  line(gx + 56, gy - 16, gx + 82, gy - 50, C.blue, 3);
  line(gx + 82, gy - 50, gx + 108, gy - 44, C.blue, 3);
  line(gx + 108, gy - 44, gx + 142, gy - 82, C.blue, 3);
  text('NVDA +31%', gx + 2, gy - 100, 2, C.red, true);
  text('S&P +4.73%', gx + 60, gy - 66, 1, C.blue);

  text('SOURCE: BOARD STATEMENT / MARKET CLOSE', x + 16, y + 180, 1, C.muted);
  icon('chart', x + w - 40, y + h - 34, C.gold);
}

function globePanel() {
  const x = 664, y = 140, w = 328, h = 208;
  rect(x, y, w, h, C.globe);
  frame(x, y, w, h, C.rule);
  text('THE WORLD TODAY', x + 16, y + 12, 2, C.ink, true);

  const cx = 828, cy = 244, r = 70;
  disc(cx, cy, r, C.white, true);
  disc(cx, cy, r, C.ink, false);
  ellipse(cx, cy, r * 0.46, r, C.rule);
  ellipse(cx, cy, r, r * 0.36, C.rule);
  hline(cx - r, cy, r * 2, C.rule);
  vline(cx, cy - r, r * 2, C.rule);

  // One pin per region touched by today's eight stories.
  const pins = [
    ['US',  215, -12, -10],
    ['EU',  280,  -8, -12],
    ['ME',  330,   8,  -8],
    ['SA',   20,   8,  -8],
    ['SEA', 100,  -8,   6],
    ['AF',  160, -18,  -8],
  ];
  for (const pin of pins) {
    const label = pin[0];
    const a = pin[1] * Math.PI / 180;
    const d = r * 0.72;
    const pxc = Math.round(cx + d * Math.cos(a));
    const pyc = Math.round(cy + d * Math.sin(a));
    disc(pxc, pyc, 4, C.red, true);
    disc(pxc, pyc, 2, C.white, true);
    text(label, pxc + pin[2], pyc + pin[3], 1, C.ink, true);
  }

  text('REGIONS IN THIS EDITION', x + 16, y + h - 17, 1, C.muted);
  const right = '8 STORIES / 6 PINS';
  text(right, x + w - 16 - textWidth(right, 1), y + h - 17, 1, C.muted);
}

function storyCard(x, y, w, h, num, col, iconKind, kicker, h1, h2, d1, d2, d3, source) {
  rect(x, y, w, h, C.white);
  frame(x, y, w, h, C.rule);
  rect(x, y, w, 6, col);
  rect(x, y + 6, 5, h - 6, col);
  text(kicker, x + 16, y + 18, 2, col, true);
  text(h1, x + 16, y + 44, 3, C.ink, true);
  text(h2, x + 16, y + 70, 3, C.ink, true);
  text(d1, x + 16, y + 106, 2, C.soft);
  text(d2, x + 16, y + 126, 2, C.soft);
  text(d3, x + 16, y + 146, 2, C.soft);
  hline(x + 16, y + 170, w - 32, C.rule);
  text(source, x + 16, y + 178, 1, C.muted);
  icon(iconKind, x + w - 42, y + h - 40, col);
  text(num, x + 16, y + h - 30, 2, col, true);
}

function newsGrid() {
  const y1 = 364, y2 = 616, w = 304, h = 236;
  const xs = [32, 360, 688];

  storyCard(xs[0], y1, w, h, '01', C.blue, 'ship',
    'UKRAINE  /  BLACK SEA',
    '7 DRONES SINK', 'CORVETTE MERKURY',
    'Angara hit off Libya;', '10+ Russian + Libyan', 'crew wounded.',
    'UKRAINIAN MILITARY');

  storyCard(xs[1], y1, w, h, '02', C.ink, 'radar',
    'EUROPE  /  NATO',
    'AWACS TO POLAND', 'AFTER MISSILES',
    '3 Russian Kh-101s', 'entered Poland 20 Nov;', 'AWACS early warning.',
    'NATO STATEMENT');

  storyCard(xs[2], y1, w, h, '03', C.green, 'globe',
    'CLIMATE  /  COP31',
    'LONGEST UN TALKS', 'END WITH NO DEAL',
    'Fossil fuels, finance', 'and a US boycott split', 'the 31st summit.',
    'UN CLIMATE SUMMIT');

  storyCard(xs[0], y2, w, h, '04', C.red, 'alert',
    'MIDDLE EAST  /  GAZA',
    'ISRAEL LAUNCHES', 'AL-AMARI RAID',
    'In Gaza refugee camp.', 'Oxfam: contamination', 'Gaza a wasteland.',
    'OXFAM BRIEFING');

  storyCard(xs[1], y2, w, h, '05', C.gold, 'mountain',
    'SOUTH ASIA  /  NEPAL',
    'INDIA PLEDGES', '0.6BN FOR NEPAL',
    'For flood rebuilding;', 'gains port access and', 'a new train service.',
    'OFFICIAL STATEMENTS');

  storyCard(xs[2], y2, w, h, '06', C.blue, 'plane',
    'EUROPE  /  BELGIUM',
    'BELGIAN FLIGHTS', 'CANCELLED',
    'Cost-of-living strike', 'grounds services as', 'household costs bite.',
    'BBC REPORT');
}

function technologyTicker() {
  const x = 32, y = 868, w = 960, h = 68;
  rect(x, y, w, h, C.ink);
  rect(x, y, 6, h, C.red);
  text('TECHNOLOGY  /  US-SINGAPORE', x + 18, y + 12, 2, C.gold, true);
  text('US SET TO BLACKLIST MEGASPEED AFTER NVIDIA ESPIONAGE SCANDAL',
    x + 18, y + 36, 2, C.white, true);
  icon('chip', x + w - 40, y + h / 2, C.gold);
}

function footer() {
  hline(32, 950, 960, C.rule, 2);
  text('SOURCES: VERIFIED REPORTS FOR 24 NOVEMBER 2026. FIGURES AS REPORTED.',
    32, 962, 1, C.muted);
  const sign = 'PREPARED BY @BWIRPRJ';
  text(sign, 992 - textWidth(sign, 1), 962, 1, C.muted);
}

// ---------------------------------------------------------------------------
// PNG encoding (IHDR + one IDAT + IEND, RGB8, filter 0), CRC32 by table.
// No timestamps or randomness, so the bytes are identical on every run.
// ---------------------------------------------------------------------------
const CRC_TABLE = (function () {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG() {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // colour type: truecolour RGB
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  const raw = Buffer.alloc((W * 3 + 1) * H);
  let p = 0;
  for (let y = 0; y < H; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      raw[p++] = px[i];
      raw[p++] = px[i + 1];
      raw[p++] = px[i + 2];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9, strategy: zlib.constants.Z_DEFAULT_STRATEGY });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------------------
// Build and write
// ---------------------------------------------------------------------------
fill(C.paper);
// Faint editorial grid on the paper, behind the cards.
for (let gx = 0; gx < W; gx += 32) vline(gx, 124, H - 124, C.grid);
for (let gy = 124; gy < H; gy += 32) hline(0, gy, W, C.grid);

masthead();
leadingStory();
globePanel();
newsGrid();
technologyTicker();
footer();

const png = encodePNG();
const dir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
const out = path.join(dir, 'entry.png');
fs.writeFileSync(out, png, { mode: 0o644 });
fs.chmodSync(out, 0o644);
console.log('wrote ' + out + ' (' + png.length + ' bytes, ' + W + 'x' + H + ')');
