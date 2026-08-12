import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const INPUT = path.resolve("public/images/logo.png");
const OUTPUT = path.resolve("public/images/logo.png");
const BACKUP = path.resolve("public/images/logo.original.png");
const CANVAS = 2048;
const PADDING_RATIO = 0.08; // transparent padding around logo

function isBackground(r, g, b, a) {
  if (a < 8) return true;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Remove only near-black matte background, not navy logo colors.
  if (max <= 24 && luma <= 20) return true;
  if (max <= 40 && min <= 12 && luma <= 28) return true;

  return false;
}

function backgroundAlpha(r, g, b, a) {
  if (a < 8) return 0;
  if (!isBackground(r, g, b, a)) return a;

  const max = Math.max(r, g, b);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const bgScore = Math.max(0, 1 - max / 40, 1 - luma / 32);

  return Math.max(0, Math.min(255, Math.round(255 * (1 - bgScore))));
}

function cleanupFringe(r, g, b, a) {
  if (a === 0) return 0;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Remove residual black matte/fringe without touching navy or white logo tones.
  if (max <= 18) return 0;
  if (max <= 42 && luma <= 34 && a < 220) return 0;
  if (max <= 28 && a < 160) return 0;

  if (a > 245) return 255;
  if (a < 18 && max < 90) return 0;

  return a;
}

async function removeBackground(image) {
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    pixels[i + 3] = cleanupFringe(r, g, b, backgroundAlpha(r, g, b, a));
  }

  return sharp(pixels, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  });
}

async function getContentBounds(image) {
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const idx = (y * info.width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > 12) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    throw new Error("Could not detect logo content bounds.");
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

async function main() {
  if (!fs.existsSync(BACKUP)) {
    fs.copyFileSync(INPUT, BACKUP);
    console.log("Backup saved:", BACKUP);
  }

  const source = fs.existsSync(BACKUP) ? BACKUP : INPUT;
  const inputMeta = await sharp(source).metadata();
  console.log("Input:", inputMeta.width, "x", inputMeta.height, `(${inputMeta.format})`);

  const transparent = await removeBackground(sharp(source));
  const bounds = await getContentBounds(transparent);
  console.log("Content bounds:", bounds);

  const innerSize = Math.round(CANVAS * (1 - PADDING_RATIO * 2));

  const processed = await transparent
    .extract(bounds)
    .resize(innerSize, innerSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .extend({
      top: Math.floor((CANVAS - innerSize) / 2),
      bottom: Math.ceil((CANVAS - innerSize) / 2),
      left: Math.floor((CANVAS - innerSize) / 2),
      right: Math.ceil((CANVAS - innerSize) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .sharpen({
      sigma: 0.8,
      m1: 1.0,
      m2: 0.35,
      x1: 2,
      y2: 10,
      y3: 20,
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      force: true,
    })
    .toBuffer();

  fs.writeFileSync(OUTPUT, processed);

  const outputMeta = await sharp(OUTPUT).metadata();
  console.log("Output:", outputMeta.width, "x", outputMeta.height, `(${outputMeta.format})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
