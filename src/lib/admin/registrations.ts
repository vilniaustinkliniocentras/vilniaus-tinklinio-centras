import { createAdminClient } from "@/lib/supabase/admin";
import type { Registration } from "@/types/database";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function fetchRegistrationById(id: string): Promise<Registration | null> {
  if (!UUID_REGEX.test(id)) {
    return null;
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Registration;
}

export async function markContractSent(
  id: string,
  email: string
): Promise<{ success: true; contractSentAt: string; contractSentTo: string } | { success: false; message: string }> {
  if (!UUID_REGEX.test(id)) {
    return { success: false, message: "Neteisingas registracijos identifikatorius." };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      success: false,
      message: "Supabase administracijos konfigūracija nebaigta.",
    };
  }

  const sentAt = new Date().toISOString();
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("registrations")
    .update({
      contract_sent_at: sentAt,
      contract_sent_to: normalizedEmail,
    })
    .eq("id", id)
    .select("contract_sent_at, contract_sent_to")
    .maybeSingle();

  if (error || !data?.contract_sent_at || !data.contract_sent_to) {
    console.error("Failed to mark contract as sent:", error?.message ?? "No rows updated");
    return {
      success: false,
      message: "Sutartis išsiųsta, bet nepavyko užfiksuoti išsiuntimo datos.",
    };
  }

  return {
    success: true,
    contractSentAt: data.contract_sent_at,
    contractSentTo: data.contract_sent_to,
  };
}
