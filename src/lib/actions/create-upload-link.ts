"use server";

import { isAdminAuthenticated } from "@/lib/admin/auth";
import { generateSignedContractUploadToken } from "@/lib/storage/signed-contract-upload-token";
import { buildSignedContractUploadUrl } from "@/lib/storage/signed-contract-upload-url";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createSignedContractUploadLink(
  registrationId: string
): Promise<
  | { success: true; uploadUrl: string }
  | { success: false; message: string }
> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!UUID_REGEX.test(registrationId)) {
    return { success: false, message: "Neteisingas registracijos identifikatorius." };
  }

  const tokenResult = await generateSignedContractUploadToken(registrationId);
  if (!tokenResult.success) {
    return { success: false, message: tokenResult.message };
  }

  return {
    success: true,
    uploadUrl: buildSignedContractUploadUrl(tokenResult.token),
  };
}
