"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { isUuid } from "@/lib/admin/coaches-groups";
import {
  adminActivateAthlete,
  adminFetchRegistrationAthleteStatuses,
  adminFetchTrainingGroupName,
  adminMoveAthlete,
  adminStopAthlete,
} from "@/lib/admin/athletes";
import { fetchRegistrationById, setRegistrationWaitlist } from "@/lib/admin/registrations";
import type { AdminGroupOption, RegistrationAthleteStatus } from "@/types/database";

function revalidateAthleteAdminPages(): void {
  revalidatePath("/admin/registracijos");
  revalidatePath("/admin/grupes");
  revalidatePath("/treneris");
}

function formatDateLt(value: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export async function getRegistrationAthleteState(): Promise<{
  statuses: Record<string, RegistrationAthleteStatus>;
  activeGroups: AdminGroupOption[];
  error: string | null;
}> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { statuses: {}, activeGroups: [], error: "Neturite prieigos." };
  }

  const result = await adminFetchRegistrationAthleteStatuses();
  if (!result.success) {
    return { statuses: {}, activeGroups: [], error: result.message };
  }

  return {
    statuses: result.statuses,
    activeGroups: result.activeGroups,
    error: null,
  };
}

export async function activateAthleteAction(
  registrationId: string,
  trainingGroupId: string
): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!isUuid(registrationId) || !isUuid(trainingGroupId)) {
    return { success: false, message: "Neteisingas registracijos arba grupės identifikatorius." };
  }

  const registration = await fetchRegistrationById(registrationId);
  if (registration?.is_waitlist) {
    return {
      success: false,
      message:
        "Laukiančiųjų sąrašo vaikas nepridedamas prie aktyvių sportininkų. Naudokite „Perkelti į aktyvią grupę“.",
    };
  }

  const result = await adminActivateAthlete(registrationId, trainingGroupId);
  if (!result.success) {
    return { success: false, message: result.message };
  }

  const groupName =
    (await adminFetchTrainingGroupName(result.data.trainingGroupId)) ?? "pasirinkta grupė";
  const startsOn = formatDateLt(result.data.startsOn);

  revalidateAthleteAdminPages();

  if (result.data.effectiveToday) {
    return {
      success: true,
      message: `Vaikas pridėtas į lankančių sąrašą („${groupName}“).`,
    };
  }

  return {
    success: true,
    message: startsOn
      ? `Vaikas pridėtas į lankančių sąrašą („${groupName}“). Narystė prasidės ${startsOn}.`
      : `Vaikas pridėtas į lankančių sąrašą („${groupName}“).`,
  };
}

export async function promoteWaitlistRegistrationAction(
  registrationId: string,
  trainingGroupId: string
): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!isUuid(registrationId) || !isUuid(trainingGroupId)) {
    return { success: false, message: "Neteisingas registracijos arba grupės identifikatorius." };
  }

  const registration = await fetchRegistrationById(registrationId);
  if (!registration) {
    return { success: false, message: "Registracija nerasta." };
  }

  if (!registration.is_waitlist) {
    return { success: false, message: "Ši registracija nėra laukiančiųjų sąraše." };
  }

  const state = await adminFetchRegistrationAthleteStatuses();
  if (!state.success) {
    return { success: false, message: state.message };
  }

  if (state.statuses[registrationId]?.isCurrentlyAttending) {
    return {
      success: false,
      message: "Šis vaikas jau lanko grupę. Esama narystė, mokėjimai ir sutartys nekeičiami.",
    };
  }

  const result = await adminActivateAthlete(registrationId, trainingGroupId);
  if (!result.success) {
    return { success: false, message: result.message };
  }

  const cleared = await setRegistrationWaitlist(registrationId, false);
  const groupName =
    (await adminFetchTrainingGroupName(result.data.trainingGroupId)) ?? "pasirinkta grupė";
  const startsOn = formatDateLt(result.data.startsOn);

  revalidateAthleteAdminPages();

  if (!cleared.success) {
    return {
      success: true,
      message: `Vaikas perkeltas į aktyvią grupę („${groupName}“). Laukiančiųjų žymos nuimti nepavyko.`,
    };
  }

  if (result.data.effectiveToday) {
    return {
      success: true,
      message: `Vaikas perkeltas į aktyvią grupę („${groupName}“).`,
    };
  }

  return {
    success: true,
    message: startsOn
      ? `Vaikas perkeltas į aktyvią grupę („${groupName}“). Narystė prasidės ${startsOn}.`
      : `Vaikas perkeltas į aktyvią grupę („${groupName}“).`,
  };
}

export async function moveAthleteAction(
  athleteId: string,
  newTrainingGroupId: string
): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!isUuid(athleteId) || !isUuid(newTrainingGroupId)) {
    return { success: false, message: "Neteisingas sportininko arba grupės identifikatorius." };
  }

  const result = await adminMoveAthlete(athleteId, newTrainingGroupId);
  if (!result.success) {
    return { success: false, message: result.message };
  }

  const groupName =
    (await adminFetchTrainingGroupName(result.data.newTrainingGroupId ?? newTrainingGroupId)) ??
    "pasirinkta grupė";
  const startsOn = formatDateLt(result.data.newStartsOn);

  revalidateAthleteAdminPages();

  if (result.data.action === "corrected" && result.data.effectiveToday) {
    return {
      success: true,
      message: `Sportininkas perkeltas į „${groupName}“. Pataisymas įsigaliojo šiandien.`,
    };
  }

  if (result.data.effectiveToday) {
    return {
      success: true,
      message: `Sportininkas perkeltas į „${groupName}“.`,
    };
  }

  return {
    success: true,
    message: startsOn
      ? `Sportininkas perkeltas į „${groupName}“. Perkėlimas įsigalios nuo ${startsOn}, nes tą pačią dieną vaikas negali priklausyti dviem grupėms.`
      : `Sportininkas perkeltas į „${groupName}“. Perkėlimas įsigalios vėliau.`,
  };
}

export async function stopAthleteAction(
  athleteId: string
): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!isUuid(athleteId)) {
    return { success: false, message: "Neteisingas sportininko identifikatorius." };
  }

  const result = await adminStopAthlete(athleteId);
  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidateAthleteAdminPages();

  if (result.data.alreadyStopped) {
    return { success: true, message: "Lankymas jau buvo sustabdytas." };
  }

  return { success: true, message: "Lankymas sustabdytas. Istorija išsaugota." };
}
