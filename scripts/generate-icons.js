import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function createPng(width, height, isMaskable = false) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Raw image data with scanline filter 0
  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.38 : 0.42);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Deep indigo background with blue gradient
      let r = 79;
      let g = 70;
      let b = 229;
      let a = 255;

      const normY = y / height;
      r = Math.round(79 * (1 - normY) + 30 * normY);
      g = Math.round(70 * (1 - normY) + 27 * normY);
      b = Math.round(229 * (1 - normY) + 75 * normY);

      if (!isMaskable) {
        // Rounded corners
        const cornerR = width * 0.22;
        const clampedX = Math.max(cornerR, Math.min(width - cornerR, x));
        const clampedY = Math.max(cornerR, Math.min(height - cornerR, y));
        const cornerDist = Math.hypot(x - clampedX, y - clampedY);
        if (cornerDist > cornerR) {
          a = 0;
        }
      }

      // Draw emblem in center
      if (dist < radius * 0.6) {
        // Bright card surface
        if (Math.abs(dx) < radius * 0.45 && Math.abs(dy) < radius * 0.5) {
          r = 255;
          g = 255;
          b = 255;
          a = 240;
          // Emerald accent bar at top
          if (dy < -radius * 0.25) {
            r = 16;
            g = 185;
            b = 129;
          }
        }
      }

      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(raw);
  const idat = makeChunk('IDAT', deflated);
  const iend = makeChunk('IEND', Buffer.alloc(0));
  const ihdrChunk = makeChunk('IHDR', ihdr);

  return Buffer.concat([signature, ihdrChunk, idat, iend]);
}

const outDir = path.resolve('public');
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), createPng(180, 180, false));
console.log('PWA icons created successfully');
