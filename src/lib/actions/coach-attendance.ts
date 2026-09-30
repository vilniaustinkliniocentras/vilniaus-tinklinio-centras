"use server";

import { revalidatePath } from "next/cache";
import {
  getAssignedTrainingGroups,
  requireActiveCoach,
} from "@/lib/coach/auth";
import { saveCoachAttendance } from "@/lib/coach/attendance";
import type { CoachAttendanceMark } from "@/lib/coach/attendance-types";
import {
  isIsoDateString,
  isUuid,
  vilniusTodayIsoDate,
} from "@/lib/coach/dates";
import { isAttendanceStatus } from "@/lib/constants/attendance";

export type SaveCoachAttendanceResult = {
  success: boolean;
  message: string;
};

export async function saveCoachAttendanceAction(
  trainingGroupId: string,
  sessionDate: string,
  marks: Array<{ athleteId: string; status: string }>
): Promise<SaveCoachAttendanceResult> {
  const coach = await requireActiveCoach();

  if (!isUuid(trainingGroupId)) {
    return { success: false, message: "Neteisinga grupė." };
  }

  if (!isIsoDateString(sessionDate)) {
    return { success: false, message: "Neteisinga data." };
  }

  if (sessionDate > vilniusTodayIsoDate()) {
    return { success: false, message: "Negalima žymėti būsimos datos." };
  }

  const groups = await getAssignedTrainingGroups(coach.id);
  if (!groups.some((group) => group.id === trainingGroupId)) {
    return { success: false, message: "Ši grupė jums nepriskirta." };
  }

  if (!Array.isArray(marks) || marks.length === 0) {
    return { success: false, message: "Šią dieną grupėje nėra sportininkų." };
  }

  const parsed: CoachAttendanceMark[] = [];
  const seen = new Set<string>();

  for (const mark of marks) {
    if (!mark || typeof mark !== "object") {
      return { success: false, message: "Neteisingas lankomumo sąrašas." };
    }

    const athleteId = mark.athleteId;
    const status = mark.status;

    if (typeof athleteId !== "string" || !isUuid(athleteId)) {
      return { success: false, message: "Neteisingas sportininko identifikatorius." };
    }

    if (typeof status !== "string" || !isAttendanceStatus(status)) {
      return { success: false, message: "Neteisingas lankomumo statusas." };
    }

    if (seen.has(athleteId)) {
      return { success: false, message: "Pasikartojantis sportininkas lankomumo sąraše." };
    }

    seen.add(athleteId);
    parsed.push({ athleteId, status });
  }

  const result = await saveCoachAttendance(trainingGroupId, sessionDate, parsed);
  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidatePath(`/treneris/grupe/${trainingGroupId}/lankomumas`);
  revalidatePath("/treneris");

  return { success: true, message: "Lankomumas išsaugotas." };
}
