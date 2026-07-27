import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const output = new URL("../public/icons/", import.meta.url);
await mkdir(output, { recursive: true });

function iconSvg(size, inset = 0) {
  const pad = Math.round(size * inset);
  const inner = size - pad * 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#df70b7"/><stop offset="1" stop-color="#ff7c73"/></linearGradient></defs>
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#0b1218"/>
    <circle cx="${size * 0.73}" cy="${size * 0.22}" r="${size * 0.24}" fill="url(#g)" opacity=".42"/>
    <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${Math.round(inner * 0.2)}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="${Math.max(2, size * 0.008)}"/>
    <text x="50%" y="56%" text-anchor="middle" fill="#f7f2ef" font-family="Georgia,serif" font-size="${size * 0.43}" letter-spacing="-${size * 0.03}">S</text>
    <circle cx="${size * 0.67}" cy="${size * 0.7}" r="${size * 0.035}" fill="#ff7c73"/>
  </svg>`);
}

await sharp(iconSvg(192)).png().toFile(fileURLToPath(new URL("stylishme-192.png", output)));
await sharp(iconSvg(512)).png().toFile(fileURLToPath(new URL("stylishme-512.png", output)));
await sharp(iconSvg(512, 0.1)).png().toFile(fileURLToPath(new URL("stylishme-maskable-512.png", output)));
