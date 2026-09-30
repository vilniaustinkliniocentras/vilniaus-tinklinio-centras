"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminSectionLinks = [
  { href: "/admin/registracijos", label: "Registracijos" },
  { href: "/admin/mokejimai", label: "Mokėjimai" },
  { href: "/admin/grupes", label: "Grupės ir treneriai" },
  { href: "/admin/lankomumas", label: "Lankomumas" },
] as const;

export function AdminSectionNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Administravimo skyriai" className="mb-6">
      <ul className="flex flex-wrap gap-2">
        {adminSectionLinks.map((link) => {
          const isActive = pathname === link.href;

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-vtc-navy text-white"
                    : "bg-white text-gray-700 ring-1 ring-inset ring-vtc-gray-200 hover:text-vtc-navy"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
