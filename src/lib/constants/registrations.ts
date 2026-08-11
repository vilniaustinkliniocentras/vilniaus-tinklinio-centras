export type RegistrationStatus = "new" | "contacted" | "accepted" | "rejected";

export const REGISTRATION_STATUSES: {
  value: RegistrationStatus;
  label: string;
}[] = [
  { value: "new", label: "Nauja" },
  { value: "contacted", label: "Susisiekta" },
  { value: "accepted", label: "Priimta" },
  { value: "rejected", label: "Atmesta" },
];

export const statusLabels: Record<RegistrationStatus, string> = {
  new: "Nauja",
  contacted: "Susisiekta",
  accepted: "Priimta",
  rejected: "Atmesta",
};

export function isRegistrationStatus(value: string): value is RegistrationStatus {
  return REGISTRATION_STATUSES.some((s) => s.value === value);
}

export const statusBadgeClasses: Record<RegistrationStatus, string> = {
  new: "bg-blue-50 text-blue-700 ring-blue-600/20",
  contacted: "bg-amber-50 text-amber-700 ring-amber-600/20",
  accepted: "bg-green-50 text-green-700 ring-green-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
};
