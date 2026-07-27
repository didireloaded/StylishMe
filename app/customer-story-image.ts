const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
const metadataChunks = new Set(["eXIf", "tEXt", "zTXt", "iTXt"]);

const u16be = (bytes: Uint8Array, offset: number) => (bytes[offset] << 8) | bytes[offset + 1];
const u32be = (bytes: Uint8Array, offset: number) => ((bytes[offset] * 0x1000000) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]) >>> 0;
const u32le = (bytes: Uint8Array, offset: number) => (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
const ascii = (bytes: Uint8Array, offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length));
const join = (parts: Uint8Array[]) => {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
};

function sanitizeJpeg(bytes: Uint8Array) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Choose a valid JPG image");
  const parts = [bytes.subarray(0, 2)];
  let width = 0; let height = 0; let offset = 2;
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error("Choose a valid JPG image");
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9) { parts.push(Uint8Array.of(0xff, marker)); break; }
    if (marker === 0xda) { parts.push(bytes.subarray(offset - 2)); offset = bytes.length; break; }
    const length = u16be(bytes, offset);
    if (length < 2 || offset + length > bytes.length) throw new Error("Choose a valid JPG image");
    if (sof.has(marker) && length >= 7) { height = u16be(bytes, offset + 3); width = u16be(bytes, offset + 5); }
    if (!((marker >= 0xe1 && marker <= 0xed) || marker === 0xfe)) parts.push(bytes.subarray(offset - 2, offset + length));
    offset += length;
  }
  if (!width || !height) throw new Error("Choose a valid JPG image");
  return { bytes: join(parts), width, height };
}

function sanitizePng(bytes: Uint8Array) {
  if (ascii(bytes, 1, 3) !== "PNG" || bytes.length < 33) throw new Error("Choose a valid PNG image");
  const width = u32be(bytes, 16); const height = u32be(bytes, 20);
  const parts = [bytes.subarray(0, 8)];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = u32be(bytes, offset); const end = offset + 12 + length;
    if (end > bytes.length) throw new Error("Choose a valid PNG image");
    const type = ascii(bytes, offset + 4, 4);
    if (!metadataChunks.has(type)) parts.push(bytes.subarray(offset, end));
    offset = end;
    if (type === "IEND") break;
  }
  return { bytes: join(parts), width, height };
}

function sanitizeWebp(bytes: Uint8Array) {
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") throw new Error("Choose a valid WebP image");
  const parts: Uint8Array[] = []; let width = 0; let height = 0; let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4); const length = u32le(bytes, offset + 4); const padded = length + (length % 2); const end = offset + 8 + padded;
    if (end > bytes.length) throw new Error("Choose a valid WebP image");
    const data = offset + 8;
    if (type === "VP8X" && length >= 10) {
      width = 1 + bytes[data + 4] + (bytes[data + 5] << 8) + (bytes[data + 6] << 16);
      height = 1 + bytes[data + 7] + (bytes[data + 8] << 8) + (bytes[data + 9] << 16);
      const clean = bytes.slice(offset, end); clean[8] &= ~0x2c; parts.push(clean);
    } else if (type === "VP8 " && length >= 10) {
      width = (bytes[data + 6] | (bytes[data + 7] << 8)) & 0x3fff;
      height = (bytes[data + 8] | (bytes[data + 9] << 8)) & 0x3fff; parts.push(bytes.subarray(offset, end));
    } else if (type === "VP8L" && length >= 5 && bytes[data] === 0x2f) {
      width = 1 + bytes[data + 1] + ((bytes[data + 2] & 0x3f) << 8);
      height = 1 + (bytes[data + 2] >> 6) + (bytes[data + 3] << 2) + ((bytes[data + 4] & 0x0f) << 10); parts.push(bytes.subarray(offset, end));
    } else if (!new Set(["EXIF", "XMP ", "ICCP"]).has(type)) parts.push(bytes.subarray(offset, end));
    offset = end;
  }
  if (!width || !height) throw new Error("Choose a valid WebP image");
  const payload = join(parts); const header = new Uint8Array(12);
  header.set([0x52, 0x49, 0x46, 0x46]); new DataView(header.buffer).setUint32(4, payload.length + 4, true); header.set([0x57, 0x45, 0x42, 0x50], 8);
  return { bytes: join([header, payload]), width, height };
}

export async function inspectAndReencodeStoryImage(input: Uint8Array | Buffer, contentType: string) {
  if (!allowed.has(contentType)) throw new Error("Choose a JPG, PNG or WebP image");
  const source = new Uint8Array(input);
  const image = contentType === "image/jpeg" ? sanitizeJpeg(source) : contentType === "image/png" ? sanitizePng(source) : sanitizeWebp(source);
  if (image.width * image.height > 30_000_000) throw new Error("Choose a photo under 30 megapixels");
  if (image.width < 720 || image.height < 960) throw new Error("Choose a photo at least 720 × 960 pixels");
  const ratio = image.width / image.height;
  if (ratio < 0.55 || ratio > 1) throw new Error("Choose a portrait outfit photo");
  return { ...image, contentType: contentType as "image/jpeg" | "image/png" | "image/webp" };
}

export async function inspectProfileImage(input: Uint8Array | Buffer, contentType: string) {
  if (!allowed.has(contentType)) throw new Error("Choose a JPG, PNG or WebP image");
  const source = new Uint8Array(input);
  const image = contentType === "image/jpeg" ? sanitizeJpeg(source) : contentType === "image/png" ? sanitizePng(source) : sanitizeWebp(source);
  if (image.width * image.height > 20_000_000) throw new Error("Choose a profile photo under 20 megapixels");
  if (image.width < 256 || image.height < 256) throw new Error("Choose a profile photo at least 256 × 256 pixels");
  return {
    ...image,
    contentType: contentType as "image/jpeg" | "image/png" | "image/webp",
    extension: contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp",
  };
}
