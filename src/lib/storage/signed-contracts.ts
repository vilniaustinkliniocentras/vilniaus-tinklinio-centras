import { fetchRegistrationById } from "@/lib/admin/registrations";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SIGNED_CONTRACT_DOWNLOAD_URL_TTL_SECONDS,
  SIGNED_CONTRACT_MAX_BYTES,
  SIGNED_CONTRACTS_BUCKET,
} from "@/lib/storage/signed-contract-config";
import {
  buildSignedContractStoragePath,
  getSignedContractUploadOptions,
  isSignedContractStoragePathForRegistration,
  validateSignedContractPdf,
} from "@/lib/storage/signed-contract-validation";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type UploadSignedContractResult =
  | {
      success: true;
      registrationId: string;
      path: string;
      uploadedAt: string;
    }
  | { success: false; message: string };

export type SaveSignedContractMetadataResult =
  | {
      success: true;
      registrationId: string;
      path: string;
      uploadedAt: string;
    }
  | { success: false; message: string };

export type SignedContractDownloadUrlResult =
  | { success: true; url: string; expiresInSeconds: number }
  | { success: false; message: string };

export function isSignedContractUploaded(registration: {
  signed_contract_path?: string | null;
  signed_contract_uploaded_at?: string | null;
}): boolean {
  return Boolean(
    registration.signed_contract_path?.trim() ||
      registration.signed_contract_uploaded_at
  );
}

async function removeSignedContractFile(storagePath: string): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.storage
    .from(SIGNED_CONTRACTS_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error("Failed to remove previous signed contract file:", error.message);
  }
}

export async function uploadSignedContractForRegistration(
  registrationId: string,
  file: Buffer
): Promise<UploadSignedContractResult> {
  if (!UUID_REGEX.test(registrationId)) {
    return { success: false, message: "Neteisingas registracijos identifikatorius." };
  }

  const registration = await fetchRegistrationById(registrationId);
  if (!registration) {
    return { success: false, message: "Registracija nerasta." };
  }

  const validation = validateSignedContractPdf(file);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      success: false,
      message: "Supabase administracijos konfigūracija nebaigta.",
    };
  }

  const storagePath = buildSignedContractStoragePath(registrationId);
  const uploadOptions = getSignedContractUploadOptions();

  const { error: uploadError } = await supabase.storage
    .from(SIGNED_CONTRACTS_BUCKET)
    .upload(storagePath, file, uploadOptions);

  if (uploadError) {
    console.error("Signed contract upload failed:", uploadError.message);
    return {
      success: false,
      message: "Nepavyko įkelti pasirašytos sutarties.",
    };
  }

  const metadataResult = await saveSignedContractMetadata(registrationId, storagePath);
  if (!metadataResult.success) {
    await removeSignedContractFile(storagePath);
    return metadataResult;
  }

  if (
    registration.signed_contract_path &&
    registration.signed_contract_path !== storagePath
  ) {
    await removeSignedContractFile(registration.signed_contract_path);
  }

  return {
    success: true,
    registrationId,
    path: metadataResult.path,
    uploadedAt: metadataResult.uploadedAt,
  };
}

export type SignedContractUploadTarget =
  | {
      success: true;
      registrationId: string;
      path: string;
      token: string;
      signedUrl: string;
    }
  | { success: false; message: string };

/**
 * Creates a short-lived Storage signed upload URL so the PDF never travels
 * through the Next.js/Vercel request body (1 MB Server Action default, 4.5 MB
 * Vercel limit). Token, private bucket, and admin download stay unchanged.
 */
export async function createSignedContractUploadTarget(
  registrationId: string
): Promise<SignedContractUploadTarget> {
  try {
    if (!UUID_REGEX.test(registrationId)) {
      return { success: false, message: "Neteisingas registracijos identifikatorius." };
    }

    const registration = await fetchRegistrationById(registrationId);
    if (!registration) {
      return { success: false, message: "Registracija nerasta." };
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return {
        success: false,
        message: "Supabase administracijos konfigūracija nebaigta.",
      };
    }

    const storagePath = buildSignedContractStoragePath(registrationId);
    const { data, error } = await supabase.storage
      .from(SIGNED_CONTRACTS_BUCKET)
      .createSignedUploadUrl(storagePath, { upsert: false });

    if (error || !data?.signedUrl || !data.token || !data.path) {
      console.error("Failed to create signed contract upload URL:", error?.message);
      return {
        success: false,
        message: "Nepavyko paruošti pasirašytos sutarties įkėlimo.",
      };
    }

    return {
      success: true,
      registrationId,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
    };
  } catch (error) {
    console.error("Failed to create signed contract upload target:", error);
    return {
      success: false,
      message: "Nepavyko paruošti pasirašytos sutarties įkėlimo.",
    };
  }
}

export async function finalizeSignedContractUpload(
  registrationId: string,
  storagePath: string
): Promise<UploadSignedContractResult> {
  try {
    if (!UUID_REGEX.test(registrationId)) {
      return { success: false, message: "Neteisingas registracijos identifikatorius." };
    }

    if (!isSignedContractStoragePathForRegistration(registrationId, storagePath)) {
      return { success: false, message: "Neteisingas pasirašytos sutarties kelias." };
    }

    const registration = await fetchRegistrationById(registrationId);
    if (!registration) {
      return { success: false, message: "Registracija nerasta." };
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return {
        success: false,
        message: "Supabase administracijos konfigūracija nebaigta.",
      };
    }

    const { data: objectInfo, error: infoError } = await supabase.storage
      .from(SIGNED_CONTRACTS_BUCKET)
      .info(storagePath);

    if (infoError || !objectInfo) {
      console.error(
        "Signed contract object missing after browser upload:",
        infoError?.message
      );
      return {
        success: false,
        message: "Nepavyko įkelti pasirašytos sutarties.",
      };
    }

    if (typeof objectInfo.size === "number" && objectInfo.size === 0) {
      await removeSignedContractFile(storagePath);
      return { success: false, message: "Failas tuščias." };
    }

    if (typeof objectInfo.size === "number" && objectInfo.size > SIGNED_CONTRACT_MAX_BYTES) {
      await removeSignedContractFile(storagePath);
      return {
        success: false,
        message: `Failas per didelis. Maksimalus dydis: ${Math.round(SIGNED_CONTRACT_MAX_BYTES / (1024 * 1024))} MB.`,
      };
    }

    const metadataResult = await saveSignedContractMetadata(registrationId, storagePath);
    if (!metadataResult.success) {
      await removeSignedContractFile(storagePath);
      return metadataResult;
    }

    if (
      registration.signed_contract_path &&
      registration.signed_contract_path !== storagePath
    ) {
      await removeSignedContractFile(registration.signed_contract_path);
    }

    return {
      success: true,
      registrationId,
      path: metadataResult.path,
      uploadedAt: metadataResult.uploadedAt,
    };
  } catch (error) {
    console.error("Failed to finalize signed contract upload:", error);
    return {
      success: false,
      message: "Nepavyko įkelti pasirašytos sutarties.",
    };
  }
}

export async function saveSignedContractMetadata(
  registrationId: string,
  storagePath: string,
  uploadedAt: string = new Date().toISOString()
): Promise<SaveSignedContractMetadataResult> {
  if (!UUID_REGEX.test(registrationId)) {
    return { success: false, message: "Neteisingas registracijos identifikatorius." };
  }

  if (!isSignedContractStoragePathForRegistration(registrationId, storagePath)) {
    return { success: false, message: "Neteisingas pasirašytos sutarties kelias." };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      success: false,
      message: "Supabase administracijos konfigūracija nebaigta.",
    };
  }

  const { data, error } = await supabase
    .from("registrations")
    .update({
      signed_contract_path: storagePath.trim(),
      signed_contract_uploaded_at: uploadedAt,
    })
    .eq("id", registrationId)
    .select("id, signed_contract_path, signed_contract_uploaded_at")
    .maybeSingle();

  if (error || !data?.signed_contract_path || !data.signed_contract_uploaded_at) {
    console.error(
      "Failed to save signed contract metadata:",
      error?.message ?? "No rows updated"
    );
    return {
      success: false,
      message: "Nepavyko išsaugoti pasirašytos sutarties metaduomenų.",
    };
  }

  return {
    success: true,
    registrationId: data.id,
    path: data.signed_contract_path,
    uploadedAt: data.signed_contract_uploaded_at,
  };
}

export async function createSignedContractDownloadUrl(
  registrationId: string,
  expiresInSeconds: number = SIGNED_CONTRACT_DOWNLOAD_URL_TTL_SECONDS
): Promise<SignedContractDownloadUrlResult> {
  if (!UUID_REGEX.test(registrationId)) {
    return { success: false, message: "Neteisingas registracijos identifikatorius." };
  }

  const registration = await fetchRegistrationById(registrationId);
  if (!registration?.signed_contract_path) {
    return { success: false, message: "Pasirašyta sutartis nerasta." };
  }

  if (
    !isSignedContractStoragePathForRegistration(
      registrationId,
      registration.signed_contract_path
    )
  ) {
    return { success: false, message: "Neteisingas pasirašytos sutarties kelias." };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      success: false,
      message: "Supabase administracijos konfigūracija nebaigta.",
    };
  }

  const { data, error } = await supabase.storage
    .from(SIGNED_CONTRACTS_BUCKET)
    .createSignedUrl(registration.signed_contract_path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error("Failed to create signed contract download URL:", error?.message);
    return {
      success: false,
      message: "Nepavyko sugeneruoti atsisiuntimo nuorodos.",
    };
  }

  return {
    success: true,
    url: data.signedUrl,
    expiresInSeconds,
  };
}
