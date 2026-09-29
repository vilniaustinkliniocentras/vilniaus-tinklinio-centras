import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export type InviteCoachInput = {
  email: string;
  fullName: string;
};

export type InviteCoachResult =
  | {
      success: true;
      coachId: string;
      invited: boolean;
      message: string;
    }
  | {
      success: false;
      message: string;
      recovery?: string;
    };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getInviteRedirectTo(): string {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://vilniaustinkliniocentras.lt"
  ).replace(/\/$/, "");
  return `${siteUrl}/auth/callback`;
}

function isAlreadyRegisteredError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already been registered") ||
    normalized.includes("already registered") ||
    normalized.includes("user already exists")
  );
}

async function findAuthUserIdByEmail(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  email: string
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error || !data?.users) {
    return null;
  }

  const match = data.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );
  return match?.id ?? null;
}

/**
 * Admin-only: invite a coach by email and link public.coaches.
 * Call only after isAdminAuthenticated(). Uses the service role on the server.
 *
 * Failure consistency:
 * If Auth invite creates a user but inserting public.coaches fails, this
 * function deletes the newly created Auth user. If that rollback also fails,
 * recovery is included in the result so the admin can retry (retry links the
 * existing Auth user) or insert public.coaches manually.
 */
export async function inviteCoach(
  input: InviteCoachInput
): Promise<InviteCoachResult> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();

  if (!fullName || !EMAIL_PATTERN.test(email)) {
    return {
      success: false,
      message: "Nurodykite galiojantį el. paštą ir trenerio vardą.",
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      success: false,
      message: "Supabase administracijos konfigūracija nebaigta.",
    };
  }

  const { data: existingCoach, error: existingCoachError } = await admin
    .from("coaches")
    .select("id, active")
    .eq("email", email)
    .maybeSingle();

  if (existingCoachError) {
    return { success: false, message: "Nepavyko patikrinti trenerio įrašo." };
  }

  if (existingCoach) {
    return {
      success: false,
      message: "Šis treneris jau yra sistemoje.",
    };
  }

  let authUserId: string;
  let createdAuthUserId: string | null = null;
  let invited = false;

  const invite = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role: "coach" },
    redirectTo: getInviteRedirectTo(),
  });

  if (invite.error || !invite.data.user?.id) {
    if (invite.error && isAlreadyRegisteredError(invite.error.message)) {
      const existingId = await findAuthUserIdByEmail(admin, email);
      if (!existingId) {
        return {
          success: false,
          message: "Auth paskyra su šiuo el. paštu jau yra, bet jos nepavyko rasti.",
        };
      }
      authUserId = existingId;
    } else {
      return {
        success: false,
        message: "Nepavyko išsiųsti kvietimo. Bandykite dar kartą.",
      };
    }
  } else {
    authUserId = invite.data.user.id;
    createdAuthUserId = invite.data.user.id;
    invited = true;
  }

  const { data: coach, error: insertError } = await admin
    .from("coaches")
    .insert({
      auth_user_id: authUserId,
      full_name: fullName,
      email,
      active: true,
    })
    .select("id")
    .single();

  if (insertError || !coach) {
    if (createdAuthUserId) {
      const { error: deleteError } =
        await admin.auth.admin.deleteUser(createdAuthUserId);
      if (deleteError) {
        console.error(
          "Coach invite rollback failed: Auth user created, coaches insert failed.",
          createdAuthUserId,
          insertError?.message,
          deleteError.message
        );
        return {
          success: false,
          message: "Kvietimas sukūrė Auth paskyrą, bet trenerio įrašo nepavyko išsaugoti.",
          recovery:
            "Pakartokite kvietimą tuo pačiu el. paštu – sistema bandys susieti esamą Auth paskyrą. Jei kartojimas nepavyksta, sukurkite public.coaches eilutę su šiuo auth_user_id per SQL.",
        };
      }
    }

    return {
      success: false,
      message: "Nepavyko sukurti trenerio įrašo.",
    };
  }

  if (invited) {
    return {
      success: true,
      coachId: coach.id,
      invited: true,
      message: "Kvietimas išsiųstas el. paštu. Treneris nustatys slaptažodį iš laiško.",
    };
  }

  return {
    success: true,
    coachId: coach.id,
    invited: false,
    message:
      "Trenerio įrašas susietas su esama Auth paskyra. Naujas kvietimo laiškas nesiųstas – jei treneris negali prisijungti, išsiųskite slaptažodžio atkūrimą per Supabase Authentication.",
  };
}
