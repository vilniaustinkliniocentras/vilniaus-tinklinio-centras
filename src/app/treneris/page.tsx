import { CoachLogoutButton } from "@/components/coach/CoachLogoutButton";
import {
  getAssignedTrainingGroups,
  requireActiveCoach,
} from "@/lib/coach/auth";

export const dynamic = "force-dynamic";

export default async function CoachDashboardPage() {
  const coach = await requireActiveCoach();
  const groups = await getAssignedTrainingGroups(coach.id);

  return (
    <div className="bg-vtc-gray-50 px-4 py-8 sm:px-8 sm:py-12">
      <div className="container-narrow mx-auto max-w-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">
              Trenerio zona
            </h1>
            <p className="mt-2 text-base text-gray-700">{coach.full_name}</p>
          </div>
          <CoachLogoutButton />
        </div>

        <section className="mt-8 rounded-xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Treniruočių grupės
          </h2>
          {groups.length === 0 ? (
            <p className="mt-3 text-sm text-gray-700">
              Jums dar nepriskirta treniruočių grupių.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-100">
              {groups.map((group) => (
                <li key={group.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-medium text-gray-900">{group.name}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
