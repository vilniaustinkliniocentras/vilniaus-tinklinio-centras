import type { AttendanceStatus } from "@/types/database";

export type { AttendanceStatus };

export const ATTENDANCE_STATUSES: {
  value: AttendanceStatus;
  label: string;
}[] = [
  { value: "present", label: "Dalyvavo" },
  { value: "absent", label: "Nedalyvavo" },
  { value: "excused", label: "Pateisinta" },
];

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  present: "Dalyvavo",
  absent: "Nedalyvavo",
  excused: "Pateisinta",
};

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return ATTENDANCE_STATUSES.some((status) => status.value === value);
}
