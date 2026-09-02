"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { fetchRegistrationById, markContractSent } from "@/lib/admin/registrations";
import { generateContractPdf } from "@/lib/contracts/generate-contract-pdf";
import { sendContractEmailWithPdf } from "@/lib/email/contract-email";
import { resolveContractRecipientEmail } from "@/lib/email/contract-email-override";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function sendContractEmail(
  registrationId: string,
  forceResend = false
): Promise<{
  success: boolean;
  message: string;
  contractSentAt?: string;
  contractSentTo?: string;
}> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!UUID_REGEX.test(registrationId)) {
    return { success: false, message: "Neteisingas registracijos identifikatorius." };
  }

  const registration = await fetchRegistrationById(registrationId);
  if (!registration) {
    return { success: false, message: "Registracija nerasta." };
  }

  if (registration.contract_sent_at && !forceResend) {
    return {
      success: false,
      message: "Sutartis jau buvo išsiųsta. Patvirtinkite pakartotinį siuntimą.",
    };
  }

  try {
    const { buffer, filename } = await generateContractPdf(registration);
    const recipientEmail = resolveContractRecipientEmail(registration.parent_email);

    await sendContractEmailWithPdf({
      to: recipientEmail,
      parentName: registration.parent_name.trim(),
      childName: registration.child_name.trim(),
      filename,
      pdfBuffer: buffer,
    });

    const markResult = await markContractSent(registrationId, recipientEmail);
    if (!markResult.success) {
      return { success: false, message: markResult.message };
    }

    revalidatePath("/admin/registracijos");

    return {
      success: true,
      message: "Sutartis išsiųsta",
      contractSentAt: markResult.contractSentAt,
      contractSentTo: markResult.contractSentTo,
    };
  } catch (error) {
    console.error(
      "Contract email send failed:",
      error instanceof Error ? error.message : error
    );
    return {
      success: false,
      message: "Nepavyko išsiųsti sutarties. Bandykite dar kartą.",
    };
  }
}
