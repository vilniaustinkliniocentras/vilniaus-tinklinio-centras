"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Registration } from "@/types/database";

const ADMIN_COOKIE = "vtc_admin_auth";

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
  cookieStore.set(ADMIN_COOKIE, "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 60 * 60 * 8,
  });

  return { success: true, message: "Prisijungta." };
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 0,
  });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === "authenticated";
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
