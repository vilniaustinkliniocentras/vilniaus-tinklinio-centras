export const COACH_DASHBOARD_PATH = "/treneris";
export const COACH_SETUP_PASSWORD_PATH = "/treneris/sukurti-slaptazodi";
export const COACH_RESET_PASSWORD_PATH = "/treneris/atkurti-slaptazodi";

const SAFE_COACH_AUTH_NEXT_PATHS = new Set([
  COACH_DASHBOARD_PATH,
  COACH_SETUP_PASSWORD_PATH,
  COACH_RESET_PASSWORD_PATH,
]);

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

export function getInviteRedirectTo(): string {
  return getCoachAuthCallbackUrl(COACH_SETUP_PASSWORD_PATH);
}

export function getSafeCoachAuthNextPath(value: string | null): string {
  if (value && SAFE_COACH_AUTH_NEXT_PATHS.has(value)) {
    return value;
  }

  return COACH_DASHBOARD_PATH;
}
