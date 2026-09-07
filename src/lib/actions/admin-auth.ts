"use server";

import { cookies } from "next/headers";
import { adminFetchRegistrations } from "@/lib/supabase/admin";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_VALUE,
  adminCookieClearOptions,
  adminCookieOptions,
  isAdminAuthenticated,
} from "@/lib/admin/auth";
import type { Registration } from "@/types/database";

export async function loginAdmin(password: string): Promise<{ success: boolean; message: string }> {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return {
      success: false,
      message: "ADMIN_PASSWORD aplinkos kintamasis nenustatytas.",
    };
  }

  if (password !== adminPassword) {
    return {
      success: false,
      message: "Neteisingas slaptažodis.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, ADMIN_COOKIE_VALUE, adminCookieOptions);

  return { success: true, message: "Prisijungta." };
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", adminCookieClearOptions);
}

export async function getRegistrations(): Promise<{
  data: Registration[] | null;
  error: string | null;
}> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { data: null, error: "Neturite prieigos." };
  }

  const result = await adminFetchRegistrations();
  if (!result.success) {
    return { data: null, error: result.message };
  }

  return { data: result.data, error: null };
}
