const LOCAL_DEV_SITE_URL = "http://localhost:3000";

export function getSiteBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  return LOCAL_DEV_SITE_URL;
}

export function buildSignedContractUploadUrl(token: string): string {
  const normalizedToken = token.trim();
  return `${getSiteBaseUrl()}/sutartis/ikelti/${normalizedToken}`;
}
