import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "vtc_admin_auth";
export const ADMIN_COOKIE_VALUE = "authenticated";

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 8,
};

export const adminCookieClearOptions = {
  ...adminCookieOptions,
  maxAge: 0,
};

function isAdminCookieValue(value: string | undefined): boolean {
  return value === ADMIN_COOKIE_VALUE;
}

export function isAdminAuthenticatedFromRequest(request: NextRequest): boolean {
  if (!process.env.ADMIN_PASSWORD) {
    return false;
  }

  return isAdminCookieValue(request.cookies.get(ADMIN_COOKIE)?.value);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) {
    return false;
  }

  const cookieStore = await cookies();
  return isAdminCookieValue(cookieStore.get(ADMIN_COOKIE)?.value);
}
