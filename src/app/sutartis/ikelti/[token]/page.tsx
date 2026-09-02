import type { Metadata } from "next";
import { UploadSignedContractForm } from "@/components/signed-contract/UploadSignedContractForm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { fetchSignedContractUploadContextByToken } from "@/lib/storage/signed-contract-upload-token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pasirašytos sutarties įkėlimas",
  robots: {
    index: false,
    follow: false,
  },
};

interface UploadSignedContractPageProps {
  params: Promise<{ token: string }>;
}

export default async function UploadSignedContractPage({
  params,
}: UploadSignedContractPageProps) {
  const { token } = await params;
  const context = await fetchSignedContractUploadContextByToken(token);

  if (!context) {
    return (
      <div className="section-padding bg-vtc-blue-50">
        <div className="container-narrow">
          <div className="mx-auto min-w-0 max-w-2xl rounded-xl bg-white p-6 shadow-sm sm:p-8">
            <h1 className="font-display text-2xl font-bold text-gray-900">
              Pasirašytos sutarties įkėlimas
            </h1>
            <p className="mt-4 text-sm text-gray-600" role="alert">
              Nuoroda negalioja.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-padding bg-vtc-blue-50">
      <div className="container-narrow">
        <SectionHeading
          headingLevel={1}
          title="Pasirašytos sutarties įkėlimas"
          subtitle="Įkelkite pasirašytą tinklinio treniruočių sutartį PDF formatu."
        />

        <div className="mx-auto min-w-0 max-w-2xl rounded-xl bg-white p-4 shadow-sm sm:p-6 md:p-8">
          <UploadSignedContractForm token={token} childName={context.childName} />
        </div>
      </div>
    </div>
  );
}
