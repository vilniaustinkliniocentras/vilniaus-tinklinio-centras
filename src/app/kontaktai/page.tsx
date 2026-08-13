import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { siteConfig } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Kontaktai",
  description:
    "Susisiekite su Vilniaus tinklinio centru dėl treniruočių, registracijos ar kitų klausimų.",
  path: "/kontaktai",
});
export default function KontaktaiPage() {
  return (
    <div className="section-padding bg-white">
      <div className="container-narrow">
        <SectionHeading
          headingLevel={1}
          title="Kontaktai"
          subtitle="Turite klausimų apie treniruotes, registraciją ar klubo veiklą? Susisiekite su mumis – mielai padėsime."
        />

        <div className="mx-auto grid max-w-3xl gap-8">
          <div className="rounded-xl border border-vtc-blue-100 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-vtc-blue-900">Susisiekite</h2>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">El. paštas</dt>
                <dd className="mt-1 text-gray-700">
                  <a
                    href={`mailto:${siteConfig.contact.email}`}
                    className="break-words transition-colors hover:text-vtc-blue-900"
                  >
                    {siteConfig.contact.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Telefonas</dt>
                <dd className="mt-1 text-gray-700">
                  <a
                    href={siteConfig.contact.phoneLink}
                    className="break-words transition-colors hover:text-vtc-blue-900"
                  >
                    {siteConfig.contact.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Treniruočių vieta</dt>
                <dd className="mt-1 text-gray-700">
                  {siteConfig.contact.venue}
                  <br />
                  {siteConfig.contact.address}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-vtc-blue-100 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-vtc-blue-900">Socialiniai tinklai</h2>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href={siteConfig.social.facebook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full break-words text-vtc-blue-700 transition-colors hover:text-vtc-blue-900"
                >
                  Facebook: {siteConfig.social.facebook.name}
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.social.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full break-words text-vtc-blue-700 transition-colors hover:text-vtc-blue-900"
                >
                  Instagram: @{siteConfig.social.instagram.handle}
                </a>
              </li>
            </ul>
          </div>

          <div className="rounded-xl bg-vtc-blue-50 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-vtc-blue-900">Privatumo politika</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Registracijos metu renkame tėvo/globėjo ir vaiko asmens duomenis tik
              registracijos ir komunikacijos tikslais. Duomenys saugomi saugiai ir nėra
              perduodami tretiesiems asmenims be jūsų sutikimo. Išsamios privatumo politikos
              tekstas bus paskelbtas netrukus.
            </p>
          </div>

          <div className="text-center sm:text-left">
            <p className="text-gray-600">Norite užregistruoti vaiką į treniruotes?</p>
            <Link
              href="/registracija"
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-vtc-blue-700 px-6 py-3 font-semibold text-white transition-colors hover:bg-vtc-blue-800 sm:w-auto"
            >
              Registruotis
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
