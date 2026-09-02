import { Document, Page } from "@react-pdf/renderer";
import type { ContractFields } from "@/lib/contracts/contract-fields";
import { ContractBlocks, contractStyles } from "@/lib/contracts/contract-block-renderer";
import { buildContractDocument } from "@/lib/contracts/parse-contract-document";

interface VtcTrainingContractProps {
  fields: ContractFields;
}

export function VtcTrainingContract({ fields }: VtcTrainingContractProps) {
  const blocks = buildContractDocument(fields);

  return (
    <Document>
      <Page size="A4" style={contractStyles.page} wrap>
        <ContractBlocks blocks={blocks} />
      </Page>
    </Document>
  );
}
