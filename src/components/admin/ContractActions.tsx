import { PrepareContractButton } from "@/components/admin/PrepareContractButton";
import { ContractSentStatus, SendContractButton } from "@/components/admin/SendContractButton";
import type { ContractTestModeConfig } from "@/lib/email/contract-email-override";

interface ContractActionsProps {
  registrationId: string;
  childName: string;
  parentName: string;
  parentEmail: string;
  contractSentAt: string | null;
  contractTestMode: ContractTestModeConfig;
  onContractSent?: (sentAt: string, sentTo: string) => void;
}

export function ContractActions({
  registrationId,
  childName,
  parentName,
  parentEmail,
  contractSentAt,
  contractTestMode,
  onContractSent,
}: ContractActionsProps) {  return (
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
      </div>
      <ContractSentStatus contractSentAt={contractSentAt} />
    </div>
  );
}
