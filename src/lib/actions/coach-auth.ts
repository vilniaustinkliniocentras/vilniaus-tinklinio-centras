"use server";

import { redirect } from "next/navigation";
import { getAuthenticatedCoach } from "@/lib/coach/auth";
import { createCoachServerClient } from "@/lib/supabase/coach-server";

const GENERIC_LOGIN_ERROR =
  "Nepavyko prisijungti. Patikrinkite el. paštą ir slaptažodį.";

export type CoachLoginResult =
  | { success: true }
  | { success: false; message: string };

export async function loginCoach(
  email: string,
  password: string
): Promise<CoachLoginResult> {
  const supabase = await createCoachServerClient();
  if (!supabase) {
    return {
      success: false,
      message: "Trenerio zona laikinai nepasiekiama. Bandykite vėliau.",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return { success: false, message: GENERIC_LOGIN_ERROR };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    return { success: false, message: GENERIC_LOGIN_ERROR };
  }

  const coach = await getAuthenticatedCoach();
  if (!coach) {
    await supabase.auth.signOut();
    return { success: false, message: GENERIC_LOGIN_ERROR };
  }

  return { success: true };
}

export async function logoutCoach(): Promise<void> {
  const supabase = await createCoachServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/treneris/prisijungti");
}
