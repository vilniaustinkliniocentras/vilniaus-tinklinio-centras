"use server";

import {
  createSignedContractUploadTarget,
  finalizeSignedContractUpload,
} from "@/lib/storage/signed-contracts";
import {
  fetchSignedContractUploadContextByToken,
  invalidateSignedContractUploadToken,
} from "@/lib/storage/signed-contract-upload-token";

const INVALID_LINK_MESSAGE = "Nuoroda negalioja.";
const UNEXPECTED_UPLOAD_ERROR_MESSAGE =
  "Nepavyko įkelti pasirašytos sutarties. Bandykite dar kartą.";

export type UploadSignedContractByTokenResult =
  | { success: true; message: string }
  | { success: false; message: string };

export type PrepareSignedContractUploadResult =
  | { success: true; path: string; token: string; signedUrl: string }
  | { success: false; message: string };

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return UNEXPECTED_UPLOAD_ERROR_MESSAGE;
}

export async function prepareSignedContractUploadByToken(
  token: string
): Promise<PrepareSignedContractUploadResult> {
  try {
    const context = await fetchSignedContractUploadContextByToken(token);
    if (!context) {
      return { success: false, message: INVALID_LINK_MESSAGE };
    }

    const target = await createSignedContractUploadTarget(context.registrationId);
    if (!target.success) {
      return { success: false, message: target.message };
    }

    return {
      success: true,
      path: target.path,
      token: target.token,
      signedUrl: target.signedUrl,
    };
  } catch (error) {
    console.error("Failed to prepare signed contract upload:", toErrorMessage(error));
    return { success: false, message: UNEXPECTED_UPLOAD_ERROR_MESSAGE };
  }
}

export async function completeSignedContractUploadByToken(
  token: string,
  storagePath: string
): Promise<UploadSignedContractByTokenResult> {
  try {
    const context = await fetchSignedContractUploadContextByToken(token);
    if (!context) {
      return { success: false, message: INVALID_LINK_MESSAGE };
    }

    const finalizeResult = await finalizeSignedContractUpload(
      context.registrationId,
      storagePath
    );

    if (!finalizeResult.success) {
      return { success: false, message: finalizeResult.message };
    }

    await invalidateSignedContractUploadToken(context.registrationId);

    return {
      success: true,
      message: "Pasirašyta sutartis sėkmingai įkelta.",
    };
  } catch (error) {
    console.error("Failed to complete signed contract upload:", toErrorMessage(error));
    return { success: false, message: UNEXPECTED_UPLOAD_ERROR_MESSAGE };
  }
}
