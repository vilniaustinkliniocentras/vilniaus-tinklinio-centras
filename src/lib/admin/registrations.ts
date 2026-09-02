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
