"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { headerNavLinks, images, siteConfig } from "@/lib/constants";

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isTransparent = isHome && !scrolled && !mobileMenuOpen;

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 48);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        isTransparent
          ? "border-b border-white/10 bg-transparent"
          : "border-b border-vtc-gray-200/80 bg-white/95 shadow-sm backdrop-blur-md"
      }`}
    >
      <div className="container-narrow flex h-[4.75rem] min-w-0 items-center justify-between gap-2 px-4 sm:gap-3 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="relative flex min-w-0 shrink items-center rounded-lg"
          aria-label={`${siteConfig.name} – pradžia`}
        >
          <Image
            src={images.logo}
            alt={`${siteConfig.name} logotipas`}
            width={56}
            height={56}
            className="h-[46px] w-auto max-w-[9.5rem] object-contain object-left transition-all duration-300 sm:max-w-none md:h-[50px] lg:h-[56px]"
            priority
          />
        </Link>

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Pagrindinė navigacija"
        >
          {headerNavLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : link.href.startsWith("/#")
                  ? false
                  : pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
                  isTransparent
                    ? isActive
                      ? "text-white"
                      : "text-white/75 hover:text-white"
                    : isActive
                      ? "text-vtc-navy"
                      : "text-gray-600 hover:text-vtc-navy"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Link
            href="/registracija"
            className={`inline-flex min-h-11 items-center justify-center rounded-full px-3 py-2 text-xs font-semibold transition-all duration-300 sm:px-5 sm:py-2.5 sm:text-sm ${
              isTransparent
                ? "bg-white text-vtc-navy hover:bg-white/90"
                : "bg-vtc-navy text-white hover:bg-vtc-navy-dark"
            }`}
          >
            Registracija
          </Link>
          <Link
            href="/kontaktai"
            className={`hidden rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-300 md:inline-flex ${
              isTransparent
                ? "border-white/40 text-white hover:border-white hover:bg-white/10"
                : "border-vtc-gray-200 text-gray-700 hover:border-vtc-navy hover:text-vtc-navy"
            }`}
          >
            Prisijungti
          </Link>

          <button
            type="button"
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors lg:hidden ${
              isTransparent
                ? "text-white hover:bg-white/10"
                : "text-vtc-navy hover:bg-vtc-gray-100"
            }`}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? "Uždaryti meniu" : "Atidaryti meniu"}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 top-[4.75rem] z-40 bg-vtc-navy/30 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            id="mobile-menu"
            className="absolute inset-x-0 top-full z-50 border-b border-vtc-gray-200 bg-white px-4 py-6 shadow-2xl sm:px-5 lg:hidden"
            aria-label="Mobili navigacija"
          >
            <ul className="flex flex-col gap-1">
              {headerNavLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="block min-h-11 rounded-2xl px-4 py-3.5 font-medium text-gray-700 transition-colors hover:bg-vtc-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Link
                  href="/registracija"
                  className="flex min-h-11 items-center justify-center rounded-2xl bg-vtc-navy px-4 py-3.5 text-center text-sm font-semibold text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Registracija
                </Link>
                <Link
                  href="/kontaktai"
                  className="flex min-h-11 items-center justify-center rounded-2xl border border-vtc-gray-200 px-4 py-3.5 text-center text-sm font-semibold text-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Prisijungti
                </Link>
              </li>
            </ul>
          </nav>
        </>
      )}
    </header>
  );
}
