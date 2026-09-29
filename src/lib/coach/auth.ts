import "server-only";

import { redirect } from "next/navigation";
import { createCoachServerClient } from "@/lib/supabase/coach-server";
import type { Coach, DbTrainingGroup } from "@/types/database";

export type CoachAssignedGroup = Pick<DbTrainingGroup, "id" | "name" | "active">;

/**
 * Active coach for the current cookie session, or null.
 * Authentication is not enough: public.coaches.auth_user_id must match
 * and coaches.active must be true. Uses the user JWT (RLS), not service role.
 */
export async function getAuthenticatedCoach(): Promise<Coach | null> {
  const supabase = await createCoachServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("coaches")
    .select("id, auth_user_id, full_name, email, active, created_at, updated_at")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Coach;
}

export async function requireActiveCoach(): Promise<Coach> {
  const coach = await getAuthenticatedCoach();
  if (!coach) {
    redirect("/treneris/prisijungti");
  }
  return coach;
}

export async function getAssignedTrainingGroups(
  coachId: string
): Promise<CoachAssignedGroup[]> {
  const supabase = await createCoachServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("coach_group_assignments")
    .select("training_group_id, training_groups(id, name, active)")
    .eq("coach_id", coachId);

  if (error || !data) {
    return [];
  }

  const groups: CoachAssignedGroup[] = [];

  for (const row of data as Array<{
    training_group_id: string;
    training_groups: CoachAssignedGroup | CoachAssignedGroup[] | null;
  }>) {
    const group = row.training_groups;
    if (!group || Array.isArray(group) || !group.id) {
      continue;
    }
    groups.push({
      id: group.id,
      name: group.name,
      active: group.active,
    });
  }

  return groups;
}
