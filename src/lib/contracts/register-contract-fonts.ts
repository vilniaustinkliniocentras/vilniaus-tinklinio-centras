import { join } from "node:path";
import { Font } from "@react-pdf/renderer";

let fontsRegistered = false;

export function registerContractFonts(): void {
  if (fontsRegistered) {
    return;
  }

  const regular = join(process.cwd(), "public/fonts/NotoSans-Regular.ttf");
  const bold = join(process.cwd(), "public/fonts/NotoSans-Bold.ttf");

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: regular, fontWeight: "normal" },
      { src: bold, fontWeight: "bold" },
    ],
  });

  fontsRegistered = true;
}
