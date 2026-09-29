import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AdminGroupOption,
  AdminRosterAthlete,
  RegistrationAthleteStatus,
} from "@/types/database";

function missingClientMessage(): string {
  return "Supabase administracijos konfigūracija nebaigta.";
}

type RpcObject = Record<string, unknown>;

function asRpcObject(data: unknown): RpcObject | null {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as RpcObject;
  }

  if (typeof data === "string") {
    try {
      const parsed: unknown = JSON.parse(data);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as RpcObject;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function rpcErrorMessage(
  error: { message?: string } | null,
  fallback: string
): string {
  const message = error?.message?.trim();
  return message && message.length > 0 ? message : fallback;
}

type AthleteRow = {
  id: string;
  registration_id: string;
  child_name: string;
  child_birth_date: string;
  active: boolean;
};

type MembershipRow = {
  id: string;
  athlete_id: string;
  training_group_id: string;
  starts_on: string;
  ends_on: string | null;
};

type GroupRow = {
  id: string;
  name: string;
  active: boolean;
};

export type AdminActivateAthleteResult = {
  athleteId: string;
  registrationId: string;
  membershipId: string;
  trainingGroupId: string;
  startsOn: string | null;
  effectiveToday: boolean;
};

export type AdminMoveAthleteResult = {
  athleteId: string;
  action: string | null;
  oldMembershipDeleted: boolean;
  newMembershipId: string | null;
  newTrainingGroupId: string | null;
  newStartsOn: string | null;
  effectiveToday: boolean;
};

export type AdminStopAthleteResult = {
  athleteId: string;
  alreadyStopped: boolean;
};

export async function adminFetchRegistrationAthleteStatuses(): Promise<
  | {
      success: true;
      statuses: Record<string, RegistrationAthleteStatus>;
      activeGroups: AdminGroupOption[];
    }
  | { success: false; message: string }
> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const [athletesResult, membershipsResult, groupsResult] = await Promise.all([
    supabase
      .from("athletes")
      .select("id, registration_id, child_name, child_birth_date, active"),
    supabase
      .from("athlete_group_memberships")
      .select("id, athlete_id, training_group_id, starts_on, ends_on")
      .is("ends_on", null),
    supabase
      .from("training_groups")
      .select("id, name, active")
      .order("name", { ascending: true }),
  ]);

  if (athletesResult.error) {
    console.error("Failed to fetch athletes:", athletesResult.error.message);
    return { success: false, message: "Nepavyko gauti sportininkų būsenos." };
  }
  if (membershipsResult.error) {
    console.error(
      "Failed to fetch athlete_group_memberships:",
      membershipsResult.error.message
    );
    return { success: false, message: "Nepavyko gauti grupių narysčių." };
  }
  if (groupsResult.error) {
    console.error("Failed to fetch training_groups:", groupsResult.error.message);
    return { success: false, message: "Nepavyko gauti treniruočių grupių." };
  }

  const groups = (groupsResult.data ?? []) as GroupRow[];
  const groupNameById = new Map(groups.map((group) => [group.id, group.name]));
  const membershipByAthlete = new Map(
    ((membershipsResult.data ?? []) as MembershipRow[]).map((row) => [row.athlete_id, row])
  );

  const statuses: Record<string, RegistrationAthleteStatus> = {};

  for (const athlete of (athletesResult.data ?? []) as AthleteRow[]) {
    const membership = membershipByAthlete.get(athlete.id) ?? null;
    const isCurrentlyAttending = athlete.active === true && membership !== null;

    statuses[athlete.registration_id] = {
      registrationId: athlete.registration_id,
      athleteId: athlete.id,
      isCurrentlyAttending,
      currentGroupId: membership?.training_group_id ?? null,
      currentGroupName: membership
        ? groupNameById.get(membership.training_group_id) ?? "Nežinoma grupė"
        : null,
      membershipStartsOn: membership?.starts_on ?? null,
    };
  }

  return {
    success: true,
    statuses,
    activeGroups: groups
      .filter((group) => group.active)
      .map((group) => ({ id: group.id, name: group.name })),
  };
}

export async function adminFetchCurrentRoster(): Promise<
  { success: true; roster: AdminRosterAthlete[] } | { success: false; message: string }
> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const [athletesResult, membershipsResult, groupsResult] = await Promise.all([
    supabase
      .from("athletes")
      .select("id, registration_id, child_name, child_birth_date, active")
      .eq("active", true),
    supabase
      .from("athlete_group_memberships")
      .select("id, athlete_id, training_group_id, starts_on, ends_on")
      .is("ends_on", null),
    supabase
      .from("training_groups")
      .select("id, name, active")
      .order("name", { ascending: true }),
  ]);

  if (athletesResult.error) {
    console.error("Failed to fetch roster athletes:", athletesResult.error.message);
    return { success: false, message: "Nepavyko gauti sportininkų." };
  }
  if (membershipsResult.error) {
    console.error(
      "Failed to fetch roster memberships:",
      membershipsResult.error.message
    );
    return { success: false, message: "Nepavyko gauti grupių narysčių." };
  }
  if (groupsResult.error) {
    console.error("Failed to fetch roster groups:", groupsResult.error.message);
    return { success: false, message: "Nepavyko gauti treniruočių grupių." };
  }

  const athletesById = new Map(
    ((athletesResult.data ?? []) as AthleteRow[]).map((athlete) => [athlete.id, athlete])
  );
  const groupsById = new Map(
    ((groupsResult.data ?? []) as GroupRow[]).map((group) => [group.id, group])
  );

  const roster: AdminRosterAthlete[] = [];

  for (const membership of (membershipsResult.data ?? []) as MembershipRow[]) {
    const athlete = athletesById.get(membership.athlete_id);
    if (!athlete || athlete.active !== true) {
      continue;
    }

    const group = groupsById.get(membership.training_group_id);
    roster.push({
      athleteId: athlete.id,
      childName: athlete.child_name,
      childBirthDate: athlete.child_birth_date,
      groupId: membership.training_group_id,
      groupName: group?.name ?? "Nežinoma grupė",
      groupActive: group?.active === true,
      membershipId: membership.id,
      membershipStartsOn: membership.starts_on,
    });
  }

  roster.sort((a, b) => {
    const groupCompare = a.groupName.localeCompare(b.groupName, "lt");
    if (groupCompare !== 0) return groupCompare;
    return a.childName.localeCompare(b.childName, "lt");
  });

  return { success: true, roster };
}

export async function adminActivateAthlete(
  registrationId: string,
  trainingGroupId: string
): Promise<
  { success: true; data: AdminActivateAthleteResult } | { success: false; message: string }
> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { data, error } = await supabase.rpc("admin_activate_athlete", {
    p_registration_id: registrationId,
    p_training_group_id: trainingGroupId,
  });

  if (error) {
    console.error("admin_activate_athlete failed:", error.message);
    return {
      success: false,
      message: rpcErrorMessage(error, "Nepavyko pridėti į lankančių sąrašą."),
    };
  }

  const payload = asRpcObject(data);
  const athleteId = readString(payload?.athlete_id);
  const returnedRegistrationId = readString(payload?.registration_id);
  const membershipId = readString(payload?.membership_id);
  const returnedGroupId = readString(payload?.training_group_id);

  if (!payload || !athleteId || !returnedRegistrationId || !membershipId || !returnedGroupId) {
    return { success: false, message: "Nepavyko pridėti į lankančių sąrašą." };
  }

  return {
    success: true,
    data: {
      athleteId,
      registrationId: returnedRegistrationId,
      membershipId,
      trainingGroupId: returnedGroupId,
      startsOn: readString(payload.starts_on),
      effectiveToday: readBoolean(payload.effective_today) === true,
    },
  };
}

export async function adminMoveAthlete(
  athleteId: string,
  newTrainingGroupId: string
): Promise<
  { success: true; data: AdminMoveAthleteResult } | { success: false; message: string }
> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { data, error } = await supabase.rpc("admin_move_athlete", {
    p_athlete_id: athleteId,
    p_new_training_group_id: newTrainingGroupId,
  });

  if (error) {
    console.error("admin_move_athlete failed:", error.message);
    return {
      success: false,
      message: rpcErrorMessage(error, "Nepavyko perkelti sportininko."),
    };
  }

  const payload = asRpcObject(data);
  const returnedAthleteId = readString(payload?.athlete_id);

  if (!payload || !returnedAthleteId) {
    return { success: false, message: "Nepavyko perkelti sportininko." };
  }

  return {
    success: true,
    data: {
      athleteId: returnedAthleteId,
      action: readString(payload.action),
      oldMembershipDeleted: readBoolean(payload.old_membership_deleted) === true,
      newMembershipId: readString(payload.new_membership_id),
      newTrainingGroupId: readString(payload.new_training_group_id),
      newStartsOn: readString(payload.new_starts_on),
      effectiveToday: readBoolean(payload.effective_today) === true,
    },
  };
}

export async function adminStopAthlete(
  athleteId: string
): Promise<
  { success: true; data: AdminStopAthleteResult } | { success: false; message: string }
> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { data, error } = await supabase.rpc("admin_stop_athlete", {
    p_athlete_id: athleteId,
  });

  if (error) {
    console.error("admin_stop_athlete failed:", error.message);
    return {
      success: false,
      message: rpcErrorMessage(error, "Nepavyko sustabdyti lankymo."),
    };
  }

  const payload = asRpcObject(data);
  const returnedAthleteId = readString(payload?.athlete_id);

  if (!payload || !returnedAthleteId) {
    return { success: false, message: "Nepavyko sustabdyti lankymo." };
  }

  return {
    success: true,
    data: {
      athleteId: returnedAthleteId,
      alreadyStopped: readBoolean(payload.already_stopped) === true,
    },
  };
}

export async function adminFetchTrainingGroupName(
  trainingGroupId: string
): Promise<string | null> {
  const supabase = createAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("training_groups")
    .select("name")
    .eq("id", trainingGroupId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return typeof data.name === "string" ? data.name : null;
}
