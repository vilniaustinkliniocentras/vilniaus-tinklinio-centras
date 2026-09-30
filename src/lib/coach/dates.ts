const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function vilniusTodayIsoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vilnius",
  }).format(new Date());
}

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isIsoDateString(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));

  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

export function isAllowedAttendanceDate(
  value: string,
  today = vilniusTodayIsoDate()
): boolean {
  return isIsoDateString(value) && value <= today;
}

export function formatIsoDateDisplay(value: string): string {
  const match = ISO_DATE.exec(value);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  return value;
}
