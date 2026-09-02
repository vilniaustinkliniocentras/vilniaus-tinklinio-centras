import { randomUUID } from "crypto";
import {
  SIGNED_CONTRACT_ALLOWED_MIME,
  SIGNED_CONTRACT_MAX_BYTES,
  SIGNED_CONTRACTS_BUCKET,
} from "@/lib/storage/signed-contract-config";

const PDF_MAGIC = Buffer.from("%PDF-", "ascii");

export function buildSignedContractStoragePath(registrationId: string): string {
  return `${registrationId}/${randomUUID()}.pdf`;
}

export function isSignedContractStoragePathForRegistration(
  registrationId: string,
  storagePath: string
): boolean {
  const normalizedPath = storagePath.trim();
  const prefix = `${registrationId}/`;

  return (
    normalizedPath.startsWith(prefix) &&
    normalizedPath.endsWith(".pdf") &&
    !normalizedPath.includes("..")
  );
}

export function validateSignedContractPdf(
  file: Buffer
): { valid: true } | { valid: false; message: string } {
  if (!file.length) {
    return { valid: false, message: "Failas tuščias." };
  }

  if (file.length > SIGNED_CONTRACT_MAX_BYTES) {
    return {
      valid: false,
      message: `Failas per didelis. Maksimalus dydis: ${Math.round(SIGNED_CONTRACT_MAX_BYTES / (1024 * 1024))} MB.`,
    };
  }

  if (file.length < PDF_MAGIC.length || !file.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    return { valid: false, message: "Leidžiami tik PDF failai." };
  }

  return { valid: true };
}

export function getSignedContractUploadOptions() {
  return {
    bucket: SIGNED_CONTRACTS_BUCKET,
    contentType: SIGNED_CONTRACT_ALLOWED_MIME,
    cacheControl: "private, max-age=0, no-store",
    upsert: false,
  } as const;
}
