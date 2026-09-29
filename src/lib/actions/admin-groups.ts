"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import {
  adminAssignCoachToGroup,
  adminCreateTrainingGroup,
  adminFetchGroupsCoachesAssignments,
  adminSetCoachActive,
  adminSetTrainingGroupActive,
  adminUnassignCoachFromGroup,
  adminUpdateTrainingGroup,
  isUuid,
  type AdminGroupsData,
} from "@/lib/admin/coaches-groups";
import { inviteCoach } from "@/lib/admin/invite-coach";
import type { InviteCoachResult } from "@/lib/admin/invite-coach";

function revalidateGroups(): void {
  revalidatePath("/admin/grupes");
  revalidatePath("/treneris");
}

export async function getAdminGroupsData(): Promise<{
  data: AdminGroupsData | null;
  error: string | null;
}> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { data: null, error: "Neturite prieigos." };
  }

  const result = await adminFetchGroupsCoachesAssignments();
  if (!result.success) {
    return { data: null, error: result.message };
  }

  return { data: result.data, error: null };
}

export async function createTrainingGroupAction(
  name: string,
  notes: string,
  active: boolean
): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  const normalizedName = name.trim();
  if (!normalizedName) {
    return { success: false, message: "Įveskite grupės pavadinimą." };
  }

  const result = await adminCreateTrainingGroup({
    name: normalizedName,
    notes: notes.trim() || null,
    active,
  });

  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidateGroups();
  return { success: true, message: "Grupė sukurta." };
}

export async function updateTrainingGroupAction(
  id: string,
  name: string,
  notes: string
): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!isUuid(id)) {
    return { success: false, message: "Neteisingas grupės identifikatorius." };
  }

  const normalizedName = name.trim();
  if (!normalizedName) {
    return { success: false, message: "Įveskite grupės pavadinimą." };
  }

  const result = await adminUpdateTrainingGroup({
    id,
    name: normalizedName,
    notes: notes.trim() || null,
  });

  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidateGroups();
  return { success: true, message: "Grupė atnaujinta." };
}

export async function setTrainingGroupActiveAction(
  id: string,
  active: boolean
): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!isUuid(id)) {
    return { success: false, message: "Neteisingas grupės identifikatorius." };
  }

  const result = await adminSetTrainingGroupActive(id, active);
  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidateGroups();
  return {
    success: true,
    message: active ? "Grupė aktyvuota." : "Grupė deaktyvuota.",
  };
}

export async function setCoachActiveAction(
  id: string,
  active: boolean
): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!isUuid(id)) {
    return { success: false, message: "Neteisingas trenerio identifikatorius." };
  }

  const result = await adminSetCoachActive(id, active);
  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidateGroups();
  return {
    success: true,
    message: active ? "Treneris aktyvuotas." : "Treneris deaktyvuotas.",
  };
}

export async function inviteCoachAdminAction(
  fullName: string,
  email: string
): Promise<InviteCoachResult> {
  const result = await inviteCoach({ fullName, email });
  if (result.success) {
    revalidateGroups();
  }
  return result;
}

export async function assignCoachToGroupAction(
  coachId: string,
  trainingGroupId: string
): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!isUuid(coachId) || !isUuid(trainingGroupId)) {
    return { success: false, message: "Neteisingas priskyrimo identifikatorius." };
  }

  const result = await adminAssignCoachToGroup(coachId, trainingGroupId);
  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidateGroups();
  return { success: true, message: "Grupė priskirta treneriui." };
}

export async function unassignCoachFromGroupAction(
  coachId: string,
  trainingGroupId: string
): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!isUuid(coachId) || !isUuid(trainingGroupId)) {
    return { success: false, message: "Neteisingas priskyrimo identifikatorius." };
  }

  const result = await adminUnassignCoachFromGroup(coachId, trainingGroupId);
  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidateGroups();
  return { success: true, message: "Priskyrimas pašalintas." };
}
