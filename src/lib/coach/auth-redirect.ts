export const COACH_RESET_PASSWORD_PATH = "/treneris/atkurti-slaptazodi";

export function getCoachSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://vilniaustinkliniocentras.lt"
  ).replace(/\/$/, "");
}

export function getCoachAuthCallbackUrl(nextPath?: string): string {
  const base = `${getCoachSiteUrl()}/auth/callback`;
  if (nextPath) {
    return `${base}?next=${encodeURIComponent(nextPath)}`;
  }
  return base;
}

export function getPasswordRecoveryRedirectTo(): string {
  return getCoachAuthCallbackUrl(COACH_RESET_PASSWORD_PATH);
}
