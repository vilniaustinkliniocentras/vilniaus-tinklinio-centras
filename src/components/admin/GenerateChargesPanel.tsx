"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateMonthlyChargesAction } from "@/lib/actions/admin-billing";
import { formatBillingMonthLt } from "@/lib/admin/billing-month";
import type { GenerateChargesResult } from "@/lib/admin/billing-types";
import { Button } from "@/components/ui/Button";

function resultStorageKey(month: string): string {
  return `vtc-generate-charges:${month}`;
}

function readStoredResult(month: string): GenerateChargesResult | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(resultStorageKey(month));
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const value = parsed as GenerateChargesResult;
    if (
      typeof value.generated !== "number" ||
      typeof value.skippedExisting !== "number" ||
      typeof value.skippedNoRate !== "number" ||
      typeof value.eligibleAthletes !== "number"
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function GenerateChargesPanel({
  month,
  membershipWithoutChargeCount,
  membershipWithoutRateCount,
}: {
  month: string;
  membershipWithoutChargeCount: number;
  membershipWithoutRateCount: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateChargesResult | null>(null);

  useEffect(() => {
    setResult(readStoredResult(month));
  }, [month]);

  async function handleGenerate() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await generateMonthlyChargesAction(month);
      if (response.success) {
        setResult(response.result);
        setConfirming(false);
        try {
          sessionStorage.setItem(resultStorageKey(month), JSON.stringify(response.result));
        } catch {
          // Showing the result in memory is enough if storage is unavailable.
        }
        router.refresh();
      } else {
        setError(response.message);
      }
    } catch {
      setError("Nepavyko sugeneruoti mokesčių.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-vtc-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Mėnesio mokesčiai</h2>
          <p className="mt-1 text-sm text-gray-600">
            {formatBillingMonthLt(month)}. Generavimas saugus kartoti – esami mokesčiai
            neperrašomi.
          </p>
        </div>
        {!confirming ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setConfirming(true);
              setError(null);
            }}
            disabled={isSubmitting}
          >
            Sugeneruoti mokesčius
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void handleGenerate()}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Generuojama..." : "Patvirtinti generavimą"}
            </Button>
            <button
              type="button"
              className="text-sm font-semibold text-gray-600 hover:underline"
              disabled={isSubmitting}
              onClick={() => setConfirming(false)}
            >
              Atšaukti
            </button>
          </div>
        )}
      </div>

      {confirming ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Sugeneruoti {formatBillingMonthLt(month)} mokesčius sportininkams, kuriems yra
          narystė ir tarifas? Jau esantys mokesčiai nebus keičiami.
        </p>
      ) : null}

      {membershipWithoutChargeCount > 0 ? (
        <p
          className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
        >
          {membershipWithoutChargeCount}{" "}
          {membershipWithoutChargeCount === 1
            ? "sportininkas turi narystę, bet mėnesio mokestis dar nesugeneruotas."
            : "sportininkai turi narystę, bet mėnesio mokesčiai dar nesugeneruoti."}{" "}
          Tai nėra 0 EUR skola.
          {membershipWithoutRateCount > 0
            ? ` Be tarifo: ${membershipWithoutRateCount}.`
            : ""}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900"
          role="status"
        >
          <p className="font-semibold">Generavimo rezultatas</p>
          <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">
            <li>Tinkami sportininkai: {result.eligibleAthletes}</li>
            <li>Naujai sugeneruota: {result.generated}</li>
            <li>Praleista (jau buvo): {result.skippedExisting}</li>
            <li>Praleista (nėra tarifo): {result.skippedNoRate}</li>
          </ul>
        </div>
      ) : null}
    </section>
  );
}
