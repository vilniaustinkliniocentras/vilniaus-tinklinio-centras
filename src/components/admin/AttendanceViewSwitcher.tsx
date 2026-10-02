"use client";

import Link from "next/link";

function dailyAttendanceUrl(groupId: string | null, date: string): string {
  const params = new URLSearchParams();
  params.set("data", date);
  if (groupId) {
    params.set("grupe", groupId);
  }
  return `/admin/lankomumas?${params.toString()}`;
}

function monthlyAttendanceUrl(groupId: string | null, month: string): string {
  const params = new URLSearchParams();
  params.set("vaizdas", "menuo");
  params.set("menuo", month);
  if (groupId) {
    params.set("grupe", groupId);
  }
  return `/admin/lankomumas?${params.toString()}`;
}

export function AttendanceViewSwitcher({
  mode,
  groupId,
  dailyDate,
  month,
}: {
  mode: "diena" | "menuo";
  groupId: string | null;
  dailyDate: string;
  month: string;
}) {
  const links = [
    {
      href: dailyAttendanceUrl(groupId, dailyDate),
      label: "Dienos peržiūra",
      active: mode === "diena",
    },
    {
      href: monthlyAttendanceUrl(groupId, month),
      label: "Mėnesio suvestinė",
      active: mode === "menuo",
    },
  ] as const;

  return (
    <nav aria-label="Lankomumo peržiūra" className="mb-4">
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                link.active
                  ? "bg-vtc-navy text-white"
                  : "bg-white text-gray-700 ring-1 ring-inset ring-vtc-gray-200 hover:text-vtc-navy"
              }`}
              aria-current={link.active ? "page" : undefined}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
