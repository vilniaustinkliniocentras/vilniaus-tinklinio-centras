import { CreateUploadLinkButton } from "@/components/admin/CreateUploadLinkButton";
import { DownloadSignedContractButton } from "@/components/admin/DownloadSignedContractButton";
import { PrepareContractButton } from "@/components/admin/PrepareContractButton";
import { SignedContractUploadedStatus } from "@/components/admin/SignedContractUploadedStatus";
import { ContractSentStatus, SendContractButton } from "@/components/admin/SendContractButton";
import type { ContractTestModeConfig } from "@/lib/email/contract-email-override";
import { isSignedContractUploaded } from "@/lib/storage/signed-contracts";

interface ContractActionsProps {
  registrationId: string;
  childName: string;
  parentName: string;
  parentEmail: string;
  contractSentAt: string | null;
  signedContractPath: string | null;
  signedContractUploadedAt: string | null;
  contractTestMode: ContractTestModeConfig;
  onContractSent?: (sentAt: string, sentTo: string) => void;
}

export function ContractActions({
  registrationId,
  childName,
  parentName,
  parentEmail,
  contractSentAt,
  signedContractPath,
  signedContractUploadedAt,
  contractTestMode,
  onContractSent,
}: ContractActionsProps) {
  const hasSignedContract = isSignedContractUploaded({
    signed_contract_path: signedContractPath,
    signed_contract_uploaded_at: signedContractUploadedAt,
  });

  return (
    <div className="min-w-[170px]">
      <div className="flex flex-col gap-2">
        <PrepareContractButton registrationId={registrationId} />
        <SendContractButton
          registrationId={registrationId}
          childName={childName}
          parentName={parentName}
          parentEmail={parentEmail}
          contractSentAt={contractSentAt}
          contractTestMode={contractTestMode}
          onSent={onContractSent}
        />
        <CreateUploadLinkButton registrationId={registrationId} />
        {hasSignedContract ? (
          <DownloadSignedContractButton registrationId={registrationId} />
        ) : null}
      </div>
      {hasSignedContract ? (
        <SignedContractUploadedStatus
          signedContractUploadedAt={signedContractUploadedAt}
        />
      ) : null}
      <ContractSentStatus contractSentAt={contractSentAt} />
    </div>
  );
}
