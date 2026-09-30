import "server-only";

import { createCoachServerClient } from "@/lib/supabase/coach-server";
import { isAttendanceStatus } from "@/lib/constants/attendance";
import type { AttendanceStatus } from "@/lib/constants/attendance";
import {
  isIsoDateString,
  isUuid,
  vilniusTodayIsoDate,
} from "@/lib/coach/dates";
import type {
  CoachAttendanceAthlete,
  CoachAttendanceMark,
} from "@/lib/coach/attendance-types";

export type { CoachAttendanceAthlete, CoachAttendanceMark };

export type CoachAttendanceRoster = {
  sessionId: string | null;
  sessionDate: string;
  trainingGroupId: string;
  athletes: CoachAttendanceAthlete[];
};

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

function publicRpcMessage(
  error: { message?: string } | null,
  fallback: string
): string {
  const raw = error?.message?.trim() ?? "";
  if (!raw) {
    return fallback;
  }

  const cleaned = raw.replace(/^(ERROR:\s*)?([A-Z0-9]{5}:\s*)?/i, "").trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

function parseAthlete(value: unknown): CoachAttendanceAthlete | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as RpcObject;
  const athleteId = readString(row.athlete_id);
  const childName = readString(row.child_name);
  if (!athleteId || !isUuid(athleteId) || !childName) {
    return null;
  }

  const birthRaw = row.child_birth_date;
  const childBirthDate =
    typeof birthRaw === "string" && birthRaw.length > 0 ? birthRaw : null;

  const statusRaw = row.status;
  const status =
    typeof statusRaw === "string" && isAttendanceStatus(statusRaw)
      ? statusRaw
      : null;

  return {
    athleteId,
    childName,
    childBirthDate,
    status,
  };
}

function parseAthletes(value: unknown): CoachAttendanceAthlete[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const athletes: CoachAttendanceAthlete[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const athlete = parseAthlete(item);
    if (!athlete || seen.has(athlete.athleteId)) {
      return null;
    }
    seen.add(athlete.athleteId);
    athletes.push(athlete);
  }

  return athletes;
}

export async function fetchCoachGroupRosterForDate(
  trainingGroupId: string,
  sessionDate: string
): Promise<
  | { success: true; roster: CoachAttendanceRoster }
  | { success: false; message: string }
> {
  if (!isUuid(trainingGroupId)) {
    return { success: false, message: "Neteisinga grupė." };
  }

  if (!isIsoDateString(sessionDate)) {
    return { success: false, message: "Neteisinga data." };
  }

  if (sessionDate > vilniusTodayIsoDate()) {
    return { success: false, message: "Negalima žymėti būsimos datos." };
  }

  const supabase = await createCoachServerClient();
  if (!supabase) {
    return { success: false, message: "Nepavyko gauti sportininkų sąrašo." };
  }

  const { data, error } = await supabase.rpc("coach_group_roster_for_date", {
    p_training_group_id: trainingGroupId,
    p_session_date: sessionDate,
  });

  if (error) {
    console.error("coach_group_roster_for_date failed:", error.message);
    return {
      success: false,
      message: publicRpcMessage(error, "Nepavyko gauti sportininkų sąrašo."),
    };
  }

  const payload = asRpcObject(data);
  const athletes = parseAthletes(payload?.athletes);
  const returnedGroupId = readString(payload?.training_group_id);
  const returnedDate = readString(payload?.session_date);

  if (!payload || !athletes || !returnedGroupId || !returnedDate) {
    return { success: false, message: "Nepavyko gauti sportininkų sąrašo." };
  }

  const sessionId = readString(payload.session_id);

  return {
    success: true,
    roster: {
      sessionId,
      sessionDate: returnedDate,
      trainingGroupId: returnedGroupId,
      athletes,
    },
  };
}

export async function saveCoachAttendance(
  trainingGroupId: string,
  sessionDate: string,
  marks: CoachAttendanceMark[]
): Promise<{ success: true } | { success: false; message: string }> {
  if (!isUuid(trainingGroupId)) {
    return { success: false, message: "Neteisinga grupė." };
  }

  if (!isIsoDateString(sessionDate)) {
    return { success: false, message: "Neteisinga data." };
  }

  if (sessionDate > vilniusTodayIsoDate()) {
    return { success: false, message: "Negalima žymėti būsimos datos." };
  }

  if (marks.length === 0) {
    return { success: false, message: "Šią dieną grupėje nėra sportininkų." };
  }

  const submittedIds = new Set<string>();
  const payload: Array<{ athlete_id: string; status: AttendanceStatus }> = [];

  for (const mark of marks) {
    if (!isUuid(mark.athleteId) || !isAttendanceStatus(mark.status)) {
      return { success: false, message: "Neteisingas lankomumo sąrašas." };
    }
    if (submittedIds.has(mark.athleteId)) {
      return { success: false, message: "Pasikartojantis sportininkas lankomumo sąraše." };
    }
    submittedIds.add(mark.athleteId);
    payload.push({
      athlete_id: mark.athleteId,
      status: mark.status,
    });
  }

  const supabase = await createCoachServerClient();
  if (!supabase) {
    return { success: false, message: "Nepavyko išsaugoti lankomumo." };
  }

  const { error } = await supabase.rpc("coach_save_attendance", {
    p_training_group_id: trainingGroupId,
    p_session_date: sessionDate,
    p_marks: payload,
  });

  if (error) {
    console.error("coach_save_attendance failed:", error.message);
    return {
      success: false,
      message: publicRpcMessage(error, "Nepavyko išsaugoti lankomumo."),
    };
  }

  return { success: true };
}
