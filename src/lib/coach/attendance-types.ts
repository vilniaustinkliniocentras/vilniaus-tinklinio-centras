import type { AttendanceStatus } from "@/lib/constants/attendance";

export type CoachAttendanceAthlete = {
  athleteId: string;
  childName: string;
  childBirthDate: string | null;
  status: AttendanceStatus | null;
};

export type CoachAttendanceMark = {
  athleteId: string;
  status: AttendanceStatus;
};

export type CoachAttendanceRpcDiagnostic = {
  rawSessionId: string;
  athletes: Array<{
    childName: string;
    rawStatus: string;
    parsedStatus: string;
  }>;
};
