import { createHash, randomBytes } from "crypto";
import { fetchRegistrationById } from "@/lib/admin/registrations";
import { createAdminClient } from "@/lib/supabase/admin";

export const SIGNED_CONTRACT_UPLOAD_TOKEN_BYTES = 32;
export const SIGNED_CONTRACT_UPLOAD_TOKEN_TTL_DAYS = 30;
export const SIGNED_CONTRACT_UPLOAD_TOKEN_TTL_MS =
  SIGNED_CONTRACT_UPLOAD_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

/** base64url-encoded 32-byte token (43 characters, no padding). */
export const SIGNED_CONTRACT_UPLOAD_TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;

export interface SignedContractUploadContext {
  registrationId: string;
  childName: string;
}

export function generateSignedContractUploadTokenValue(): string {
  return randomBytes(SIGNED_CONTRACT_UPLOAD_TOKEN_BYTES).toString("base64url");
}

export function hashSignedContractUploadToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isValidSignedContractUploadTokenFormat(token: string): boolean {
  const normalized = token.trim();
  return SIGNED_CONTRACT_UPLOAD_TOKEN_REGEX.test(normalized);
}

function normalizeUploadToken(token: string): string | null {
  const normalized = token.trim();
  if (!isValidSignedContractUploadTokenFormat(normalized)) {
    return null;
  }

  return normalized;
}

function isUploadTokenExpired(createdAt: string): boolean {
  const createdAtMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdAtMs)) {
    return true;
  }

  return Date.now() - createdAtMs > SIGNED_CONTRACT_UPLOAD_TOKEN_TTL_MS;
}

export async function fetchSignedContractUploadContextByToken(
  token: string
): Promise<SignedContractUploadContext | null> {
  const normalizedToken = normalizeUploadToken(token);
  if (!normalizedToken) {
    return null;
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return null;
  }

  const tokenHash = hashSignedContractUploadToken(normalizedToken);

  const { data, error } = await supabase
    .from("registrations")
    .select("id, child_name, signed_contract_upload_token_created_at")
    .eq("signed_contract_upload_token_hash", tokenHash)
    .maybeSingle();

  if (error || !data?.signed_contract_upload_token_created_at) {
    return null;
  }

  if (isUploadTokenExpired(data.signed_contract_upload_token_created_at)) {
    return null;
  }

  return {
    registrationId: data.id,
    childName: data.child_name.trim(),
  };
}

export async function generateSignedContractUploadToken(
  registrationId: string
): Promise<
  | { success: true; token: string; createdAt: string }
  | { success: false; message: string }
> {
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

  const token = generateSignedContractUploadTokenValue();
  const tokenHash = hashSignedContractUploadToken(token);
  const createdAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("registrations")
    .update({
      signed_contract_upload_token_hash: tokenHash,
      signed_contract_upload_token_created_at: createdAt,
    })
    .eq("id", registrationId)
    .select("signed_contract_upload_token_created_at")
    .maybeSingle();

  if (error || !data?.signed_contract_upload_token_created_at) {
    console.error(
      "Failed to generate signed contract upload token:",
      error?.message ?? "No rows updated"
    );
    return {
      success: false,
      message: "Nepavyko sugeneruoti įkėlimo nuorodos.",
    };
  }

  return {
    success: true,
    token,
    createdAt: data.signed_contract_upload_token_created_at,
  };
}

export async function invalidateSignedContractUploadToken(
  registrationId: string
): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from("registrations")
    .update({
      signed_contract_upload_token_hash: null,
      signed_contract_upload_token_created_at: null,
    })
    .eq("id", registrationId);

  if (error) {
    console.error("Failed to invalidate signed contract upload token:", error.message);
  }
}
