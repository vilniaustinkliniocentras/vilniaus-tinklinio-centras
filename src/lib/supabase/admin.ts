import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdminCredentials() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, serviceRoleKey };
}

/**
 * Server-only Supabase client with service role key.
 * NEVER import this in client components.
 * Bypasses RLS – use only in protected admin server code.
 */
export function createAdminClient() {
  const credentials = getAdminCredentials();
  if (!credentials) return null;

  return createSupabaseClient(
    credentials.supabaseUrl,
    credentials.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Server-only PATCH via Supabase REST API using the service role key.
 * Verifies that exactly one row was updated.
 */
export async function adminUpdateRegistrationStatus(
  id: string,
  status: string
): Promise<{ success: true; status: string } | { success: false; message: string }> {
  const credentials = getAdminCredentials();
  if (!credentials) {
    return {
      success: false,
      message: "Supabase administracijos konfigūracija nebaigta.",
    };
  }

  const { supabaseUrl, serviceRoleKey } = credentials;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/registrations?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({ status }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Admin status update failed:", response.status, errorBody);
    return {
      success: false,
      message: `Nepavyko atnaujinti statuso (${response.status}).`,
    };
  }

  const rows = (await response.json()) as { id: string; status: string }[];

  if (!Array.isArray(rows) || rows.length === 0) {
    console.error("Admin status update returned no rows for id:", id);
    return {
      success: false,
      message: "Registracija nerasta arba statusas nebuvo atnaujintas.",
    };
  }

  return { success: true, status: rows[0].status };
}
