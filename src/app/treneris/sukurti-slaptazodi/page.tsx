import { redirect } from "next/navigation";
import { CoachSetupPasswordForm } from "@/components/coach/CoachSetupPasswordForm";
import { createCoachServerClient } from "@/lib/supabase/coach-server";

export const dynamic = "force-dynamic";

/**
 * Invite password setup. Requires an authenticated Supabase user session
 * (validated by Auth on the invitation link). An already signed-in coach
 * who opens this route can also change their own password; first-time
 * invite vs existing account is not stored as extra app state.
 */
export default async function CoachSetupPasswordPage() {
  const supabase = await createCoachServerClient();
  let hasSession = false;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    hasSession = Boolean(user);
  }

  if (!hasSession) {
    redirect("/treneris/prisijungti");
  }

  return (
    <div className="bg-vtc-gray-50 px-4 py-10 sm:px-8 sm:py-16">
      <div className="container-narrow mx-auto max-w-lg">
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Susikurkite slaptažodį
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Sukurkite slaptažodį, kurį naudosite prisijungdami prie trenerio
          paskyros.
        </p>
        <div className="mt-8 rounded-xl bg-white p-5 shadow-sm sm:p-6">
          <CoachSetupPasswordForm />
        </div>
      </div>
    </div>
  );
}
