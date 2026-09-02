export const SIGNED_CONTRACTS_BUCKET = "signed-contracts";

/** 10 MB – enough for a scanned multi-page signed PDF. */
export const SIGNED_CONTRACT_MAX_BYTES = 10 * 1024 * 1024;

export const SIGNED_CONTRACT_ALLOWED_MIME = "application/pdf";

/** Default expiry for admin download signed URLs (1 hour). */
export const SIGNED_CONTRACT_DOWNLOAD_URL_TTL_SECONDS = 60 * 60;
