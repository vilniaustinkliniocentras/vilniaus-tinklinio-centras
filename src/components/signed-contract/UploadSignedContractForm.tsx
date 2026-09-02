"use client";

import { useRef, useState } from "react";
import { uploadSignedContractByToken } from "@/lib/actions/upload-signed-contract";
import { SIGNED_CONTRACT_MAX_BYTES } from "@/lib/storage/signed-contract-config";
import { Button } from "@/components/ui/Button";

interface UploadSignedContractFormProps {
  token: string;
  childName: string;
}

function formatMaxFileSizeMb(): number {
  return Math.round(SIGNED_CONTRACT_MAX_BYTES / (1024 * 1024));
}

export function UploadSignedContractForm({
  token,
  childName,
}: UploadSignedContractFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
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

    setSelectedFileName(file.name);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isUploading || successMessage) {
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Pasirinkite PDF failą.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadSignedContractByToken(token, formData);

    if (result.success) {
      setSuccessMessage(result.message);
      setSelectedFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      setError(result.message);
    }

    setIsUploading(false);
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
      >
        {isUploading ? "Įkeliama..." : "Įkelti pasirašytą sutartį"}
      </Button>
    </form>
  );
}
