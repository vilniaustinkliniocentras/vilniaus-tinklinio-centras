import { readFileSync } from "node:fs";
import {
  decodeSebStatementBuffer,
  hashSebStatementBytes,
  parseSebStatement,
  sebTransactionHash,
} from "../src/lib/admin/seb-csv";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const invalid = parseSebStatement("not a bank file\njust text");
assert(!invalid.ok, "non-SEB CSV should be rejected");

const sample = `"SĄSKAITOS  (LT000) IŠRAŠAS (UŽ LAIKOTARPĮ: 2026-08-01-2026-08-31)";
"DOK NR.";"DATA";"VALIUTA";"SUMA";"MOKĖTOJO ARBA GAVĖJO PAVADINIMAS";"MOKĖTOJO ARBA GAVĖJO IDENTIFIKACINIS KODAS";"SĄSKAITA";"KREDITO ĮSTAIGOS PAVADINIMAS";"KREDITO ĮSTAIGOS SWIFT KODAS";"MOKĖJIMO PASKIRTIS";"TRANSAKCIJOS KODAS";"DOKUMENTO DATA";"TRANSAKCIJOS TIPAS";"NUORODA";"DEBETAS/KREDITAS";"SUMA SĄSKAITOS VALIUTA";"SĄSKAITOS NR";"SĄSKAITOS VALIUTA";
"1";2026-08-02;"EUR";10,00;"Test Payer";"";"LT00";"BANK";"SWIFT";"Už stovyklą";"ROTESTCREDIT";2026-08-02;"TYPE";"";"C";10,00;"LT11";"EUR";
"";2026-08-04;"EUR";4,50;"SEB bankas";"";"";"";"";"Mokestis";"ROTESTDEBIT";2026-08-04;"FEE";"";"D";4,50;"LT11";"EUR";
`;
const parsedSample = parseSebStatement(sample);
assert(parsedSample.ok, "sample SEB CSV should parse");
assert(parsedSample.credits.length === 1, "sample should have 1 credit");
assert(parsedSample.skippedDebits === 1, "sample should skip 1 debit");
assert(parsedSample.credits[0].amountCents === 1000, "10,00 should be 1000 cents");
assert(
  parsedSample.credits[0].transactionHash === sebTransactionHash("ROTESTCREDIT"),
  "hash should use TRANSAKCIJOS KODAS"
);

const realPath = "docs/seb-statement.csv";
let realResult: Record<string, unknown> | null = null;

try {
  const realBytes = readFileSync(realPath);
  const realText = decodeSebStatementBuffer(realBytes);
  assert(realText, "real CSV should decode");
  const real = parseSebStatement(realText);
  assert(real.ok, "real SEB CSV should parse");
  assert(real.dataRowCount === 35, `expected 35 data rows, got ${real.dataRowCount}`);
  assert(real.credits.length === 31, `expected 31 credits, got ${real.credits.length}`);
  assert(real.skippedDebits === 4, `expected 4 debits, got ${real.skippedDebits}`);
  assert(real.rowErrors.length === 0, "real file should have no row errors");

  const hashes = new Set(real.credits.map((row) => row.transactionHash));
  assert(hashes.size === 31, "credit hashes must be unique");

  const again = parseSebStatement(realText);
  assert(again.ok, "second parse should succeed");
  assert(
    again.credits.every(
      (row, index) => row.transactionHash === real.credits[index].transactionHash
    ),
    "duplicate parse must produce identical fingerprints"
  );

  realResult = {
    dataRowCount: real.dataRowCount,
    credits: real.credits.length,
    skippedDebits: real.skippedDebits,
    uniqueHashes: hashes.size,
    fileHashPrefix: hashSebStatementBytes(realBytes).slice(0, 12),
  };
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
    throw error;
  }
}

console.log(JSON.stringify({ ok: true, sample: true, real: realResult }, null, 2));
