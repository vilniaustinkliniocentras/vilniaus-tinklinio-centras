"use client";

import { useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { attendanceStatusLabels } from "@/lib/constants/attendance";
import type { AttendanceStatus } from "@/lib/constants/attendance";
import { formatIsoDateDisplay } from "@/lib/coach/dates";

export type AdminAttendanceGroupOption = {
  id: string;
  name: string;
  active: boolean;
};

export type AdminAttendanceAthleteRow = {
  athleteId: string;
  childName: string;
  childBirthDate: string | null;
  status: AttendanceStatus | null;
};

function statusLabel(status: AttendanceStatus | null): string {
  if (!status) {
    return "Nepažymėta";
  }

  return attendanceStatusLabels[status];
}

function statusClassName(status: AttendanceStatus | null): string {
  if (status === "present") {
    return "bg-green-50 text-green-800 ring-green-600/20";
  }
  if (status === "absent") {
    return "bg-red-50 text-red-800 ring-red-600/20";
  }
  if (status === "excused") {
    return "bg-amber-50 text-amber-900 ring-amber-600/20";
  }

  return "bg-gray-100 text-gray-600 ring-gray-500/20";
}

function groupLabel(group: AdminAttendanceGroupOption): string {
  return group.active ? group.name : `${group.name} (neaktyvi)`;
}

function formatMarkedAt(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("lt-LT", {
    timeZone: "Europe/Vilnius",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function attendanceUrl(groupId: string | null, sessionDate: string): string {
  const params = new URLSearchParams();
  params.set("data", sessionDate);
  if (groupId) {
    params.set("grupe", groupId);
  }
  return `/admin/lankomumas?${params.toString()}`;
}

export function AttendanceAdminPanel({
  groups,
  selectedGroupId,
  sessionDate,
  vilniusToday,
  sessionExists,
  recorderNames,
  lastMarkedAtIso,
  athletes,
  groupError,
  loadError,
}: {
  groups: AdminAttendanceGroupOption[];
  selectedGroupId: string | null;
  sessionDate: string;
  vilniusToday: string;
  sessionExists: boolean;
  recorderNames: string[];
  lastMarkedAtIso: string | null;
  athletes: AdminAttendanceAthleteRow[];
  groupError: string | null;
  loadError: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const groupOptions = groups.map((group) => ({
    value: group.id,
    label: groupLabel(group),
  }));

  function navigate(nextGroupId: string | null, nextDate: string) {
    startTransition(() => {
      router.push(attendanceUrl(nextGroupId, nextDate));
    });
  }

  function handleGroupChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextGroupId = event.target.value || null;
    navigate(nextGroupId, sessionDate);
  }

  function handleDateChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    if (!next) {
      event.target.value = sessionDate;
      return;
    }

    const target = next > vilniusToday ? vilniusToday : next;
    if (target === sessionDate) {
      event.target.value = sessionDate;
      return;
    }

    navigate(selectedGroupId, target);
  }

  return (
    <div className={`space-y-6 ${isPending ? "opacity-70" : ""}`}>
      <div className="grid gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6">
        <Select
          id="admin-attendance-group"
          label="Grupė"
          value={selectedGroupId ?? ""}
          onChange={handleGroupChange}
          options={groupOptions}
          placeholder="Pasirinkite grupę"
          disabled={isPending}
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="admin-attendance-date" className="text-sm font-medium text-gray-700">
            Data
          </label>
          <input
            id="admin-attendance-date"
            type="date"
            value={sessionDate}
            max={vilniusToday}
            onChange={handleDateChange}
            disabled={isPending}
            className="w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-4 py-3.5 text-base text-gray-900 focus:border-vtc-blue-600 focus:ring-2 focus:ring-vtc-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>

      {loadError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
          {loadError}
        </p>
      ) : null}

      {groupError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
          {groupError}
        </p>
      ) : null}

      {!selectedGroupId && !groupError ? (
        <p className="rounded-xl bg-white p-5 text-sm text-gray-700 shadow-sm">Pasirinkite grupę.</p>
      ) : null}

      {selectedGroupId && !groupError && !loadError ? (
        <>
          {athletes.length === 0 ? (
            <p className="rounded-xl bg-white p-5 text-sm text-gray-700 shadow-sm">
              Šią dieną grupėje nėra sportininkų.
            </p>
          ) : (
            <>
              <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
                {sessionExists ? (
                  <div className="space-y-1 text-sm text-gray-700">
                    <p className="font-medium text-gray-900">Lankomumas išsaugotas.</p>
                    {recorderNames.length > 0 ? (
                      <p>
                        Pažymėjo: {recorderNames.join(", ")}
                      </p>
                    ) : null}
                    {lastMarkedAtIso ? (
                      <p>Paskutinį kartą pažymėta: {formatMarkedAt(lastMarkedAtIso)}</p>
                    ) : null}
                    <p className="text-gray-500">{formatIsoDateDisplay(sessionDate)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-amber-800">
                    Treneris dar neišsaugojo šios dienos lankomumo.
                  </p>
                )}
              </section>

              <ul className="space-y-3">
                {athletes.map((athlete) => (
                  <li
                    key={athlete.athleteId}
                    className="flex items-start justify-between gap-3 rounded-xl bg-white p-4 shadow-sm sm:p-5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{athlete.childName}</p>
                      {athlete.childBirthDate ? (
                        <p className="mt-0.5 text-sm text-gray-500">
                          {formatIsoDateDisplay(athlete.childBirthDate)}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClassName(
                        athlete.status
                      )}`}
                    >
                      {statusLabel(athlete.status)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
