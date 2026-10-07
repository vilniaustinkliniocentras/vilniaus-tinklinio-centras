import { createHash } from "node:crypto";

export const SEB_CSV_MAX_BYTES = 2 * 1024 * 1024;
export const SEB_TRANSACTION_HASH_PREFIX = "seb-txn-v1:";

const REQUIRED_HEADERS = [
  "DATA",
  "SUMA",
  "MOKĖTOJO ARBA GAVĖJO PAVADINIMAS",
  "MOKĖJIMO PASKIRTIS",
  "TRANSAKCIJOS KODAS",
  "DEBETAS/KREDITAS",
] as const;

export type SebCreditRow = {
  lineNumber: number;
  transactionDate: string;
  amountCents: number;
  currency: string;
  payerName: string | null;
  payerAccount: string | null;
  description: string | null;
  bankReference: string;
  transactionHash: string;
  rawFields: Record<string, string>;
};

export type SebParseError = {
  lineNumber: number;
  message: string;
};

export type SebParseResult =
  | { ok: false; message: string }
  | {
      ok: true;
      credits: SebCreditRow[];
      skippedDebits: number;
      rowErrors: SebParseError[];
      dataRowCount: number;
    };

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function normalizeHeader(value: string): string {
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}

export function parseSebCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ";") {
      out.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  out.push(current);
  return out;
}

export function sebTransactionHash(transactionCode: string): string {
  return createHash("sha256")
    .update(`${SEB_TRANSACTION_HASH_PREFIX}${transactionCode.trim()}`, "utf8")
    .digest("hex");
}

export function hashSebStatementBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseIsoDate(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const year = Number(trimmed.slice(0, 4));
  const month = Number(trimmed.slice(5, 7));
  const day = Number(trimmed.slice(8, 10));
  const utc = new Date(Date.UTC(year, month - 1, day));

  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }

  return trimmed;
}

function parseAmountCents(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!trimmed) {
    return null;
  }

  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  const amount = Number(trimmed);
  if (!Number.isFinite(amount)) {
    return null;
  }

  return Math.round(amount * 100);
}

function cell(columns: string[], index: number | undefined): string {
  if (index === undefined) {
    return "";
  }

  return (columns[index] ?? "").trim();
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function decodeSebStatementBuffer(bytes: Buffer): string | null {
  if (bytes.length === 0) {
    return null;
  }

  try {
    return stripBom(bytes.toString("utf8"));
  } catch {
    return null;
  }
}

export function parseSebStatement(text: string): SebParseResult {
  const content = stripBom(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = content.split("\n");
  const nonEmpty = lines
    .map((line, index) => ({ line: line.trimEnd(), lineNumber: index + 1 }))
    .filter((entry) => entry.line.trim().length > 0);

  if (nonEmpty.length < 2) {
    return {
      ok: false,
      message: "Failas neatpažintas kaip SEB išrašas. Trūksta antraštės eilutės.",
    };
  }

  let headerEntry = nonEmpty[0];
  let dataStartIndex = 1;
  let headerColumns = parseSebCsvLine(headerEntry.line).map(normalizeHeader);

  if (!headerColumns.includes("DEBETAS/KREDITAS")) {
    if (nonEmpty.length < 3) {
      return {
        ok: false,
        message: "Failas neatpažintas kaip SEB išrašas. Nerasta stulpelio „DEBETAS/KREDITAS“.",
      };
    }
    headerEntry = nonEmpty[1];
    dataStartIndex = 2;
    headerColumns = parseSebCsvLine(headerEntry.line).map(normalizeHeader);
  }

  const headerIndex = new Map<string, number>();
  headerColumns.forEach((name, index) => {
    if (name && !headerIndex.has(name)) {
      headerIndex.set(name, index);
    }
  });

  const missing = REQUIRED_HEADERS.filter((name) => !headerIndex.has(name));
  if (missing.length > 0) {
    return {
      ok: false,
      message:
        "Failas neatpažintas kaip SEB išrašas. Trūksta būtinų stulpelių.",
    };
  }

  const credits: SebCreditRow[] = [];
  let skippedDebits = 0;
  const rowErrors: SebParseError[] = [];
  let dataRowCount = 0;

  for (const entry of nonEmpty.slice(dataStartIndex)) {
    dataRowCount += 1;
    const columns = parseSebCsvLine(entry.line);
    const direction = cell(columns, headerIndex.get("DEBETAS/KREDITAS")).toUpperCase();
    const transactionCode = cell(columns, headerIndex.get("TRANSAKCIJOS KODAS"));
    const dateValue = cell(columns, headerIndex.get("DATA"));
    const amountValue = cell(columns, headerIndex.get("SUMA"));
    const payerName = nullableText(
      cell(columns, headerIndex.get("MOKĖTOJO ARBA GAVĖJO PAVADINIMAS"))
    );
    const payerAccount = nullableText(cell(columns, headerIndex.get("SĄSKAITA")));
    const description = nullableText(
      cell(columns, headerIndex.get("MOKĖJIMO PASKIRTIS"))
    );
    const currency =
      nullableText(cell(columns, headerIndex.get("VALIUTA"))) ?? "EUR";

    if (!transactionCode) {
      rowErrors.push({
        lineNumber: entry.lineNumber,
        message: "Trūksta transakcijos kodo.",
      });
      continue;
    }

    if (direction === "D") {
      skippedDebits += 1;
      continue;
    }

    if (direction !== "C") {
      rowErrors.push({
        lineNumber: entry.lineNumber,
        message: "Neatpažintas debeto/kredito požymis.",
      });
      continue;
    }

    const transactionDate = parseIsoDate(dateValue);
    if (!transactionDate) {
      rowErrors.push({
        lineNumber: entry.lineNumber,
        message: "Neteisinga data.",
      });
      continue;
    }

    const amountCents = parseAmountCents(amountValue);
    if (amountCents === null || amountCents <= 0) {
      rowErrors.push({
        lineNumber: entry.lineNumber,
        message: "Neteisinga suma.",
      });
      continue;
    }

    const rawFields: Record<string, string> = {};
    for (const [name, index] of headerIndex.entries()) {
      if (!name) {
        continue;
      }
      rawFields[name] = cell(columns, index);
    }

    credits.push({
      lineNumber: entry.lineNumber,
      transactionDate,
      amountCents,
      currency,
      payerName,
      payerAccount,
      description,
      bankReference: transactionCode,
      transactionHash: sebTransactionHash(transactionCode),
      rawFields,
    });
  }

  if (dataRowCount === 0) {
    return {
      ok: false,
      message: "SEB išraše nėra operacijų eilučių.",
    };
  }

  return {
    ok: true,
    credits,
    skippedDebits,
    rowErrors,
    dataRowCount,
  };
}
