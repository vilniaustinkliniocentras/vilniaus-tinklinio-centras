"use client";

import { useMemo, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { saveCoachAttendanceAction } from "@/lib/actions/coach-attendance";
import { Button } from "@/components/ui/Button";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/constants/attendance";
import type { CoachAttendanceAthlete } from "@/lib/coach/attendance-types";
import { formatIsoDateDisplay } from "@/lib/coach/dates";

function initialMarks(
  athletes: CoachAttendanceAthlete[]
): Record<string, AttendanceStatus | null> {
  const marks: Record<string, AttendanceStatus | null> = {};
  for (const athlete of athletes) {
    marks[athlete.athleteId] = athlete.status;
  }
  return marks;
}

function statusButtonClass(value: AttendanceStatus, selected: boolean): string {
  if (!selected) {
    return "border-gray-300 bg-white text-gray-700 hover:bg-gray-50";
  }

  if (value === "present") {
    return "border-green-700 bg-green-600 text-white shadow-sm";
  }

  if (value === "absent") {
    return "border-red-700 bg-red-600 text-white shadow-sm";
  }

  return "border-amber-700 bg-amber-500 text-white shadow-sm";
}

export function AttendanceForm({
  groupId,
  groupName,
  sessionDate,
  vilniusToday,
  athletes,
  loadError,
}: {
  groupId: string;
  groupName: string;
  sessionDate: string;
  vilniusToday: string;
  athletes: CoachAttendanceAthlete[];
  loadError: string | null;
}) {
  const router = useRouter();
  const [isDatePending, startDateTransition] = useTransition();
  const [marks, setMarks] = useState<Record<string, AttendanceStatus | null>>(() =>
    initialMarks(athletes)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const unmarkedCount = useMemo(() => {
    return athletes.filter((athlete) => !marks[athlete.athleteId]).length;
  }, [athletes, marks]);

  const allMarked = athletes.length > 0 && unmarkedCount === 0;
  const saveDisabled =
    !allMarked || isSubmitting || isDatePending || Boolean(loadError);

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

    startDateTransition(() => {
      router.push(`/treneris/grupe/${groupId}/lankomumas?data=${target}`);
    });
  }

  function selectStatus(athleteId: string, status: AttendanceStatus) {
    setMarks((current) => ({ ...current, [athleteId]: status }));
    setFeedback(null);
  }

  async function handleSave() {
    if (saveDisabled || isSubmitting) {
      return;
    }

    const payload = athletes.map((athlete) => {
      const status = marks[athlete.athleteId];
      return {
        athleteId: athlete.athleteId,
        status: status as AttendanceStatus,
      };
    });

    if (payload.some((mark) => !mark.status)) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await saveCoachAttendanceAction(groupId, sessionDate, payload);
      setFeedback({
        success: result.success,
        message: result.message,
      });
      if (result.success) {
        router.refresh();
      }
    } catch {
      setFeedback({
        success: false,
        message: "Nepavyko išsaugoti lankomumo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
        <label htmlFor="attendance-date" className="text-sm font-medium text-gray-700">
          Treniruotės data
        </label>
        <input
          id="attendance-date"
          type="date"
          value={sessionDate}
          max={vilniusToday}
          onChange={handleDateChange}
          disabled={isDatePending || isSubmitting}
          className="mt-1.5 w-full min-w-0 max-w-full rounded-lg border border-gray-300 px-4 py-3.5 text-base text-gray-900 focus:border-vtc-blue-600 focus:ring-2 focus:ring-vtc-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <p className="mt-2 text-sm text-gray-500">
          {groupName} · {formatIsoDateDisplay(sessionDate)}
        </p>
      </div>

      {loadError ? (
        <p className="rounded-xl bg-white p-5 text-sm text-red-600 shadow-sm" role="alert">
          {loadError}
        </p>
      ) : isDatePending ? (
        <p className="rounded-xl bg-white p-5 text-sm text-gray-600 shadow-sm">
          Kraunamas sąrašas...
        </p>
      ) : athletes.length === 0 ? (
        <p className="rounded-xl bg-white p-5 text-sm text-gray-700 shadow-sm">
          Šią dieną grupėje nėra sportininkų.
        </p>
      ) : (
        <ul className="space-y-3">
          {athletes.map((athlete) => {
            const selected = marks[athlete.athleteId];

            return (
              <li key={athlete.athleteId} className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
                <p className="font-medium text-gray-900">{athlete.childName}</p>
                {athlete.childBirthDate ? (
                  <p className="mt-0.5 text-sm text-gray-500">
                    {formatIsoDateDisplay(athlete.childBirthDate)}
                  </p>
                ) : null}
                <div
                  role="radiogroup"
                  aria-label={`${athlete.childName} lankomumas`}
                  className="mt-3 grid grid-cols-3 gap-2"
                >
                  {ATTENDANCE_STATUSES.map((option) => {
                    const isSelected = selected === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={isSubmitting}
                        onClick={() => selectStatus(athlete.athleteId, option.value)}
                        className={`min-h-12 rounded-lg border-2 px-1.5 py-2 text-center text-xs font-semibold leading-tight transition-colors sm:text-sm ${statusButtonClass(
                          option.value,
                          isSelected
                        )}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loadError && !isDatePending && athletes.length > 0 ? (
        <div className="sticky bottom-0 -mx-4 border-t border-gray-200 bg-vtc-gray-50/95 px-4 py-4 backdrop-blur sm:-mx-0 sm:rounded-xl sm:border sm:bg-white sm:px-5 sm:shadow-sm">
          {unmarkedCount > 0 ? (
            <p className="mb-3 text-sm text-amber-800">
              Pažymėkite visus sportininkus (liko {unmarkedCount}).
            </p>
          ) : null}

          {feedback ? (
            <p
              className={`mb-3 text-sm ${
                feedback.success ? "text-green-700" : "text-red-600"
              }`}
              role={feedback.success ? "status" : "alert"}
            >
              {feedback.message}
            </p>
          ) : null}

          <Button
            type="button"
            className="w-full min-h-12"
            disabled={saveDisabled}
            onClick={handleSave}
          >
            {isSubmitting ? "Saugoma..." : "Išsaugoti lankomumą"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
