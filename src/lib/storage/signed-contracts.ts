import { fetchRegistrationById } from "@/lib/admin/registrations";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SIGNED_CONTRACT_DOWNLOAD_URL_TTL_SECONDS,
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
