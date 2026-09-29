"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  assignCoachToGroupAction,
  createTrainingGroupAction,
  inviteCoachAdminAction,
  setCoachActiveAction,
  setTrainingGroupActiveAction,
  unassignCoachFromGroupAction,
  updateTrainingGroupAction,
} from "@/lib/actions/admin-groups";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { AdminGroupsData } from "@/lib/admin/coaches-groups";
import type { Coach, CoachGroupAssignment, DbTrainingGroup } from "@/types/database";

interface GroupsAdminPanelProps {
  groups: DbTrainingGroup[];
  coaches: Coach[];
  assignments: CoachGroupAssignment[];
}

function StatusBadge({ active, activeLabel, inactiveLabel }: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        active
          ? "bg-green-50 text-green-800 ring-green-600/20"
          : "bg-gray-100 text-gray-600 ring-gray-500/20"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
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

export function GroupsAdminPanel({
  groups,
  coaches,
  assignments,
}: GroupsAdminPanelProps) {
  return (
    <div className="space-y-6">
      <TrainingGroupsSection groups={groups} />
      <CoachesSection coaches={coaches} />
      <AssignmentsSection
        groups={groups}
        coaches={coaches}
        assignments={assignments}
      />
    </div>
  );
}

function TrainingGroupsSection({ groups }: { groups: DbTrainingGroup[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(
    null
  );

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setFeedback(null);
    const result = await createTrainingGroupAction(name, notes, active);
    setIsCreating(false);
    setFeedback({
      message: result.message,
      tone: result.success ? "success" : "error",
    });
    if (result.success) {
      setName("");
      setNotes("");
      setActive(true);
      router.refresh();
    }
  }

  return (
    <section
      className="rounded-xl border border-vtc-gray-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="training-groups-heading"
    >
      <h2 id="training-groups-heading" className="text-lg font-semibold text-gray-900">
        Treniruočių grupės
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Operacinės grupės lankomumui. Tai nėra registracijos formos pasirinkimai.
      </p>

      <form onSubmit={handleCreate} className="mt-5 space-y-4 rounded-lg bg-vtc-gray-50 p-4">
        <Input
          id="newGroupName"
          label="Pavadinimas"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Textarea
          id="newGroupNotes"
          label="Pastabos"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-[88px]"
        />
        <Checkbox
          id="newGroupActive"
          label="Aktyvi"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
        <Button type="submit" size="sm" disabled={isCreating}>
          {isCreating ? "Kuriama..." : "Sukurti grupę"}
        </Button>
        <Feedback message={feedback?.message ?? null} tone={feedback?.tone ?? null} />
      </form>

      {groups.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">Treniruočių grupių dar nėra.</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {groups.map((group) => (
            <li key={`${group.id}-${group.updated_at}`}>
              <GroupCard group={group} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GroupCard({ group }: { group: DbTrainingGroup }) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [notes, setNotes] = useState(group.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(
    null
  );

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    const result = await updateTrainingGroupAction(group.id, name, notes);
    setIsSaving(false);
    setFeedback({
      message: result.message,
      tone: result.success ? "success" : "error",
    });
    if (result.success) {
      router.refresh();
    }
  }

  async function handleToggle() {
    setIsToggling(true);
    setFeedback(null);
    const result = await setTrainingGroupActiveAction(group.id, !group.active);
    setIsToggling(false);
    setFeedback({
      message: result.message,
      tone: result.success ? "success" : "error",
    });
    if (result.success) {
      router.refresh();
    }
  }

  return (
    <article
      className={`rounded-lg border p-4 ${
        group.active ? "border-vtc-gray-200 bg-white" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <StatusBadge
          active={group.active}
          activeLabel="Aktyvi"
          inactiveLabel="Neaktyvi"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleToggle()}
          disabled={isToggling}
        >
          {isToggling
            ? "Saugoma..."
            : group.active
              ? "Deaktyvuoti"
              : "Aktyvuoti"}
        </Button>
      </div>
      <form onSubmit={handleSave} className="space-y-3">
        <Input
          id={`group-name-${group.id}`}
          label="Pavadinimas"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Textarea
          id={`group-notes-${group.id}`}
          label="Pastabos"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-[80px]"
        />
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? "Saugoma..." : "Išsaugoti"}
        </Button>
        <Feedback message={feedback?.message ?? null} tone={feedback?.tone ?? null} />
      </form>
    </article>
  );
}

function CoachesSection({ coaches }: { coaches: Coach[] }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(
    null
  );

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsInviting(true);
    setFeedback(null);
    const result = await inviteCoachAdminAction(fullName, email);
    setIsInviting(false);
    const message =
      result.success
        ? result.message
        : [result.message, result.recovery].filter(Boolean).join(" ");
    setFeedback({
      message,
      tone: result.success ? "success" : "error",
    });
    if (result.success) {
      setFullName("");
      setEmail("");
      router.refresh();
    }
  }

  return (
    <section
      className="rounded-xl border border-vtc-gray-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="coaches-heading"
    >
      <h2 id="coaches-heading" className="text-lg font-semibold text-gray-900">
        Treneriai
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Kvietimas išsiunčiamas el. paštu. Slaptažodžio čia nėra ir jo įvesti nereikia.
      </p>

      <form onSubmit={handleInvite} className="mt-5 space-y-4 rounded-lg bg-vtc-gray-50 p-4">
        <Input
          id="newCoachName"
          label="Vardas ir pavardė"
          required
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
        <Input
          id="newCoachEmail"
          label="El. paštas"
          type="email"
          inputMode="email"
          required
          autoComplete="off"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" size="sm" disabled={isInviting}>
          {isInviting ? "Siunčiama..." : "Kviesti trenerį"}
        </Button>
        <Feedback message={feedback?.message ?? null} tone={feedback?.tone ?? null} />
      </form>

      {coaches.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">Trenerių dar nėra.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {coaches.map((coach) => (
            <li key={`${coach.id}-${coach.updated_at}`}>
              <CoachCard coach={coach} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CoachCard({ coach }: { coach: Coach }) {
  const router = useRouter();
  const [isToggling, setIsToggling] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(
    null
  );

  async function handleToggle() {
    setIsToggling(true);
    setFeedback(null);
    const result = await setCoachActiveAction(coach.id, !coach.active);
    setIsToggling(false);
    setFeedback({
      message: result.message,
      tone: result.success ? "success" : "error",
    });
    if (result.success) {
      router.refresh();
    }
  }

  return (
    <article
      className={`rounded-lg border p-4 ${
        coach.active ? "border-vtc-gray-200 bg-white" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-gray-900">{coach.full_name}</p>
          <p className="mt-0.5 break-all text-sm text-gray-600">{coach.email}</p>
          <div className="mt-2">
            <StatusBadge
              active={coach.active}
              activeLabel="Aktyvus"
              inactiveLabel="Neaktyvus"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleToggle()}
          disabled={isToggling}
        >
          {isToggling
            ? "Saugoma..."
            : coach.active
              ? "Deaktyvuoti"
              : "Aktyvuoti"}
        </Button>
      </div>
      <div className="mt-2">
        <Feedback message={feedback?.message ?? null} tone={feedback?.tone ?? null} />
      </div>
    </article>
  );
}

function AssignmentsSection({
  groups,
  coaches,
  assignments,
}: AdminGroupsData) {
  const assignedByCoach = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const assignment of assignments) {
      const current = map.get(assignment.coach_id) ?? [];
      current.push(assignment.training_group_id);
      map.set(assignment.coach_id, current);
    }
    return map;
  }, [assignments]);

  return (
    <section
      className="rounded-xl border border-vtc-gray-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="assignments-heading"
    >
      <h2 id="assignments-heading" className="text-lg font-semibold text-gray-900">
        Trenerių priskyrimai grupėms
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Pašalinus priskyrimą, lankomumo ir grupių istorija išlieka.
      </p>

      {coaches.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">
          Pirmiausia pakvieskite trenerį.
        </p>
      ) : groups.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">
          Pirmiausia sukurkite treniruočių grupę.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {coaches.map((coach) => (
            <li key={coach.id}>
              <CoachAssignmentCard
                coach={coach}
                groups={groups}
                assignedGroupIds={assignedByCoach.get(coach.id) ?? []}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CoachAssignmentCard({
  coach,
  groups,
  assignedGroupIds,
}: {
  coach: Coach;
  groups: DbTrainingGroup[];
  assignedGroupIds: string[];
}) {
  const router = useRouter();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [pendingUnassignId, setPendingUnassignId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(
    null
  );

  const assignedGroups = groups.filter((group) => assignedGroupIds.includes(group.id));
  const availableGroups = groups.filter((group) => !assignedGroupIds.includes(group.id));

  async function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroupId) {
      return;
    }
    setIsAssigning(true);
    setFeedback(null);
    const result = await assignCoachToGroupAction(coach.id, selectedGroupId);
    setIsAssigning(false);
    setFeedback({
      message: result.message,
      tone: result.success ? "success" : "error",
    });
    if (result.success) {
      setSelectedGroupId("");
      router.refresh();
    }
  }

  async function handleUnassign(trainingGroupId: string) {
    setPendingUnassignId(trainingGroupId);
    setFeedback(null);
    const result = await unassignCoachFromGroupAction(coach.id, trainingGroupId);
    setPendingUnassignId(null);
    setFeedback({
      message: result.message,
      tone: result.success ? "success" : "error",
    });
    if (result.success) {
      router.refresh();
    }
  }

  return (
    <article
      className={`rounded-lg border p-4 ${
        coach.active ? "border-vtc-gray-200" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium text-gray-900">{coach.full_name}</h3>
        <StatusBadge
          active={coach.active}
          activeLabel="Aktyvus"
          inactiveLabel="Neaktyvus"
        />
      </div>
      <p className="mt-0.5 break-all text-sm text-gray-500">{coach.email}</p>

      {assignedGroups.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">Grupių nepriskirta.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {assignedGroups.map((group) => (
            <li
              key={group.id}
              className="flex flex-col gap-2 rounded-md bg-vtc-gray-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm text-gray-800">
                {group.name}
                {!group.active ? (
                  <span className="ml-2 text-xs text-gray-500">(neaktyvi)</span>
                ) : null}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleUnassign(group.id)}
                disabled={pendingUnassignId === group.id}
              >
                {pendingUnassignId === group.id ? "Šalinama..." : "Pašalinti"}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {availableGroups.length > 0 ? (
        <form onSubmit={handleAssign} className="mt-4 space-y-3">
          <Select
            id={`assign-group-${coach.id}`}
            label="Priskirti grupę"
            value={selectedGroupId}
            onChange={(event) => setSelectedGroupId(event.target.value)}
            options={availableGroups.map((group) => ({
              value: group.id,
              label: group.active ? group.name : `${group.name} (neaktyvi)`,
            }))}
            placeholder="Pasirinkite grupę"
          />
          <Button type="submit" size="sm" disabled={isAssigning || !selectedGroupId}>
            {isAssigning ? "Priskiriama..." : "Priskirti"}
          </Button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-gray-500">Visos grupės jau priskirtos.</p>
      )}

      <div className="mt-2">
        <Feedback message={feedback?.message ?? null} tone={feedback?.tone ?? null} />
      </div>
    </article>
  );
}
