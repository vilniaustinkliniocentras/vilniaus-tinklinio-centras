import type { Registration } from "@/types/database";

export interface ContractFields {
  contractDate: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  parentContact: string;
  childNameBirth: string;
}

const LT_MONTHS = [
  "sausio",
  "vasario",
  "kovo",
  "balandžio",
  "gegužės",
  "birželio",
  "liepos",
  "rugpjūčio",
  "rugsėjo",
  "spalio",
  "lapkričio",
  "gruodžio",
] as const;

export function formatContractDate(date: Date): string {
  const year = date.getFullYear();
  const month = LT_MONTHS[date.getMonth()];
  const day = date.getDate();

  return `${year} m. ${month} ${day} d.`;
}

export function formatBirthDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("lt-LT");
}

export function mapRegistrationToContractFields(
  registration: Registration,
  generatedAt: Date = new Date()
): ContractFields {
  const parentName = registration.parent_name.trim();
  const parentEmail = registration.parent_email.trim().toLowerCase();
  const parentPhone = registration.parent_phone.trim();
  const childName = registration.child_name.trim();
  const childBirthDate = formatBirthDate(registration.child_birth_date);

  return {
    contractDate: formatContractDate(generatedAt),
    parentName,
    parentEmail,
    parentPhone,
    parentContact: `${parentEmail}, ${parentPhone}`,
    childNameBirth: `${childName}, ${childBirthDate}`,
  };
}

export function buildContractFilename(childName: string): string {
  const slug = childName
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const safeSlug = slug || "vaikas";
  return `VTC_Sutartis_${safeSlug}_2026-2027.pdf`;
}
