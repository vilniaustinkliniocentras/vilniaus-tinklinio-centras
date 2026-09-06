import type { DirectorSignatureAssets } from "@/lib/contracts/contract-block-renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CONTRACT_ASSETS_BUCKET,
  CONTRACT_SIGNATURE_OBJECT,
  CONTRACT_STAMP_OBJECT,
} from "@/lib/storage/contract-assets-config";

function bufferToPngDataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

async function downloadContractAsset(
  objectPath: string,
  label: string
): Promise<Buffer> {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error(
      "Supabase administracijos konfigūracija nebaigta. Nepavyko gauti sutarties parašo assetų."
    );
  }

  const { data, error } = await supabase.storage
    .from(CONTRACT_ASSETS_BUCKET)
    .download(objectPath);

  if (error || !data) {
    throw new Error(
      `Nepavyko gauti ${label} iš Supabase Storage (${objectPath}): ${error?.message ?? "failas nerastas"}`
    );
  }

  const buffer = Buffer.from(await data.arrayBuffer());

  if (buffer.length === 0) {
    throw new Error(`${label} failas tuščias (${objectPath}).`);
  }

  return buffer;
}

export async function getContractSignatureAssetsFromStorage(): Promise<DirectorSignatureAssets> {
  const [signatureBuffer, stampBuffer] = await Promise.all([
    downloadContractAsset(CONTRACT_SIGNATURE_OBJECT, "direktorės parašo"),
    downloadContractAsset(CONTRACT_STAMP_OBJECT, "klubo antspaudo"),
  ]);

  return {
    signatureSrc: bufferToPngDataUri(signatureBuffer),
    stampSrc: bufferToPngDataUri(stampBuffer),
  };
}
