import { Font } from "@react-pdf/renderer";
import { getContractFontAssetPaths } from "@/lib/contracts/contract-asset-paths";

let fontsRegistered = false;

export function registerContractFonts(): void {
  if (fontsRegistered) {
    return;
  }

  const { regular, bold } = getContractFontAssetPaths();

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: regular, fontWeight: "normal" },
      { src: bold, fontWeight: "bold" },
    ],
  });

  fontsRegistered = true;
}
