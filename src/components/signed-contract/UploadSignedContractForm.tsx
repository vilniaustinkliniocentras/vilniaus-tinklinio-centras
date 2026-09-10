"use client";

import { useRef, useState } from "react";
import {
  completeSignedContractUploadByToken,
  prepareSignedContractUploadByToken,
} from "@/lib/actions/upload-signed-contract";
import {
  SIGNED_CONTRACT_MAX_BYTES,
  SIGNED_CONTRACT_SERVER_STEP_TIMEOUT_MS,
} from "@/lib/storage/signed-contract-config";
import {
  fileLooksLikePdf,
  isAbortError,
  uploadPdfToSignedContractUrl,
  withClientTimeout,
} from "@/lib/storage/upload-signed-contract-browser";
import { Button } from "@/components/ui/Button";

interface UploadSignedContractFormProps {
  token: string;
  childName: string;
}

const UNEXPECTED_UPLOAD_ERROR_MESSAGE =
  "Nepavyko įkelti pasirašytos sutarties. Bandykite dar kartą.";
const UPLOAD_TIMEOUT_MESSAGE = "Įkėlimas užtruko per ilgai. Bandykite dar kartą.";

function formatMaxFileSizeMb(): number {
  return Math.round(SIGNED_CONTRACT_MAX_BYTES / (1024 * 1024));
}

function getErrorMessage(error: unknown): string {
  if (isAbortError(error)) {
    return UPLOAD_TIMEOUT_MESSAGE;
  }

  if (error instanceof Error && error.message.trim()) {
    const message = error.message;
    if (/body exceeded|413|too large|payload/i.test(message)) {
      return `Failas per didelis. Maksimalus dydis: ${formatMaxFileSizeMb()} MB.`;
    }
  }

  return UNEXPECTED_UPLOAD_ERROR_MESSAGE;
}

export function UploadSignedContractForm({
  token,
  childName,
}: UploadSignedContractFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploadingRef = useRef(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    setSuccessMessage(null);

    if (!file) {
      setSelectedFileName(null);
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setSelectedFileName(null);
      setError("Leidžiami tik PDF failai.");
      event.target.value = "";
      return;
    }

    if (file.size > SIGNED_CONTRACT_MAX_BYTES) {
      setSelectedFileName(null);
      setError(`Failas per didelis. Maksimalus dydis: ${formatMaxFileSizeMb()} MB.`);
      event.target.value = "";
      return;
    }

    if (!(await fileLooksLikePdf(file))) {
      setSelectedFileName(null);
      setError("Leidžiami tik PDF failai.");
      event.target.value = "";
      return;
    }

    setSelectedFileName(file.name);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isUploadingRef.current || isUploading || successMessage) {
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Pasirinkite PDF failą.");
      return;
    }

    isUploadingRef.current = true;
    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const prepared = await withClientTimeout(
        prepareSignedContractUploadByToken(token),
        SIGNED_CONTRACT_SERVER_STEP_TIMEOUT_MS,
        UPLOAD_TIMEOUT_MESSAGE
      );
      if (!prepared.success) {
        setError(prepared.message);
        return;
      }

      const uploaded = await uploadPdfToSignedContractUrl(prepared.signedUrl, file);
      if (!uploaded.success) {
        setError(uploaded.message);
        return;
      }

      const completed = await withClientTimeout(
        completeSignedContractUploadByToken(token, prepared.path),
        SIGNED_CONTRACT_SERVER_STEP_TIMEOUT_MS,
        UPLOAD_TIMEOUT_MESSAGE
      );
      if (!completed.success) {
        setError(completed.message);
        return;
      }

      setSuccessMessage(completed.message);
      setSelectedFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (uploadError) {
      console.error("Signed contract upload failed:", uploadError);
      setError(getErrorMessage(uploadError));
    } finally {
      isUploadingRef.current = false;
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-vtc-gray-200 bg-vtc-gray-50 px-4 py-3 text-sm text-gray-700">
        <p>
          <span className="text-gray-500">Vaikas:</span>{" "}
          <span className="font-medium text-gray-900">{childName}</span>
        </p>
      </div>

      <div>
        <label
          htmlFor="signed-contract-file"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Pasirašyta sutartis (PDF)
        </label>
        <input
          ref={fileInputRef}
          id="signed-contract-file"
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          disabled={isUploading || Boolean(successMessage)}
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-vtc-blue-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-vtc-blue-900 hover:file:bg-vtc-blue-200 disabled:opacity-60"
        />
        <p className="mt-2 text-xs text-gray-500">
          Leidžiamas formatas: PDF. Maksimalus dydis: {formatMaxFileSizeMb()} MB.
        </p>
        {selectedFileName ? (
          <p className="mt-2 text-sm text-gray-600">Pasirinktas failas: {selectedFileName}</p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {successMessage ? (
        <p className="text-sm font-medium text-green-700" role="status">
          {successMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full sm:w-auto"
        disabled={isUploading || Boolean(successMessage)}
        aria-busy={isUploading}
      >
        {isUploading ? "Įkeliama..." : "Įkelti pasirašytą sutartį"}
      </Button>
    </form>
  );
}
