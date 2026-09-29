"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { activateAthleteAction } from "@/lib/actions/admin-athletes";
import { Button } from "@/components/ui/Button";
import type { AdminGroupOption, RegistrationAthleteStatus } from "@/types/database";

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

export function ActivateAthleteControls({
  registrationId,
  status,
  activeGroups,
}: {
  registrationId: string;
  status: RegistrationAthleteStatus | null;
  activeGroups: AdminGroupOption[];
}) {
  const router = useRouter();
  const [groupId, setGroupId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(
    null
  );

  if (status?.isCurrentlyAttending) {
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800 ring-1 ring-inset ring-green-600/20">
          Lanko
        </span>
        <p className="text-sm text-gray-800">{status.currentGroupName ?? "—"}</p>
        {status.membershipStartsOn ? (
          <p className="text-xs text-gray-500">Nuo {formatDate(status.membershipStartsOn)}</p>
        ) : null}
      </div>
    );
  }

  if (activeGroups.length === 0) {
    return (
      <p className="text-xs text-gray-500">
        Nėra aktyvių operacinių grupių. Pirmiausia sukurkite grupę skyriuje „Grupės ir treneriai“.
      </p>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    const result = await activateAthleteAction(registrationId, groupId);
    setIsSubmitting(false);
    setFeedback({
      message: result.message,
      tone: result.success ? "success" : "error",
    });
    if (result.success) {
      setGroupId("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="sr-only" htmlFor={`activate-group-${registrationId}`}>
        Operacinė treniruočių grupė
      </label>
      <select
        id={`activate-group-${registrationId}`}
        value={groupId}
        onChange={(event) => setGroupId(event.target.value)}
        disabled={isSubmitting}
        required
        className="w-full min-w-[140px] rounded-lg border border-vtc-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-vtc-navy focus:ring-2 focus:ring-vtc-navy/10 disabled:opacity-60"
      >
        <option value="">Pasirinkite grupę</option>
        {activeGroups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={isSubmitting || !groupId} className="w-full">
        {isSubmitting ? "Pridedama..." : "Pridėti į lankančių sąrašą"}
      </Button>
      {feedback ? (
        <p
          className={`text-xs ${feedback.tone === "success" ? "text-green-700" : "text-red-600"}`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}
    </form>
  );
}
