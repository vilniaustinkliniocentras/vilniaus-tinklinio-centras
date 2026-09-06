import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE = path.resolve("public/images/logo.png");
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const outputs = [
  { file: "src/app/icon.png", size: 512 },
  { file: "src/app/apple-icon.png", size: 180 },
  { file: "public/favicon-16x16.png", size: 16 },
  { file: "public/favicon-32x32.png", size: 32 },
  { file: "public/favicon-48x48.png", size: 48 },
  { file: "public/apple-touch-icon.png", size: 180 },
];

async function main() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Logo source not found: ${SOURCE}`);
  }

  for (const { file, size } of outputs) {
    const outputPath = path.resolve(file);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    await sharp(SOURCE)
      .resize(size, size, {
        fit: "contain",
        background: TRANSPARENT,
        kernel: sharp.kernel.lanczos3,
      })
      .png({ compressionLevel: 9, force: true })
      .toFile(outputPath);

    console.log(`Wrote ${file} (${size}x${size})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
