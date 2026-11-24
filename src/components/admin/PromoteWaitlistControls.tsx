"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { promoteWaitlistRegistrationAction } from "@/lib/actions/admin-athletes";
import { Button } from "@/components/ui/Button";
import type { AdminGroupOption } from "@/types/database";

export function PromoteWaitlistControls({
  registrationId,
  activeGroups,
}: {
  registrationId: string;
  activeGroups: AdminGroupOption[];
}) {
  const router = useRouter();
  const [groupId, setGroupId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(
    null
  );

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
    const result = await promoteWaitlistRegistrationAction(registrationId, groupId);
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
      <p className="text-xs leading-relaxed text-amber-900">
        Laukiančiųjų sąrašas. Mokestis neskaičiuojamas, kol vaikas neperkeltas.
      </p>
      <label className="sr-only" htmlFor={`promote-group-${registrationId}`}>
        Aktyvi treniruočių grupė
      </label>
      <select
        id={`promote-group-${registrationId}`}
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
        {isSubmitting ? "Perkeliama..." : "Perkelti į aktyvią grupę"}
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
