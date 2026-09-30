import Link from "next/link";
import { CoachLogoutButton } from "@/components/coach/CoachLogoutButton";
import {
  getAssignedTrainingGroups,
  requireActiveCoach,
} from "@/lib/coach/auth";
import { getCurrentCoachRosterByGroup } from "@/lib/coach/roster";
import type { CoachRosterAthlete } from "@/lib/coach/roster";

export const dynamic = "force-dynamic";

function formatBirthDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  return value;
}

export default async function CoachDashboardPage() {
  const coach = await requireActiveCoach();
  const groups = await getAssignedTrainingGroups(coach.id);
  const roster = await getCurrentCoachRosterByGroup(groups.map((group) => group.id));

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
          {roster.error ? (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {roster.error}
            </p>
          ) : null}
          {groups.length === 0 ? (
            <p className="mt-3 text-sm text-gray-700">
              Jums dar nepriskirta treniruočių grupių.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-100">
              {groups.map((group) => (
                <li key={group.id} className="py-4 first:pt-0 last:pb-0">
                  <p className="font-medium text-gray-900">{group.name}</p>
                  <GroupAthleteList
                    athletes={roster.athletesByGroupId[group.id] ?? []}
                  />
                  <Link
                    href={`/treneris/grupe/${group.id}/lankomumas`}
                    className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-vtc-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-vtc-blue-800 active:bg-vtc-blue-900"
                  >
                    Žymėti lankomumą
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function GroupAthleteList({ athletes }: { athletes: CoachRosterAthlete[] }) {
  if (athletes.length === 0) {
    return (
      <p className="mt-2 text-sm text-gray-500">
        Šiuo metu grupėje nėra sportininkų.
      </p>
    );
  }

  return (
    <ul className="mt-2 space-y-1.5">
      {athletes.map((athlete) => (
        <li key={athlete.id} className="text-sm text-gray-700">
          <span className="font-medium text-gray-900">{athlete.childName}</span>
          {athlete.childBirthDate ? (
            <span className="text-gray-500">
              {" "}
              · {formatBirthDate(athlete.childBirthDate)}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
