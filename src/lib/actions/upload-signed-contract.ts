"use server";

import { uploadSignedContractForRegistration } from "@/lib/storage/signed-contracts";
import {
  fetchSignedContractUploadContextByToken,
  invalidateSignedContractUploadToken,
} from "@/lib/storage/signed-contract-upload-token";
import { SIGNED_CONTRACT_MAX_BYTES } from "@/lib/storage/signed-contract-config";
import { validateSignedContractPdf } from "@/lib/storage/signed-contract-validation";

const INVALID_LINK_MESSAGE = "Nuoroda negalioja.";

export type UploadSignedContractByTokenResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function uploadSignedContractByToken(
  token: string,
  formData: FormData
): Promise<UploadSignedContractByTokenResult> {
  const context = await fetchSignedContractUploadContextByToken(token);
  if (!context) {
    return { success: false, message: INVALID_LINK_MESSAGE };
  }

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return { success: false, message: "Pasirinkite PDF failą." };
  }

  if (fileEntry.size > SIGNED_CONTRACT_MAX_BYTES) {
    return {
      success: false,
      message: `Failas per didelis. Maksimalus dydis: ${Math.round(SIGNED_CONTRACT_MAX_BYTES / (1024 * 1024))} MB.`,
    };
  }

  const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());
  const validation = validateSignedContractPdf(fileBuffer);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  const uploadResult = await uploadSignedContractForRegistration(
    context.registrationId,
    fileBuffer
  );

  if (!uploadResult.success) {
    return { success: false, message: uploadResult.message };
  }

  await invalidateSignedContractUploadToken(context.registrationId);

  return {
    success: true,
    message: "Pasirašyta sutartis sėkmingai įkelta.",
  };
}
