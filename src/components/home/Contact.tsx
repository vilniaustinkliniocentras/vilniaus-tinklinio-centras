import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { siteConfig } from "@/lib/constants";

export function Contact() {
  return (
    <section className="section-padding bg-white" aria-labelledby="contact-heading">
      <div className="container-narrow">
        <SectionHeading
          title="Kontaktai"
          subtitle="Turite klausimų apie treniruotes ar registraciją? Susisiekite su mumis – mielai padėsime."
        />

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-vtc-blue-100 p-6">
            <h3 className="font-semibold text-vtc-blue-900">El. paštas</h3>
            <p className="mt-2 text-sm text-gray-600">
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="break-words transition-colors hover:text-vtc-blue-900"
              >
                {siteConfig.contact.email}
              </a>
            </p>
          </div>

          <div className="rounded-xl border border-vtc-blue-100 p-6">
            <h3 className="font-semibold text-vtc-blue-900">Telefonas</h3>
            <p className="mt-2 text-sm text-gray-600">
              <a
                href={siteConfig.contact.phoneLink}
                className="break-words transition-colors hover:text-vtc-blue-900"
              >
                {siteConfig.contact.phone}
              </a>
            </p>
          </div>

          <div className="rounded-xl border border-vtc-blue-100 p-6 sm:col-span-2 lg:col-span-1">
            <h3 className="font-semibold text-vtc-blue-900">Socialiniai tinklai</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href={siteConfig.social.facebook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-vtc-blue-700 hover:text-vtc-blue-900"
                >
                  Facebook: {siteConfig.social.facebook.name}
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.social.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-vtc-blue-700 hover:text-vtc-blue-900"
                >
                  Instagram: @{siteConfig.social.instagram.handle}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/kontaktai"
            className="inline-flex items-center gap-2 font-semibold text-vtc-blue-700 transition-colors hover:text-vtc-blue-900"
          >
            Visi kontaktai
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
