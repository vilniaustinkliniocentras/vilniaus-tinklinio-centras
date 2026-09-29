import { CoachLoginForm } from "@/components/coach/CoachLoginForm";
import { getAuthenticatedCoach } from "@/lib/coach/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CoachLoginPage() {
  const coach = await getAuthenticatedCoach();
  if (coach) {
    redirect("/treneris");
  }

  return (
    <div className="bg-vtc-gray-50 px-4 py-10 sm:px-8 sm:py-16">
      <div className="container-narrow mx-auto max-w-lg">
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Trenerio zona
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Prisijunkite savo trenerio paskyra.
        </p>
        <div className="mt-8 rounded-xl bg-white p-5 shadow-sm sm:p-6">
          <CoachLoginForm />
        </div>
      </div>
    </div>
  );
}
