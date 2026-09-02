import { renderToBuffer } from "@react-pdf/renderer";
import {
  buildContractFilename,
  mapRegistrationToContractFields,
} from "@/lib/contracts/contract-fields";
import { registerContractFonts } from "@/lib/contracts/register-contract-fonts";
import { VtcTrainingContract } from "@/lib/contracts/vtc-training-contract";
import type { Registration } from "@/types/database";

export async function generateContractPdf(registration: Registration): Promise<{
  buffer: Buffer;
  filename: string;
}> {
  registerContractFonts();

  const fields = mapRegistrationToContractFields(registration, new Date());
  const element = <VtcTrainingContract fields={fields} />;
  const buffer = Buffer.from(await renderToBuffer(element));

  return {
    buffer,
    filename: buildContractFilename(registration.child_name),
  };
}
