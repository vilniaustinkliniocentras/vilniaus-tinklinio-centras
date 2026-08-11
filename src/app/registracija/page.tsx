import type { Metadata } from "next";
import { RegistrationForm } from "@/components/forms/RegistrationForm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Registracija",
  description:
    "Užregistruokite vaiką į Vilniaus tinklinio centro treniruotes. Užpildykite registracijos formą ir mes susisieksime su jumis.",
  path: "/registracija",
});
export default function RegistracijaPage() {
  return (
    <div className="section-padding bg-vtc-blue-50">
      <div className="container-narrow">
        <SectionHeading
          headingLevel={1}
          title="Registracija į treniruotes"
          subtitle="Užpildykite formą ir mes susisieksime dėl tinkamos treniruočių grupės parinkimo bei tolimesnių žingsnių."
        />

        <div className="mx-auto min-w-0 max-w-2xl rounded-xl bg-white p-4 shadow-sm sm:p-6 md:p-8">
          <RegistrationForm />
        </div>
      </div>
    </div>
  );
}
