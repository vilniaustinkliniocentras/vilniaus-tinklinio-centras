import { createClient } from "@/lib/supabase/client";
import { getPreferredTrainingTimes } from "@/lib/constants/training-groups";
import {
  hasErrors,
  validateRegistrationForm,
  type FormErrors,
  type RegistrationFormData,
} from "@/lib/validation/registration";

export type SubmitRegistrationResult =
  | { success: true }
  | { success: false; errors?: FormErrors; message: string };

export async function submitRegistration(
  data: RegistrationFormData
): Promise<SubmitRegistrationResult> {
  const errors = validateRegistrationForm(data);

  if (hasErrors(errors)) {
    return {
      success: false,
      errors,
      message: "Patikrinkite formos laukus ir bandykite dar kartą.",
    };
  }

  const supabase = createClient();
  if (!supabase) {
    return {
      success: false,
      message:
        "Registracijos sistema laikinai nepasiekiama. Susisiekite su klubu tiesiogiai.",
    };
  }

  const normalizedPhone = data.phone.replace(/\s/g, "");

  const { error } = await supabase.from("registrations").insert({
    parent_name: data.parentName.trim(),
    parent_email: data.email.trim().toLowerCase(),
    parent_phone: normalizedPhone,
    child_name: data.childName.trim(),
    child_birth_date: data.childBirthDate,
    volleyball_experience: data.experience,
    training_group: data.trainingGroup,
    preferred_training_times: getPreferredTrainingTimes(data.trainingGroup),
    referral_source: data.referralSource,
    additional_comments: data.comments.trim() || null,
    privacy_consent: data.privacyConsent,
    status: "new",
  });

  if (error) {
    console.error("Registration insert failed:", error.message);
    return {
      success: false,
      message:
        "Nepavyko pateikti registracijos. Bandykite dar kartą arba susisiekite su mumis.",
    };
  }

  return { success: true };
}
