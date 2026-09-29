import "server-only";

import { createCoachServerClient } from "@/lib/supabase/coach-server";

export type CoachRosterAthlete = {
  id: string;
  childName: string;
  childBirthDate: string;
};

type MembershipAthlete = {
  id: string;
  child_name: string;
  child_birth_date: string;
  active: boolean;
};

type MembershipRow = {
  training_group_id: string;
  starts_on: string;
  ends_on: string | null;
  athletes: MembershipAthlete | MembershipAthlete[] | null;
};

function vilniusTodayIsoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vilnius",
  }).format(new Date());
}

function coversVilniusToday(
  startsOn: string,
  endsOn: string | null,
  today: string
): boolean {
  if (startsOn > today) {
    return false;
  }

  return endsOn === null || endsOn >= today;
}

function asAthlete(value: MembershipRow["athletes"]): MembershipAthlete | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getCurrentCoachRosterByGroup(
  groupIds: string[]
): Promise<{
  athletesByGroupId: Record<string, CoachRosterAthlete[]>;
  error: string | null;
}> {
  const athletesByGroupId: Record<string, CoachRosterAthlete[]> = {};
  for (const groupId of groupIds) {
    athletesByGroupId[groupId] = [];
  }

  if (groupIds.length === 0) {
    return { athletesByGroupId, error: null };
  }

  const supabase = await createCoachServerClient();
  if (!supabase) {
    return {
      athletesByGroupId,
      error: "Nepavyko gauti sportininkų sąrašo.",
    };
  }

  const today = vilniusTodayIsoDate();

  const { data, error } = await supabase
    .from("athlete_group_memberships")
    .select(
      "training_group_id, starts_on, ends_on, athletes(id, child_name, child_birth_date, active)"
    )
    .in("training_group_id", groupIds)
    .lte("starts_on", today)
    .or(`ends_on.is.null,ends_on.gte.${today}`);

  if (error) {
    console.error("Failed to fetch coach roster:", error.message);
    return {
      athletesByGroupId,
      error: "Nepavyko gauti sportininkų sąrašo.",
    };
  }

  const seenByGroup = new Map<string, Set<string>>();

  for (const row of (data ?? []) as MembershipRow[]) {
    if (!coversVilniusToday(row.starts_on, row.ends_on, today)) {
      continue;
    }

    const athlete = asAthlete(row.athletes);
    if (!athlete || athlete.active !== true) {
      continue;
    }

    if (!athletesByGroupId[row.training_group_id]) {
      athletesByGroupId[row.training_group_id] = [];
    }

    const seen = seenByGroup.get(row.training_group_id) ?? new Set<string>();
    if (seen.has(athlete.id)) {
      continue;
    }
    seen.add(athlete.id);
    seenByGroup.set(row.training_group_id, seen);

    athletesByGroupId[row.training_group_id].push({
      id: athlete.id,
      childName: athlete.child_name,
      childBirthDate: athlete.child_birth_date,
    });
  }

  for (const groupId of Object.keys(athletesByGroupId)) {
    athletesByGroupId[groupId].sort((a, b) =>
      a.childName.localeCompare(b.childName, "lt")
    );
  }

  return { athletesByGroupId, error: null };
}
