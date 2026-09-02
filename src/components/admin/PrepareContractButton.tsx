interface PrepareContractButtonProps {
  registrationId: string;
}

export function PrepareContractButton({ registrationId }: PrepareContractButtonProps) {
  return (
    <a
      href={`/api/admin/registrations/${registrationId}/contract`}
      className="inline-flex min-h-9 items-center justify-center rounded-lg border border-vtc-navy/20 bg-white px-3 py-2 text-xs font-semibold text-vtc-navy transition-colors hover:border-vtc-navy hover:bg-vtc-navy/5"
    >
      Paruošti sutartį
    </a>
  );
}
