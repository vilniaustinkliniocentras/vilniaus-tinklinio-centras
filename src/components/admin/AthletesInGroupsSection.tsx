"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { moveAthleteAction, stopAthleteAction } from "@/lib/actions/admin-athletes";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { AdminGroupOption, AdminRosterAthlete, DbTrainingGroup } from "@/types/database";

function formatDate(dateString: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  return new Date(dateString).toLocaleDateString("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function Feedback({
  message,
  tone,
}: {
  message: string | null;
  tone: "success" | "error" | null;
}) {
  if (!message || !tone) {
    return null;
  }

  return (
    <p
      className={`text-sm ${tone === "success" ? "text-green-700" : "text-red-600"}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {message}
    </p>
  );
}

export function AthletesInGroupsSection({
  groups,
  roster,
  rosterError,
}: {
  groups: DbTrainingGroup[];
  roster: AdminRosterAthlete[];
  rosterError: string | null;
}) {
  const activeGroups = useMemo(
    () =>
      groups
        .filter((group) => group.active)
        .map((group): AdminGroupOption => ({ id: group.id, name: group.name })),
    [groups]
  );

  const grouped = useMemo(() => {
    const byGroup = new Map<
      string,
      { groupId: string; groupName: string; groupActive: boolean; athletes: AdminRosterAthlete[] }
    >();

    for (const group of groups.filter((entry) => entry.active)) {
      byGroup.set(group.id, {
        groupId: group.id,
        groupName: group.name,
        groupActive: true,
        athletes: [],
      });
    }

    for (const athlete of roster) {
      const existing = byGroup.get(athlete.groupId);
      if (existing) {
        existing.athletes.push(athlete);
        continue;
      }

      byGroup.set(athlete.groupId, {
        groupId: athlete.groupId,
        groupName: athlete.groupName,
        groupActive: athlete.groupActive,
        athletes: [athlete],
      });
    }

    return Array.from(byGroup.values()).sort((a, b) =>
      a.groupName.localeCompare(b.groupName, "lt")
    );
  }, [groups, roster]);

  return (
    <section
      className="rounded-xl border border-vtc-gray-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="athletes-in-groups-heading"
    >
      <h2 id="athletes-in-groups-heading" className="text-lg font-semibold text-gray-900">
        Sportininkai grupėse
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Dabartinės narystės pagal operacines grupes. Perkėlimas ir sustabdymas keičia tik
        lankančiųjų sąrašą — registracijos ir istorija neištrinamos.
      </p>

      {rosterError ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {rosterError}
        </p>
      ) : grouped.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">
          Aktyvių operacinių grupių dar nėra. Pirmiausia sukurkite grupę.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {grouped.map((group) => (
            <article
              key={group.groupId}
              className="rounded-lg border border-vtc-gray-200 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-gray-900">{group.groupName}</h3>
                {!group.groupActive ? (
                  <span className="text-xs text-gray-500">(neaktyvi)</span>
                ) : null}
                <span className="text-xs text-gray-500">
                  {group.athletes.length}{" "}
                  {group.athletes.length === 1 ? "sportininkas" : "sportininkai"}
                </span>
              </div>

              {group.athletes.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">Šioje grupėje lankančiųjų nėra.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {group.athletes.map((athlete) => (
                    <li key={athlete.athleteId}>
                      <RosterAthleteCard
                        athlete={athlete}
                        activeGroups={activeGroups}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function RosterAthleteCard({
  athlete,
  activeGroups,
}: {
  athlete: AdminRosterAthlete;
  activeGroups: AdminGroupOption[];
}) {
  const router = useRouter();
  const [targetGroupId, setTargetGroupId] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(
    null
  );

  const destinationGroups = activeGroups.filter((group) => group.id !== athlete.groupId);
  const busy = isMoving || isStopping;

  async function handleMove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!targetGroupId || busy) {
      return;
    }

    setIsMoving(true);
    setFeedback(null);
    const result = await moveAthleteAction(athlete.athleteId, targetGroupId);
    setIsMoving(false);
    setFeedback({
      message: result.message,
      tone: result.success ? "success" : "error",
    });
    if (result.success) {
      setTargetGroupId("");
      router.refresh();
    }
  }

  async function handleStop() {
    if (busy) {
      return;
    }

    setIsStopping(true);
    setFeedback(null);
    const result = await stopAthleteAction(athlete.athleteId);
    setIsStopping(false);
    setConfirmStop(false);
    setFeedback({
      message: result.message,
      tone: result.success ? "success" : "error",
    });
    if (result.success) {
      router.refresh();
    }
  }

  return (
    <article className="rounded-md bg-vtc-gray-50 p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium text-gray-900">{athlete.childName}</p>
          <p className="text-sm text-gray-600">
            Gimimo data: {formatDate(athlete.childBirthDate)}
          </p>
          <p className="text-sm text-gray-600">Dabartinė grupė: {athlete.groupName}</p>
          <p className="text-sm text-gray-600">
            Narystė nuo: {formatDate(athlete.membershipStartsOn)}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-3 border-t border-vtc-gray-200 pt-3">
        {destinationGroups.length === 0 ? (
          <p className="text-sm text-gray-500">Nėra kitos aktyvios grupės perkėlimui.</p>
        ) : (
          <form onSubmit={handleMove} className="space-y-3">
            <Select
              id={`move-group-${athlete.athleteId}`}
              label="Perkelti į kitą grupę"
              value={targetGroupId}
              onChange={(event) => setTargetGroupId(event.target.value)}
              disabled={busy}
              options={destinationGroups.map((group) => ({
                value: group.id,
                label: group.name,
              }))}
              placeholder="Pasirinkite grupę"
            />
            <Button type="submit" size="sm" disabled={busy || !targetGroupId}>
              {isMoving ? "Perkeliama..." : "Perkelti į kitą grupę"}
            </Button>
          </form>
        )}

        {confirmStop ? (
          <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">
              Sustabdyti {athlete.childName} lankymą? Registracija ir istorija liks, bet vaikas
              nebebus lankančiųjų sąraše.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void handleStop()}
              >
                {isStopping ? "Stabdoma..." : "Taip, sustabdyti"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmStop(false)}
              >
                Atšaukti
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => setConfirmStop(true)}
          >
            Sustabdyti lankymą
          </Button>
        )}

        <Feedback message={feedback?.message ?? null} tone={feedback?.tone ?? null} />
      </div>
    </article>
  );
}
