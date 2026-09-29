import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AdminRosterAthlete,
  Coach,
  CoachGroupAssignment,
  DbTrainingGroup,
} from "@/types/database";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export type AdminGroupsData = {
  groups: DbTrainingGroup[];
  coaches: Coach[];
  assignments: CoachGroupAssignment[];
  roster: AdminRosterAthlete[];
  rosterError: string | null;
};

function missingClientMessage(): string {
  return "Supabase administracijos konfigūracija nebaigta.";
}

export async function adminFetchGroupsCoachesAssignments(): Promise<
  { success: true; data: AdminGroupsData } | { success: false; message: string }
> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const [groupsResult, coachesResult, assignmentsResult] = await Promise.all([
    supabase
      .from("training_groups")
      .select("id, name, active, notes, created_at, updated_at")
      .order("name", { ascending: true }),
    supabase
      .from("coaches")
      .select("id, auth_user_id, full_name, email, active, created_at, updated_at")
      .order("full_name", { ascending: true }),
    supabase
      .from("coach_group_assignments")
      .select("id, coach_id, training_group_id, created_at")
      .order("created_at", { ascending: true }),
  ]);

  if (groupsResult.error) {
    console.error("Failed to fetch training_groups:", groupsResult.error.message);
    return { success: false, message: "Nepavyko gauti treniruočių grupių." };
  }
  if (coachesResult.error) {
    console.error("Failed to fetch coaches:", coachesResult.error.message);
    return { success: false, message: "Nepavyko gauti trenerių." };
  }
  if (assignmentsResult.error) {
    console.error(
      "Failed to fetch coach_group_assignments:",
      assignmentsResult.error.message
    );
    return { success: false, message: "Nepavyko gauti trenerių priskyrimų." };
  }

  return {
    success: true,
    data: {
      groups: (groupsResult.data ?? []) as DbTrainingGroup[],
      coaches: (coachesResult.data ?? []) as Coach[],
      assignments: (assignmentsResult.data ?? []) as CoachGroupAssignment[],
      roster: [],
      rosterError: null,
    },
  };
}

export async function adminCreateTrainingGroup(input: {
  name: string;
  notes: string | null;
  active: boolean;
}): Promise<{ success: true; group: DbTrainingGroup } | { success: false; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { data, error } = await supabase
    .from("training_groups")
    .insert({
      name: input.name,
      notes: input.notes,
      active: input.active,
    })
    .select("id, name, active, notes, created_at, updated_at")
    .single();

  if (error || !data) {
    console.error("Failed to create training_group:", error?.message);
    return { success: false, message: "Nepavyko sukurti grupės." };
  }

  return { success: true, group: data as DbTrainingGroup };
}

export async function adminUpdateTrainingGroup(input: {
  id: string;
  name: string;
  notes: string | null;
}): Promise<{ success: true; group: DbTrainingGroup } | { success: false; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { data, error } = await supabase
    .from("training_groups")
    .update({ name: input.name, notes: input.notes })
    .eq("id", input.id)
    .select("id, name, active, notes, created_at, updated_at")
    .maybeSingle();

  if (error || !data) {
    console.error("Failed to update training_group:", error?.message);
    return { success: false, message: "Nepavyko atnaujinti grupės." };
  }

  return { success: true, group: data as DbTrainingGroup };
}

export async function adminSetTrainingGroupActive(
  id: string,
  active: boolean
): Promise<{ success: true; group: DbTrainingGroup } | { success: false; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { data, error } = await supabase
    .from("training_groups")
    .update({ active })
    .eq("id", id)
    .select("id, name, active, notes, created_at, updated_at")
    .maybeSingle();

  if (error || !data) {
    console.error("Failed to set training_group active:", error?.message);
    return { success: false, message: "Nepavyko pakeisti grupės būsenos." };
  }

  return { success: true, group: data as DbTrainingGroup };
}

export async function adminSetCoachActive(
  id: string,
  active: boolean
): Promise<{ success: true; coach: Coach } | { success: false; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { data, error } = await supabase
    .from("coaches")
    .update({ active })
    .eq("id", id)
    .select("id, auth_user_id, full_name, email, active, created_at, updated_at")
    .maybeSingle();

  if (error || !data) {
    console.error("Failed to set coach active:", error?.message);
    return { success: false, message: "Nepavyko pakeisti trenerio būsenos." };
  }

  return { success: true, coach: data as Coach };
}

export async function adminAssignCoachToGroup(
  coachId: string,
  trainingGroupId: string
): Promise<
  { success: true; assignment: CoachGroupAssignment } | { success: false; message: string }
> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { data, error } = await supabase
    .from("coach_group_assignments")
    .insert({
      coach_id: coachId,
      training_group_id: trainingGroupId,
    })
    .select("id, coach_id, training_group_id, created_at")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { success: false, message: "Šis treneris jau priskirtas šiai grupei." };
    }
    console.error("Failed to assign coach to group:", error?.message);
    return { success: false, message: "Nepavyko priskirti grupės treneriui." };
  }

  return { success: true, assignment: data as CoachGroupAssignment };
}

export async function adminUnassignCoachFromGroup(
  coachId: string,
  trainingGroupId: string
): Promise<{ success: true } | { success: false; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, message: missingClientMessage() };
  }

  const { data, error } = await supabase
    .from("coach_group_assignments")
    .delete()
    .eq("coach_id", coachId)
    .eq("training_group_id", trainingGroupId)
    .select("id");

  if (error) {
    console.error("Failed to unassign coach from group:", error.message);
    return { success: false, message: "Nepavyko pašalinti priskyrimo." };
  }

  if (!data || data.length === 0) {
    return { success: false, message: "Priskyrimas nerastas." };
  }

  return { success: true };
}
