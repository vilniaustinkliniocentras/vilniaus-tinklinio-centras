import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CONTRACT_ASSETS_DIR = join(
  process.cwd(),
  "src/lib/contracts/assets"
);

export const CONTRACT_HTML_PATH = join(
  CONTRACT_ASSETS_DIR,
  "extracted-contract-html.html"
);

export const CONTRACT_FONT_REGULAR_PATH = join(
  CONTRACT_ASSETS_DIR,
  "NotoSans-Regular.ttf"
);

export const CONTRACT_FONT_BOLD_PATH = join(
  CONTRACT_ASSETS_DIR,
  "NotoSans-Bold.ttf"
);

function assertAssetExists(path: string, label: string): void {
  if (!existsSync(path)) {
    throw new Error(`${label} asset not found.`);
  }
}

export function readContractHtmlAsset(): string {
  assertAssetExists(CONTRACT_HTML_PATH, "Contract HTML");
  return readFileSync(CONTRACT_HTML_PATH, "utf8");
}

export function getContractFontAssetPaths(): {
  regular: string;
  bold: string;
} {
  assertAssetExists(CONTRACT_FONT_REGULAR_PATH, "Regular font");
  assertAssetExists(CONTRACT_FONT_BOLD_PATH, "Bold font");

  return {
    regular: CONTRACT_FONT_REGULAR_PATH,
    bold: CONTRACT_FONT_BOLD_PATH,
  };
}
