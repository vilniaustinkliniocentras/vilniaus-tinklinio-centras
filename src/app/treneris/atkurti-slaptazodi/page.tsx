import Link from "next/link";
import { CoachResetPasswordForm } from "@/components/coach/CoachResetPasswordForm";
import { createCoachServerClient } from "@/lib/supabase/coach-server";

export const dynamic = "force-dynamic";

export default async function CoachResetPasswordPage() {
  const supabase = await createCoachServerClient();
  let hasSession = false;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    hasSession = Boolean(user);
  }

  return (
    <div className="bg-vtc-gray-50 px-4 py-10 sm:px-8 sm:py-16">
      <div className="container-narrow mx-auto max-w-lg">
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Naujas slaptažodis
        </h1>
        {hasSession ? (
          <>
            <p className="mt-2 text-sm text-gray-500">
              Įveskite naują trenerio paskyros slaptažodį.
            </p>
            <div className="mt-8 rounded-xl bg-white p-5 shadow-sm sm:p-6">
              <CoachResetPasswordForm />
            </div>
          </>
        ) : (
          <div className="mt-8 rounded-xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-gray-700" role="status">
              Slaptažodžio atkūrimo nuoroda negalioja arba jos galiojimo
              laikas baigėsi.
            </p>
            <Link
              href="/treneris/prisijungti"
              className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-vtc-blue-700 hover:text-vtc-blue-800"
            >
              Grįžti į prisijungimą
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
