import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Registration } from "@/types/database";

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

function normalizeRegistration(row: Registration): Registration {
  return {
    ...row,
    is_waitlist: row.is_waitlist === true,
  };
}

/**
 * Server-only SELECT via Supabase REST API using the service role key.
 * Uses fetch directly to avoid local JWT clock-skew validation in supabase-js.
 */
export async function adminFetchRegistrations(): Promise<
  { success: true; data: Registration[] } | { success: false; message: string }
> {
  const credentials = getAdminCredentials();
  if (!credentials) {
    return {
      success: false,
      message: "Supabase administracijos konfigūracija nebaigta.",
    };
  }

  const { supabaseUrl, serviceRoleKey } = credentials;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/registrations?select=*&order=created_at.desc`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to fetch registrations:", response.status, errorBody);
    return {
      success: false,
      message: "Nepavyko gauti registracijų.",
    };
  }

  const rows = (await response.json()) as Registration[];

  if (!Array.isArray(rows)) {
    console.error("Failed to fetch registrations: unexpected response shape");
    return {
      success: false,
      message: "Nepavyko gauti registracijų.",
    };
  }

  return {
    success: true,
    data: rows.map(normalizeRegistration),
  };
}
