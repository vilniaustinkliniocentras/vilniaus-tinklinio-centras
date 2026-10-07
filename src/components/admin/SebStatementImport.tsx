"use client";

import { useState, type FormEvent } from "react";
import { importSebStatementAction } from "@/lib/actions/admin-payments";
import { Button } from "@/components/ui/Button";
import type { SebImportSummary } from "@/types/database";

export function SebStatementImport() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SebImportSummary | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setError(null);
    setSummary(null);

    try {
      const formData = new FormData(form);
      const result = await importSebStatementAction(formData);
      if (result.success) {
        setSummary(result.summary);
        setError(null);
        try {
          form.reset();
        } catch {
          // Resetting the file input must not turn a successful import into an error.
        }
        return;
      }

      setSummary(null);
      setError(result.message);
    } catch {
      setSummary(null);
      setError("Nepavyko importuoti išrašo. Bandykite dar kartą.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      className="rounded-xl border border-vtc-gray-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="seb-import-heading"
    >
      <h2 id="seb-import-heading" className="text-base font-semibold text-gray-900">
        Importuoti SEB išrašą
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Importuojamos tik įplaukos (kreditas). Išlaidos paliekamos išraše, bet
        nepriskiriamos vaikams. Vaikas susiejamas tik ranka.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="seb-statement-file" className="text-sm font-medium text-gray-700">
            CSV failas
          </label>
          <input
            id="seb-statement-file"
            name="statement"
            type="file"
            accept=".csv,text/csv"
            required
            disabled={isSubmitting}
            className="w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-vtc-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-vtc-blue-800"
          />
        </div>
        <Button type="submit" disabled={isSubmitting} className="min-h-12">
          {isSubmitting ? "Importuojama..." : "Importuoti SEB išrašą"}
        </Button>
      </form>

      {error && !summary ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {summary ? (
        <div
          className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
          role="status"
        >
          <p className="font-semibold">
            {summary.alreadyImportedFile ? "Jau importuota" : "Importas baigtas"}
          </p>
          <ul className="mt-2 space-y-0.5">
            <li>Naujos operacijos: {summary.imported}</li>
            <li>Jau importuotos: {summary.alreadyImported}</li>
            <li>Praleistos / netinkamos: {summary.skipped}</li>
            <li>Klaidos: {summary.errors}</li>
          </ul>
        </div>
      ) : null}
    </section>
  );
}
