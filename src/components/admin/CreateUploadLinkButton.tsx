"use client";

import { useEffect, useState } from "react";
import { createSignedContractUploadLink } from "@/lib/actions/create-upload-link";
import { Button } from "@/components/ui/Button";

interface CreateUploadLinkButtonProps {
  registrationId: string;
}

export function CreateUploadLinkButton({ registrationId }: CreateUploadLinkButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function openModal() {
    if (isGenerating) return;
    setIsOpen(true);
    setError(null);
    setCopied(false);
  }

  function closeModal() {
    if (isGenerating) return;
    setIsOpen(false);
    setUploadUrl(null);
    setError(null);
    setCopied(false);
  }

  async function handleGenerateLink() {
    if (isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setCopied(false);

    const result = await createSignedContractUploadLink(registrationId);

    if (result.success) {
      setUploadUrl(result.uploadUrl);
    } else {
      setUploadUrl(null);
      setError(result.message);
    }

    setIsGenerating(false);
  }

  useEffect(() => {
    if (isOpen) {
      void handleGenerateLink();
    } else {
      setUploadUrl(null);
      setError(null);
      setCopied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, registrationId]);

  async function handleCopyLink() {
    if (!uploadUrl) return;

    try {
      await navigator.clipboard.writeText(uploadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Nepavyko nukopijuoti nuorodos.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-vtc-navy/20 bg-white px-3 py-2 text-xs font-semibold text-vtc-navy transition-colors hover:bg-vtc-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Sukurti įkėlimo nuorodą
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-upload-link-title"
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="create-upload-link-title" className="text-lg font-bold text-gray-900">
              Įkėlimo nuoroda
            </h2>

            <p className="mt-3 text-sm text-gray-600">
              Sugeneruokite saugią nuorodą pasirašytai sutarčiai įkelti. Nuoroda galioja 30
              dienų ir po sėkmingo įkėlimo nebegalioja.
            </p>

            {error ? (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            {uploadUrl ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-gray-900">Nuoroda sukurta:</p>
                <p className="break-all rounded-lg border border-vtc-gray-200 bg-vtc-gray-50 px-3 py-2 text-xs text-gray-700">
                  {uploadUrl}
                </p>
                <Button type="button" variant="outline" onClick={handleCopyLink}>
                  {copied ? "Nukopijuota" : "Kopijuoti nuorodą"}
                </Button>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={closeModal} disabled={isGenerating}>
                Uždaryti
              </Button>
              <Button type="button" onClick={handleGenerateLink} disabled={isGenerating}>
                {isGenerating
                  ? "Generuojama..."
                  : uploadUrl
                    ? "Generuoti naują nuorodą"
                    : "Generuoti nuorodą"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
