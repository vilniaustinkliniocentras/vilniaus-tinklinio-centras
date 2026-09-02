import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mammoth from "mammoth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const inputPath = path.join(root, "docs", "VTC sutartis 2k per sav..docx");
const outputPath = path.join(root, "docs", "extracted-contract-text.txt");

try {
  const result = await mammoth.extractRawText({ path: inputPath });
  await fs.promises.writeFile(outputPath, result.value, "utf8");
  if (result.messages.length) {
    console.error(JSON.stringify(result.messages, null, 2));
  }
  process.stdout.write(result.value);
} catch (err) {
  console.error("Extraction failed:", err);
  process.exit(1);
}
