"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      data: null,
      error: "Supabase administracijos konfigūracija nebaigta. Patikrinkite SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const { data, error } = await supabase
    .from("registrations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch registrations:", error.message);
    return { data: null, error: "Nepavyko gauti registracijų." };
  }

  return { data: data as Registration[], error: null };
}
