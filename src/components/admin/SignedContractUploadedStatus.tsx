function formatUploadedDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface SignedContractUploadedStatusProps {
  signedContractUploadedAt: string | null;
}

export function SignedContractUploadedStatus({
  signedContractUploadedAt,
}: SignedContractUploadedStatusProps) {
  return (
    <div className="mt-2 space-y-1">
      <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800 ring-1 ring-inset ring-green-200">
        Sutartis įkelta
      </span>
      {signedContractUploadedAt ? (
        <p className="text-xs text-gray-500">
          {formatUploadedDateTime(signedContractUploadedAt)}
        </p>
      ) : null}
    </div>
  );
}
