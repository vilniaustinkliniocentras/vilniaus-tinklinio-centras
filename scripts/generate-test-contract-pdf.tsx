import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToBuffer } from "@react-pdf/renderer";
import { mapRegistrationToContractFields } from "../src/lib/contracts/contract-fields";
import { registerContractFonts } from "../src/lib/contracts/register-contract-fonts";
import { VtcTrainingContract } from "../src/lib/contracts/vtc-training-contract";
import type { Registration } from "../src/types/database";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "docs", "test-contract-output.pdf");

const sampleRegistration: Registration = {
  id: "00000000-0000-4000-8000-000000000001",
  parent_name: "Jonas Petraitis",
  parent_email: "jonas.petraitis@example.com",
  parent_phone: "+37060000000",
  child_name: "Ona Petraitytė",
  child_birth_date: "2014-05-12",
  volleyball_experience: "none",
  training_group: "2014-2015",
  preferred_training_times: "17:00",
  referral_source: "web",
  additional_comments: null,
  privacy_consent: true,
  status: "new",
  created_at: "2026-01-01T00:00:00.000Z",
};

registerContractFonts();

async function main() {
  const fields = mapRegistrationToContractFields(sampleRegistration, new Date("2026-09-02"));
  const element = <VtcTrainingContract fields={fields} />;
  const buffer = await renderToBuffer(element);

  await fs.promises.writeFile(outputPath, buffer);
  console.log(`Test PDF written to ${outputPath} (${buffer.length} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
