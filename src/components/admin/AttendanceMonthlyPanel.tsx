"use client";

import { useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { AttendanceViewSwitcher } from "@/components/admin/AttendanceViewSwitcher";
import { formatIsoDateDisplay } from "@/lib/coach/dates";

export type AdminAttendanceGroupOption = {
  id: string;
  name: string;
  active: boolean;
};

export type AdminMonthlyAthleteRow = {
  athleteId: string;
  childName: string;
  childBirthDate: string | null;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  unmarkedCount: number;
  totalCount: number;
};

function groupLabel(group: AdminAttendanceGroupOption): string {
  return group.active ? group.name : `${group.name} (neaktyvi)`;
}

function monthlyAttendanceUrl(groupId: string | null, month: string): string {
  const params = new URLSearchParams();
  params.set("vaizdas", "menuo");
  params.set("menuo", month);
  if (groupId) {
    params.set("grupe", groupId);
  }
  return `/admin/lankomumas?${params.toString()}`;
}

export function AttendanceMonthlyPanel({
  groups,
  selectedGroupId,
  month,
  vilniusCurrentMonth,
  sessionCount,
  sessionDates,
  athletes,
  groupError,
  loadError,
}: {
  groups: AdminAttendanceGroupOption[];
  selectedGroupId: string | null;
  month: string;
  vilniusCurrentMonth: string;
  sessionCount: number;
  sessionDates: string[];
  athletes: AdminMonthlyAthleteRow[];
  groupError: string | null;
  loadError: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const groupOptions = groups.map((group) => ({
    value: group.id,
    label: groupLabel(group),
  }));

  function navigate(nextGroupId: string | null, nextMonth: string) {
    startTransition(() => {
      router.push(monthlyAttendanceUrl(nextGroupId, nextMonth));
    });
  }

  function handleGroupChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextGroupId = event.target.value || null;
    navigate(nextGroupId, month);
  }

  function handleMonthChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    if (!next) {
      event.target.value = month;
      return;
    }

    const target = next > vilniusCurrentMonth ? vilniusCurrentMonth : next;
    if (target === month) {
      event.target.value = month;
      return;
    }

    navigate(selectedGroupId, target);
  }

  const showSessionDates = sessionCount > 0 && sessionCount <= 12;

  return (
    <div className={`space-y-6 ${isPending ? "opacity-70" : ""}`}>
      <AttendanceViewSwitcher
        mode="menuo"
        groupId={selectedGroupId}
        dailyDate={`${month}-01`}
        month={month}
      />
      <div className="grid gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6">
        <Select
          id="admin-attendance-month-group"
          label="Grupė"
          value={selectedGroupId ?? ""}
          onChange={handleGroupChange}
          options={groupOptions}
          placeholder="Pasirinkite grupę"
          disabled={isPending}
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="admin-attendance-month" className="text-sm font-medium text-gray-700">
            Mėnuo
          </label>
          <input
            id="admin-attendance-month"
            type="month"
            value={month}
            max={vilniusCurrentMonth}
            onChange={handleMonthChange}
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
          <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
            {sessionCount === 0 ? (
              <p className="text-sm text-gray-700">Šį mėnesį nėra išsaugotų treniruočių.</p>
            ) : (
              <div className="space-y-2 text-sm text-gray-700">
                <p className="font-medium text-gray-900">
                  Išsaugotos treniruotės: {sessionCount}
                </p>
                {showSessionDates ? (
                  <p className="text-gray-600">
                    {sessionDates.map((date) => formatIsoDateDisplay(date)).join(", ")}
                  </p>
                ) : null}
              </div>
            )}
          </section>

          {athletes.length === 0 ? (
            <p className="rounded-xl bg-white p-5 text-sm text-gray-700 shadow-sm">
              Šį mėnesį grupėje nėra sportininkų.
            </p>
          ) : (
            <ul className="space-y-3">
              {athletes.map((athlete) => (
                <li
                  key={athlete.athleteId}
                  className="rounded-xl bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{athlete.childName}</p>
                    {athlete.childBirthDate ? (
                      <p className="mt-0.5 text-sm text-gray-500">
                        {formatIsoDateDisplay(athlete.childBirthDate)}
                      </p>
                    ) : null}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-5">
                    <div>
                      <dt className="text-gray-500">Dalyvavo</dt>
                      <dd className="font-semibold text-green-800">{athlete.presentCount}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Nedalyvavo</dt>
                      <dd className="font-semibold text-red-800">{athlete.absentCount}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Pateisinta</dt>
                      <dd className="font-semibold text-amber-900">{athlete.excusedCount}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Nepažymėta</dt>
                      <dd className="font-semibold text-gray-700">{athlete.unmarkedCount}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Viso</dt>
                      <dd className="font-semibold text-gray-900">{athlete.totalCount}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
