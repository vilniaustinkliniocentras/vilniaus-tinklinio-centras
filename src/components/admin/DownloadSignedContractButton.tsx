interface DownloadSignedContractButtonProps {
  registrationId: string;
}

export function DownloadSignedContractButton({
  registrationId,
}: DownloadSignedContractButtonProps) {
  return (
    <a
      href={`/api/admin/registrations/${registrationId}/signed-contract`}
      className="inline-flex min-h-9 items-center justify-center rounded-lg border border-green-600/20 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800 transition-colors hover:border-green-600 hover:bg-green-100"
    >
      Atsisiųsti pasirašytą sutartį
    </a>
  );
}
