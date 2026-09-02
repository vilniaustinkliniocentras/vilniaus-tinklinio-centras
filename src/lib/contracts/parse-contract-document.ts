import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ContractBlock } from "@/lib/contracts/contract-document-types";
import type { ContractFields } from "@/lib/contracts/contract-fields";

let cachedHtml: string | null = null;

interface ParsedNode {
  text: string;
  isHint: boolean;
  isBold: boolean;
  isUnderscore: boolean;
}

function loadContractHtml(): string {
  if (cachedHtml) {
    return cachedHtml;
  }

  const htmlPath = join(process.cwd(), "docs/extracted-contract-html.html");
  cachedHtml = readFileSync(htmlPath, "utf8");
  return cachedHtml;
}

function decodeHtml(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

function parseNode(inner: string): ParsedNode {
  const text = stripTags(inner);
  return {
    text,
    isHint: /<em>/i.test(inner),
    isBold: /<strong>/i.test(inner),
    isUnderscore: /^_{10,}/.test(text.replace(/\s/g, "")),
  };
}

function extractNodes(html: string): ParsedNode[] {
  const withoutImage = html.replace(/<p>\s*<img[\s\S]*?<\/p>/i, "");
  const nodes: ParsedNode[] = [];
  const regex = /<(p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(withoutImage)) !== null) {
    const inner = match[2].trim();
    if (!inner || inner === "<td></td>") {
      continue;
    }

    nodes.push(parseNode(inner));
  }

  return nodes;
}

function isMajorSection(text: string): boolean {
  return (
    text === "SUTARTIES ĮSIGALIOJIMAS, GALIOJIMAS, KEITIMAS IR NUTRAUKIMAS" ||
    text === "ŠALIŲ ATSAKOMYBĖ" ||
    text === "BAIGIAMOSIOS NUOSTATOS" ||
    text === "SUTARTIES ŠALIŲ REKVIZITAI"
  );
}

function isRomanSection(text: string): boolean {
  return /^[IVXLC]+\.\s/.test(text);
}

function isTitle(text: string): boolean {
  return text.trim() === "TINKLINIO TRENIRUOČIŲ SUTARTIS";
}

function isDatePlaceholder(text: string): boolean {
  return text.includes("20 ___") || /\d{4} m\./.test(text);
}

function isCheckbox(text: string): boolean {
  return text.includes("☐");
}

function isBullet(text: string): boolean {
  return text.trim().startsWith("- ");
}

function resolveFieldValue(hint: string | undefined, fields: ContractFields): string {
  const normalized = hint?.toLowerCase() ?? "";

  if (normalized.includes("vieno iš tėvų")) {
    return `${fields.parentName},`;
  }

  if (normalized.includes("vaiko vardas")) {
    return fields.childNameBirth;
  }

  if (normalized.includes("el. pašto adresas")) {
    return fields.parentContact;
  }

  return "";
}

function buildRequisitesBlocks(fields: ContractFields): ContractBlock[] {
  return [
    { type: "section", text: "SUTARTIES ŠALIŲ REKVIZITAI" },
    { type: "spacer", height: 10 },
    {
      type: "columns-header",
      left: "KLIENTAS",
      right: "PASLAUGOS TEIKĖJAS",
    },
    { type: "spacer", height: 8 },
    {
      type: "columns-row",
      left: fields.parentName,
      right: "VŠĮ „VILNIAUS TINKLINIO CENTRAS“",
      leftHint: "(vardas, pavardė)",
    },
    { type: "spacer", height: 10 },
    {
      type: "columns-single",
      side: "right",
      text: "Įm. k. 300060057",
    },
    {
      type: "columns-single",
      side: "right",
      text: "Sąsk. nr. LT117044060004586642",
    },
    { type: "spacer", height: 4 },
    {
      type: "columns-row",
      left: fields.parentEmail,
      right: "El.p.: vilniaustinkliniocentras@gmail.com",
      leftHint: "(el. pašto adresas)",
    },
    {
      type: "columns-row",
      left: fields.parentPhone,
      right: "Tel. +37062824887",
      leftHint: "(telefono numeris)",
    },
    { type: "spacer", height: 8 },
    {
      type: "columns-single",
      side: "right",
      text: "Direktorė Asta Jansonienė",
    },
    { type: "spacer", height: 14 },
    {
      type: "signature-row",
      left: "___________________________",
      right: "_____________________________",
    },
    {
      type: "signature-row",
      left: "(parašas)",
      right: "(parašas)",
    },
  ];
}

export function buildContractDocument(fields: ContractFields): ContractBlock[] {
  const nodes = extractNodes(loadContractHtml());
  const blocks: ContractBlock[] = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const { text } = node;

    if (text === "SUTARTIES ŠALIŲ REKVIZITAI") {
      blocks.push(...buildRequisitesBlocks(fields));
      break;
    }

    if (node.isUnderscore) {
      const hintNode = nodes[index + 1];
      const hint = hintNode?.isHint ? hintNode.text : undefined;
      const value = resolveFieldValue(hint, fields);

      blocks.push({
        type: "field",
        value,
        hint,
      });

      if (hintNode?.isHint) {
        index += 1;
      }
      continue;
    }

    if (node.isHint) {
      continue;
    }

    if (isTitle(text)) {
      blocks.push({ type: "title", text: text.trim() });
      continue;
    }

    if (isDatePlaceholder(text)) {
      blocks.push({
        type: "date",
        text: text.includes("20 ___") ? fields.contractDate : text.trim(),
      });
      continue;
    }

    if (isMajorSection(text) || isRomanSection(text)) {
      blocks.push({ type: "section", text: text.trim() });
      continue;
    }

    if (isCheckbox(text)) {
      blocks.push({ type: "checkbox", text: text.trim() });
      continue;
    }

    if (isBullet(text)) {
      blocks.push({ type: "bullet", text: text.trim() });
      continue;
    }

    if (text.includes("KLIENTAS") && text.includes("PASLAUGOS TEIKĖJAS")) {
      continue;
    }

    if (text.includes("(parašas)")) {
      continue;
    }

    blocks.push({
      type: "paragraph",
      text: text.trim(),
      bold: node.isBold,
      align: text.trim() === "Vilnius" ? "left" : "justify",
    });
  }

  return blocks;
}
