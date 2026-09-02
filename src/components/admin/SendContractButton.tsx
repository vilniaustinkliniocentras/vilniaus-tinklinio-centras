"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sendContractEmail } from "@/lib/actions/send-contract-email";
import type { ContractTestModeConfig } from "@/lib/email/contract-email-override";
import { Button } from "@/components/ui/Button";

interface SendContractButtonProps {
  registrationId: string;
  childName: string;
  parentName: string;
  parentEmail: string;
  contractSentAt: string | null;
  contractTestMode: ContractTestModeConfig;
  onSent?: (sentAt: string, sentTo: string) => void;
}

function formatSentDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SendContractButton({
  registrationId,
  childName,
  parentName,
  parentEmail,
  contractSentAt,
  contractTestMode,
  onSent,
}: SendContractButtonProps) {
  const isTestMode = contractTestMode.enabled;
  const testRecipient = contractTestMode.recipient;
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  function openModal() {
    if (isSending) return;
    setIsOpen(true);
  }

  function closeModal() {
    if (isSending) return;
    setIsOpen(false);
  }

  async function handleConfirmSend() {
    if (isSending) return;

    setIsSending(true);
    setError(null);
    setSuccessMessage(null);

    const result = await sendContractEmail(registrationId, Boolean(contractSentAt));

    if (result.success) {
      setSuccessMessage(result.message);
      if (result.contractSentAt && result.contractSentTo) {
        onSent?.(result.contractSentAt, result.contractSentTo);
      }
      router.refresh();
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMessage(null);
      }, 1200);
    } else {
      setError(result.message);
    }

    setIsSending(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-vtc-navy/20 bg-vtc-navy px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-vtc-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Siųsti sutartį
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
            aria-labelledby="send-contract-title"
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="send-contract-title" className="text-lg font-bold text-gray-900">
              Siųsti sutartį
            </h2>

            {contractSentAt ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Ši sutartis jau buvo išsiųsta {formatSentDateTime(contractSentAt)}. Ar tikrai
                norite siųsti dar kartą?
              </p>
            ) : null}

            {isTestMode ? (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                <p className="font-semibold uppercase tracking-wide">Testavimo režimas</p>
                <p className="mt-1">Laiškas nebus siunčiamas tėvams.</p>
                <p className="mt-1">
                  Testinis gavėjas:{" "}
                  <span className="font-medium">{testRecipient}</span>
                </p>
              </div>
            ) : null}

            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <p className="font-medium text-gray-900">Ar tikrai norite išsiųsti sutartį?</p>
              <p>
                <span className="text-gray-500">Vaikas:</span> {childName}
              </p>
              {!isTestMode ? (
                <>
                  <p>
                    <span className="text-gray-500">Gavėjas:</span> {parentName}
                  </p>
                  <p>
                    <span className="text-gray-500">El. paštas:</span> {parentEmail}
                  </p>
                  <p className="text-gray-500">
                    Sutartis bus išsiųsta šiuo el. pašto adresu.
                  </p>
                </>
              ) : (
                <p className="text-gray-500">
                  Sutartis bus išsiųsta testiniu el. pašto adresu, nurodytu aukščiau.
                </p>
              )}
            </div>

            {error ? (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            {successMessage ? (
              <p className="mt-4 text-sm font-medium text-green-700" role="status">
                {successMessage}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={isSending}
              >
                Atšaukti
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSend}
                disabled={isSending || Boolean(successMessage)}
              >
                {isSending ? "Siunčiama..." : "Taip, siųsti sutartį"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ContractSentStatus({
  contractSentAt,
}: {
  contractSentAt: string | null;
}) {
  if (!contractSentAt) {
    return null;
  }

  return (
    <p className="mt-2 text-xs text-gray-500">
      Sutartis išsiųsta: {formatSentDateTime(contractSentAt)}
    </p>
  );
}
