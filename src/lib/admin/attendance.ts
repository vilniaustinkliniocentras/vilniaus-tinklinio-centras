import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/admin/coaches-groups";
import { isAttendanceStatus } from "@/lib/constants/attendance";
import type { AttendanceStatus } from "@/lib/constants/attendance";
import {
  attendanceMonthBounds,
  isAllowedAttendanceDate,
  isAllowedAttendanceMonth,
  vilniusTodayIsoDate,
} from "@/lib/coach/dates";

export type AdminAttendanceGroupOption = {
  id: string;
  name: string;
  active: boolean;
};

export type AdminAttendanceAthleteRow = {
  athleteId: string;
  childName: string;
  childBirthDate: string | null;
  status: AttendanceStatus | null;
};

export type AdminAttendanceView = {
  groups: AdminAttendanceGroupOption[];
  selectedGroupId: string | null;
  selectedGroupName: string | null;
  selectedGroupActive: boolean | null;
  sessionDate: string;
  sessionExists: boolean;
  recorderNames: string[];
  lastMarkedAtIso: string | null;
  athletes: AdminAttendanceAthleteRow[];
  groupError: string | null;
  loadError: string | null;
};

export type AdminMonthlyAthleteRow = {
  athleteId: string;
  childName: string;
  childBirthDate: string | null;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  unmarkedCount: number;
  totalCount: number;
};

export type AdminMonthlyAttendanceView = {
  groups: AdminAttendanceGroupOption[];
  selectedGroupId: string | null;
  selectedGroupName: string | null;
  selectedGroupActive: boolean | null;
  month: string;
  sessionCount: number;
  sessionDates: string[];
  athletes: AdminMonthlyAthleteRow[];
  groupError: string | null;
  loadError: string | null;
};

type GroupRow = {
  id: string;
  name: string;
  active: boolean;
};

type MembershipRow = {
  athlete_id: string;
  training_group_id: string;
  starts_on: string;
  ends_on: string | null;
};

type AthleteRow = {
  id: string;
  child_name: string;
  child_birth_date: string | null;
};

type SessionRow = {
  id: string;
  training_group_id: string;
  session_date: string;
};

type AttendanceRow = {
  athlete_id: string;
  status: string;
  marked_by_coach_id: string | null;
  marked_at: string;
};

type CoachRow = {
  id: string;
  full_name: string;
  active: boolean;
};

function missingClientMessage(): string {
  return "Supabase administracijos konfigūracija nebaigta.";
}

function emptyView(
  sessionDate: string,
  groups: AdminAttendanceGroupOption[] = []
): AdminAttendanceView {
  return {
    groups,
    selectedGroupId: null,
    selectedGroupName: null,
    selectedGroupActive: null,
    sessionDate,
    sessionExists: false,
    recorderNames: [],
    lastMarkedAtIso: null,
    athletes: [],
    groupError: null,
    loadError: null,
  };
}

function coversSessionDate(
  startsOn: string,
  endsOn: string | null,
  sessionDate: string
): boolean {
  if (startsOn > sessionDate) {
    return false;
  }

  return endsOn === null || endsOn >= sessionDate;
}

function formatCoachName(coach: CoachRow): string {
  if (coach.active) {
    return coach.full_name;
  }

  return `${coach.full_name} (neaktyvus)`;
}

async function fetchGroups(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>
): Promise<
  { success: true; groups: AdminAttendanceGroupOption[] } | { success: false; message: string }
> {
  const { data, error } = await supabase
    .from("training_groups")
    .select("id, name, active")
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch attendance groups:", error.message);
    return { success: false, message: "Nepavyko gauti treniruočių grupių." };
  }

  const groups = ((data ?? []) as GroupRow[])
    .filter((group) => Boolean(group.id && group.name))
    .map((group) => ({
      id: group.id,
      name: group.name,
      active: group.active === true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "lt"));

  return { success: true, groups };
}

export async function adminLoadAttendanceView(
  groupId: string | null,
  sessionDate: string
): Promise<AdminAttendanceView> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      ...emptyView(sessionDate),
      loadError: missingClientMessage(),
    };
  }

  const groupsResult = await fetchGroups(supabase);
  if (!groupsResult.success) {
    return {
      ...emptyView(sessionDate),
      loadError: groupsResult.message,
    };
  }

  const groups = groupsResult.groups;

  if (!isAllowedAttendanceDate(sessionDate)) {
    return {
      ...emptyView(sessionDate, groups),
      loadError: "Negalima peržiūrėti būsimos datos.",
    };
  }

  if (!groupId) {
    return emptyView(sessionDate, groups);
  }

  if (!isUuid(groupId)) {
    return {
      ...emptyView(sessionDate, groups),
      groupError: "Neteisinga grupė.",
    };
  }

  const selectedGroup = groups.find((group) => group.id === groupId);
  if (!selectedGroup) {
    return {
      ...emptyView(sessionDate, groups),
      groupError: "Grupė nerasta.",
    };
  }

  const { data: membershipData, error: membershipError } = await supabase
    .from("athlete_group_memberships")
    .select("athlete_id, training_group_id, starts_on, ends_on")
    .eq("training_group_id", groupId)
    .lte("starts_on", sessionDate)
    .or(`ends_on.is.null,ends_on.gte.${sessionDate}`);

  if (membershipError) {
    console.error("Failed to fetch attendance memberships:", membershipError.message);
    return {
      ...emptyView(sessionDate, groups),
      selectedGroupId: selectedGroup.id,
      selectedGroupName: selectedGroup.name,
      selectedGroupActive: selectedGroup.active,
      loadError: "Nepavyko gauti tos dienos sportininkų sąrašo.",
    };
  }

  const athleteIds: string[] = [];
  const seenAthletes = new Set<string>();

  for (const row of (membershipData ?? []) as MembershipRow[]) {
    if (!coversSessionDate(row.starts_on, row.ends_on, sessionDate)) {
      continue;
    }
    if (!row.athlete_id || seenAthletes.has(row.athlete_id)) {
      continue;
    }
    seenAthletes.add(row.athlete_id);
    athleteIds.push(row.athlete_id);
  }

  let athletesById = new Map<string, AthleteRow>();

  if (athleteIds.length > 0) {
    const { data: athleteData, error: athleteError } = await supabase
      .from("athletes")
      .select("id, child_name, child_birth_date")
      .in("id", athleteIds);

    if (athleteError) {
      console.error("Failed to fetch attendance athletes:", athleteError.message);
      return {
        ...emptyView(sessionDate, groups),
        selectedGroupId: selectedGroup.id,
        selectedGroupName: selectedGroup.name,
        selectedGroupActive: selectedGroup.active,
        loadError: "Nepavyko gauti tos dienos sportininkų sąrašo.",
      };
    }

    athletesById = new Map(
      ((athleteData ?? []) as AthleteRow[]).map((athlete) => [athlete.id, athlete])
    );
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from("training_sessions")
    .select("id, training_group_id, session_date")
    .eq("training_group_id", groupId)
    .eq("session_date", sessionDate)
    .maybeSingle();

  if (sessionError) {
    console.error("Failed to fetch attendance session:", sessionError.message);
    return {
      ...emptyView(sessionDate, groups),
      selectedGroupId: selectedGroup.id,
      selectedGroupName: selectedGroup.name,
      selectedGroupActive: selectedGroup.active,
      loadError: "Nepavyko gauti lankomumo duomenų.",
    };
  }

  const session = (sessionData ?? null) as SessionRow | null;
  const attendanceByAthleteId = new Map<string, AttendanceRow>();

  if (session?.id) {
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance")
      .select("athlete_id, status, marked_by_coach_id, marked_at")
      .eq("training_session_id", session.id);

    if (attendanceError) {
      console.error("Failed to fetch attendance rows:", attendanceError.message);
      return {
        ...emptyView(sessionDate, groups),
        selectedGroupId: selectedGroup.id,
        selectedGroupName: selectedGroup.name,
        selectedGroupActive: selectedGroup.active,
        loadError: "Nepavyko gauti lankomumo duomenų.",
      };
    }

    for (const row of (attendanceData ?? []) as AttendanceRow[]) {
      if (!row.athlete_id || !seenAthletes.has(row.athlete_id)) {
        continue;
      }
      attendanceByAthleteId.set(row.athlete_id, row);
    }
  }

  const recorderIds = [
    ...new Set(
      [...attendanceByAthleteId.values()]
        .map((row) => row.marked_by_coach_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const coachesById = new Map<string, CoachRow>();
  if (recorderIds.length > 0) {
    const { data: coachData, error: coachError } = await supabase
      .from("coaches")
      .select("id, full_name, active")
      .in("id", recorderIds);

    if (coachError) {
      console.error("Failed to fetch attendance coaches:", coachError.message);
      return {
        ...emptyView(sessionDate, groups),
        selectedGroupId: selectedGroup.id,
        selectedGroupName: selectedGroup.name,
        selectedGroupActive: selectedGroup.active,
        loadError: "Nepavyko gauti trenerių duomenų.",
      };
    }

    for (const coach of (coachData ?? []) as CoachRow[]) {
      coachesById.set(coach.id, coach);
    }
  }

  const athletes: AdminAttendanceAthleteRow[] = [];

  for (const athleteId of athleteIds) {
    const athlete = athletesById.get(athleteId);
    if (!athlete) {
      continue;
    }

    const mark = attendanceByAthleteId.get(athleteId);
    const status =
      mark && isAttendanceStatus(mark.status) ? mark.status : null;

    athletes.push({
      athleteId: athlete.id,
      childName: athlete.child_name,
      childBirthDate: athlete.child_birth_date,
      status,
    });
  }

  athletes.sort((a, b) => a.childName.localeCompare(b.childName, "lt"));

  const recorderNames = recorderIds
    .map((id) => {
      const coach = coachesById.get(id);
      return coach ? formatCoachName(coach) : null;
    })
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b, "lt"));

  let lastMarkedAtIso: string | null = null;
  for (const row of attendanceByAthleteId.values()) {
    if (!row.marked_at) {
      continue;
    }
    if (!lastMarkedAtIso || row.marked_at > lastMarkedAtIso) {
      lastMarkedAtIso = row.marked_at;
    }
  }

  return {
    groups,
    selectedGroupId: selectedGroup.id,
    selectedGroupName: selectedGroup.name,
    selectedGroupActive: selectedGroup.active,
    sessionDate,
    sessionExists: Boolean(session?.id),
    recorderNames,
    lastMarkedAtIso,
    athletes,
    groupError: null,
    loadError: null,
  };
}

function emptyMonthlyView(
  month: string,
  groups: AdminAttendanceGroupOption[] = []
): AdminMonthlyAttendanceView {
  return {
    groups,
    selectedGroupId: null,
    selectedGroupName: null,
    selectedGroupActive: null,
    month,
    sessionCount: 0,
    sessionDates: [],
    athletes: [],
    groupError: null,
    loadError: null,
  };
}

export async function adminLoadMonthlyAttendanceView(
  groupId: string | null,
  month: string
): Promise<AdminMonthlyAttendanceView> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      ...emptyMonthlyView(month),
      loadError: missingClientMessage(),
    };
  }

  const groupsResult = await fetchGroups(supabase);
  if (!groupsResult.success) {
    return {
      ...emptyMonthlyView(month),
      loadError: groupsResult.message,
    };
  }

  const groups = groupsResult.groups;
  const bounds = attendanceMonthBounds(month);
  const today = vilniusTodayIsoDate();

  if (!bounds || !isAllowedAttendanceMonth(month)) {
    return {
      ...emptyMonthlyView(month, groups),
      loadError: "Negalima peržiūrėti būsimo mėnesio.",
    };
  }

  if (!groupId) {
    return emptyMonthlyView(month, groups);
  }

  if (!isUuid(groupId)) {
    return {
      ...emptyMonthlyView(month, groups),
      groupError: "Neteisinga grupė.",
    };
  }

  const selectedGroup = groups.find((group) => group.id === groupId);
  if (!selectedGroup) {
    return {
      ...emptyMonthlyView(month, groups),
      groupError: "Grupė nerasta.",
    };
  }

  const sessionDateMax = bounds.end <= today ? bounds.end : today;

  const { data: membershipData, error: membershipError } = await supabase
    .from("athlete_group_memberships")
    .select("athlete_id, training_group_id, starts_on, ends_on")
    .eq("training_group_id", groupId)
    .lte("starts_on", bounds.end)
    .or(`ends_on.is.null,ends_on.gte.${bounds.start}`);

  if (membershipError) {
    console.error(
      "Failed to fetch monthly attendance memberships:",
      membershipError.message
    );
    return {
      ...emptyMonthlyView(month, groups),
      selectedGroupId: selectedGroup.id,
      selectedGroupName: selectedGroup.name,
      selectedGroupActive: selectedGroup.active,
      loadError: "Nepavyko gauti to mėnesio sportininkų sąrašo.",
    };
  }

  const membershipsByAthlete = new Map<string, MembershipRow[]>();
  const athleteIds: string[] = [];

  for (const row of (membershipData ?? []) as MembershipRow[]) {
    if (!row.athlete_id) {
      continue;
    }

    const existing = membershipsByAthlete.get(row.athlete_id);
    if (existing) {
      existing.push(row);
      continue;
    }

    membershipsByAthlete.set(row.athlete_id, [row]);
    athleteIds.push(row.athlete_id);
  }

  let athletesById = new Map<string, AthleteRow>();

  if (athleteIds.length > 0) {
    const { data: athleteData, error: athleteError } = await supabase
      .from("athletes")
      .select("id, child_name, child_birth_date")
      .in("id", athleteIds);

    if (athleteError) {
      console.error(
        "Failed to fetch monthly attendance athletes:",
        athleteError.message
      );
      return {
        ...emptyMonthlyView(month, groups),
        selectedGroupId: selectedGroup.id,
        selectedGroupName: selectedGroup.name,
        selectedGroupActive: selectedGroup.active,
        loadError: "Nepavyko gauti to mėnesio sportininkų sąrašo.",
      };
    }

    athletesById = new Map(
      ((athleteData ?? []) as AthleteRow[]).map((athlete) => [athlete.id, athlete])
    );
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from("training_sessions")
    .select("id, training_group_id, session_date")
    .eq("training_group_id", groupId)
    .gte("session_date", bounds.start)
    .lte("session_date", sessionDateMax)
    .order("session_date", { ascending: true });

  if (sessionError) {
    console.error("Failed to fetch monthly attendance sessions:", sessionError.message);
    return {
      ...emptyMonthlyView(month, groups),
      selectedGroupId: selectedGroup.id,
      selectedGroupName: selectedGroup.name,
      selectedGroupActive: selectedGroup.active,
      loadError: "Nepavyko gauti lankomumo duomenų.",
    };
  }

  const sessions = ((sessionData ?? []) as SessionRow[]).filter(
    (session) =>
      Boolean(session.id) &&
      session.session_date >= bounds.start &&
      session.session_date <= sessionDateMax
  );

  const attendanceBySession = new Map<string, Map<string, string>>();

  if (sessions.length > 0) {
    const sessionIds = sessions.map((session) => session.id);
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance")
      .select("athlete_id, status, training_session_id")
      .in("training_session_id", sessionIds);

    if (attendanceError) {
      console.error(
        "Failed to fetch monthly attendance rows:",
        attendanceError.message
      );
      return {
        ...emptyMonthlyView(month, groups),
        selectedGroupId: selectedGroup.id,
        selectedGroupName: selectedGroup.name,
        selectedGroupActive: selectedGroup.active,
        loadError: "Nepavyko gauti lankomumo duomenų.",
      };
    }

    for (const row of (attendanceData ?? []) as (AttendanceRow & {
      training_session_id: string;
    })[]) {
      if (!row.training_session_id || !row.athlete_id) {
        continue;
      }

      let byAthlete = attendanceBySession.get(row.training_session_id);
      if (!byAthlete) {
        byAthlete = new Map();
        attendanceBySession.set(row.training_session_id, byAthlete);
      }
      byAthlete.set(row.athlete_id, row.status);
    }
  }

  const athletes: AdminMonthlyAthleteRow[] = [];

  for (const athleteId of athleteIds) {
    const athlete = athletesById.get(athleteId);
    if (!athlete) {
      continue;
    }

    const memberships = membershipsByAthlete.get(athleteId) ?? [];
    let presentCount = 0;
    let absentCount = 0;
    let excusedCount = 0;
    let unmarkedCount = 0;

    for (const session of sessions) {
      const eligible = memberships.some((membership) =>
        coversSessionDate(membership.starts_on, membership.ends_on, session.session_date)
      );
      if (!eligible) {
        continue;
      }

      const status = attendanceBySession.get(session.id)?.get(athleteId);
      if (status === "present") {
        presentCount += 1;
      } else if (status === "absent") {
        absentCount += 1;
      } else if (status === "excused") {
        excusedCount += 1;
      } else if (status === undefined) {
        unmarkedCount += 1;
      }
    }

    athletes.push({
      athleteId: athlete.id,
      childName: athlete.child_name,
      childBirthDate: athlete.child_birth_date,
      presentCount,
      absentCount,
      excusedCount,
      unmarkedCount,
      totalCount: presentCount + absentCount + excusedCount + unmarkedCount,
    });
  }

  athletes.sort((a, b) => a.childName.localeCompare(b.childName, "lt"));

  const sessionDates = sessions.map((session) => session.session_date);

  return {
    groups,
    selectedGroupId: selectedGroup.id,
    selectedGroupName: selectedGroup.name,
    selectedGroupActive: selectedGroup.active,
    month,
    sessionCount: sessions.length,
    sessionDates,
    athletes,
    groupError: null,
    loadError: null,
  };
}
