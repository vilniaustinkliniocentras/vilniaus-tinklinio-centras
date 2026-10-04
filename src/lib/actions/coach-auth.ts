"use server";

import { redirect } from "next/navigation";
import { getPasswordRecoveryRedirectTo } from "@/lib/coach/auth-redirect";
import { getAuthenticatedCoach } from "@/lib/coach/auth";
import { validateCoachPasswordPair } from "@/lib/coach/password-validation";
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

const GENERIC_PASSWORD_RESET_REQUEST_SUCCESS =
  "Jei paskyra su šiuo el. paštu egzistuoja, išsiuntėme slaptažodžio atkūrimo nuorodą.";

export type CoachPasswordResetRequestResult = {
  success: true;
  message: string;
};

export async function requestCoachPasswordReset(
  email: string
): Promise<CoachPasswordResetRequestResult> {
  const supabase = await createCoachServerClient();
  const normalizedEmail = email.trim().toLowerCase();

  if (supabase && normalizedEmail) {
    await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getPasswordRecoveryRedirectTo(),
    });
  }

  return {
    success: true,
    message: GENERIC_PASSWORD_RESET_REQUEST_SUCCESS,
  };
}

export type CoachPasswordUpdateResult =
  | { success: true }
  | { success: false; message: string };

export async function updateCoachPasswordAfterRecovery(
  password: string,
  confirmPassword: string
): Promise<CoachPasswordUpdateResult> {
  const validationError = validateCoachPasswordPair(password, confirmPassword);
  if (validationError) {
    return { success: false, message: validationError };
  }

  const supabase = await createCoachServerClient();
  if (!supabase) {
    return {
      success: false,
      message: "Trenerio zona laikinai nepasiekiama. Bandykite vėliau.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message:
        "Slaptažodžio atkūrimo nuoroda negalioja arba jos galiojimo laikas baigėsi.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      success: false,
      message: "Nepavyko išsaugoti slaptažodžio. Bandykite dar kartą.",
    };
  }

  await supabase.auth.signOut();
  redirect("/treneris/prisijungti?slaptazodis=atnaujintas");
}
