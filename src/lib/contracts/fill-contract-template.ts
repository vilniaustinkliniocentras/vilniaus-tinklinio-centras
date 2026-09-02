import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ContractFields } from "@/lib/contracts/contract-fields";

let cachedTemplate: string | null = null;

function loadContractTemplate(): string {
  if (cachedTemplate) {
    return cachedTemplate;
  }

  const templatePath = join(process.cwd(), "docs/extracted-contract-text.txt");
  cachedTemplate = readFileSync(templatePath, "utf8");
  return cachedTemplate;
}

export function fillContractTemplate(fields: ContractFields): string {
  let text = loadContractTemplate();

  text = text.replace("20 ___   m. _______________ d.", fields.contractDate);

  text = text.replace(
    "________________________________________________________________________, \n\n(vieno iš tėvų ar globėjų vardas ir pavardė)",
    `${fields.parentName},\n\n(vieno iš tėvų ar globėjų vardas ir pavardė)`
  );

  text = text.replace(
    "_______________________________________________________________________________\n\n( el. pašto adresas, kontaktinis telefonas)\n\n\n\n(toliau – Klientas)",
    `${fields.parentContact}\n\n( el. pašto adresas, kontaktinis telefonas)\n\n\n\n(toliau – Klientas)`
  );

  text = text.replace(
    "______________________________________________________________________________\n\n(vaiko vardas ir pavardė, gimimo data)",
    `${fields.childNameBirth}\n\n(vaiko vardas ir pavardė, gimimo data)`
  );

  text = text.replace(
    "_______________________________________________________________________________\n\n( el. pašto adresas, kontaktinis telefonas (jei yra))\n\npriimti sportuoti",
    `${fields.parentContact}\n\n( el. pašto adresas, kontaktinis telefonas (jei yra))\n\npriimti sportuoti`
  );

  text = text.replace(
    "____________________________	 	VŠĮ „VILNIAUS TINKLINIO CENTRAS“ \n\n (vardas, pavardė)",
    `${fields.parentName}\t\tVŠĮ „VILNIAUS TINKLINIO CENTRAS“ \n\n (vardas, pavardė)`
  );

  text = text.replace(
    "_____________________________		El.p.: vilniaustinkliniocentras@gmail.com\n\n (el. pašto adresas)",
    `${fields.parentEmail}\t\tEl.p.: vilniaustinkliniocentras@gmail.com\n\n (el. pašto adresas)`
  );

  text = text.replace(
    " _____________________________    \t\n\n (telefono numeris)",
    ` ${fields.parentPhone}\t\n\n (telefono numeris)`
  );

  return text;
}

export function splitContractParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").trim())
    .filter(Boolean);
}
