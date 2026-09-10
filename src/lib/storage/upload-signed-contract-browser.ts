import {
  SIGNED_CONTRACT_ALLOWED_MIME,
  SIGNED_CONTRACT_BROWSER_UPLOAD_TIMEOUT_MS,
} from "@/lib/storage/signed-contract-config";

export type BrowserSignedContractUploadResult =
  | { success: true }
  | { success: false; message: string };

const UPLOAD_TIMEOUT_MESSAGE = "Įkėlimas užtruko per ilgai. Bandykite dar kartą.";
const UPLOAD_FAILED_MESSAGE = "Nepavyko įkelti pasirašytos sutarties.";
const MISSING_CONFIG_MESSAGE = "Įkėlimo konfigūracija nebaigta. Bandykite vėliau.";
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

export async function fileLooksLikePdf(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, PDF_MAGIC.length).arrayBuffer());
  if (header.length < PDF_MAGIC.length) {
    return false;
  }

  return PDF_MAGIC.every((byte, index) => header[index] === byte);
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export async function withClientTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timeoutId: number | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new DOMException(timeoutMessage, "AbortError"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

export async function uploadPdfToSignedContractUrl(
  signedUrl: string,
  file: File
): Promise<BrowserSignedContractUploadResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !anonKey) {
    return { success: false, message: MISSING_CONFIG_MESSAGE };
  }

  const looksLikePdf = await fileLooksLikePdf(file);
  if (!looksLikePdf) {
    return { success: false, message: "Leidžiami tik PDF failai." };
  }

  const pdfFile =
    file.type === SIGNED_CONTRACT_ALLOWED_MIME
      ? file
      : new File([file], file.name, { type: SIGNED_CONTRACT_ALLOWED_MIME });

  const body = new FormData();
  body.append("cacheControl", "0");
  body.append("", pdfFile);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    SIGNED_CONTRACT_BROWSER_UPLOAD_TIMEOUT_MS
  );

  try {
    const response = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "x-upsert": "false",
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(
        "Browser signed contract upload failed:",
        response.status,
        errorBody.slice(0, 500)
      );
      return { success: false, message: UPLOAD_FAILED_MESSAGE };
    }

    return { success: true };
  } catch (error) {
    if (isAbortError(error)) {
      return { success: false, message: UPLOAD_TIMEOUT_MESSAGE };
    }

    console.error("Browser signed contract upload threw:", error);
    return { success: false, message: UPLOAD_FAILED_MESSAGE };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
