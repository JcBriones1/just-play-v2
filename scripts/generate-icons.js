// Script to generate valid PNG and SVG icons for PWA and Mobile
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create Brand SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </linearGradient>
    <linearGradient id="neon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="40%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="14" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  
  <!-- Outer squircle background -->
  <rect width="512" height="512" rx="128" fill="url(#bg)"/>
  <rect width="504" height="504" x="4" y="4" rx="124" fill="none" stroke="url(#neon)" stroke-width="4" stroke-opacity="0.3"/>
  
  <!-- Aura Circles -->
  <circle cx="256" cy="256" r="170" fill="none" stroke="url(#neon)" stroke-width="3" stroke-opacity="0.2"/>
  <circle cx="256" cy="256" r="130" fill="none" stroke="url(#neon)" stroke-width="2" stroke-opacity="0.15" stroke-dasharray="8 8"/>
  
  <!-- Ambient Core Glow -->
  <circle cx="256" cy="256" r="85" fill="#8b5cf6" opacity="0.2" filter="url(#glow)"/>

  <!-- Waveform + Play Icon Visual -->
  <g filter="url(#glow)">
    <!-- Dynamic sound waves -->
    <rect x="135" y="210" width="18" height="92" rx="9" fill="url(#neon)"/>
    <rect x="175" y="165" width="18" height="182" rx="9" fill="url(#neon)"/>
    <rect x="215" y="125" width="18" height="262" rx="9" fill="url(#neon)"/>
    <rect x="255" y="95" width="18" height="322" rx="9" fill="url(#neon)"/>
    <rect x="295" y="145" width="18" height="222" rx="9" fill="url(#neon)"/>
    <rect x="335" y="185" width="18" height="142" rx="9" fill="url(#neon)"/>
    <rect x="375" y="225" width="18" height="62" rx="9" fill="url(#neon)"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

// Function to generate raw PNG with RGB pixels
function createPNG(size, maskable = false) {
  // Simple uncompressed or deflate PNG generator
  const width = size;
  const height = size;

  // Raw RGBA scanlines (height * (1 filter byte + width * 4 bytes))
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  const center = size / 2;
  const radius = size * (maskable ? 0.38 : 0.44);

  for (let y = 0; y < height; y++) {
    scanlines[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background color: Deep obsidian #0c0f17
      let r = 12, g = 15, b = 23, a = 255;

      // Aura gradient in center
      if (dist < radius) {
        const factor = 1 - (dist / radius);
        // Purple-cyan glow
        r = Math.min(255, Math.floor(12 + factor * 130));
        g = Math.min(255, Math.floor(15 + factor * 80 + (x / width) * 80));
        b = Math.min(255, Math.floor(23 + factor * 220));
      }

      // Bar wave representation in center
      const normX = (x - (center - size * 0.3)) / (size * 0.6);
      if (normX >= 0 && normX <= 1) {
        const barIndex = Math.floor(normX * 7);
        const barHeights = [0.3, 0.6, 0.85, 1.0, 0.75, 0.5, 0.25];
        const barHeight = barHeights[barIndex] * (size * 0.55);
        const barXCenter = (center - size * 0.3) + (barIndex + 0.5) * (size * 0.6 / 7);
        const barWidth = size * 0.04;

        if (Math.abs(x - barXCenter) <= barWidth / 2 && Math.abs(y - center) <= barHeight / 2) {
          // Vibrant cyan-pink gradient for the bars
          const t = barIndex / 6;
          r = Math.floor(6 * (1 - t) + 236 * t);
          g = Math.floor(182 * (1 - t) + 72 * t);
          b = Math.floor(212 * (1 - t) + 153 * t);
          a = 255;
        }
      }

      scanlines[offset++] = r;
      scanlines[offset++] = g;
      scanlines[offset++] = b;
      scanlines[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(scanlines);

  // PNG structure: Signature + IHDR + IDAT + IEND
  const signature = Buffer.from([137, 80, 78, 72, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // color type RGBA
  ihdr.writeUInt8(0, 10); // compression method 0
  ihdr.writeUInt8(0, 11); // filter method 0
  ihdr.writeUInt8(0, 12); // interlace method 0
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);

  const toCheck = Buffer.concat([typeBuf, data]);
  const crc = crc32(toCheck);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
}

// Generate PWA icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(64));

console.log('Successfully created all brand SVG and PNG icons in public directory!');
