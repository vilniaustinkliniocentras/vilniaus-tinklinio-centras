"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/actions/admin-auth";
import { adminUpdateRegistrationStatus } from "@/lib/supabase/admin";
import {
  isRegistrationStatus,
  type RegistrationStatus,
} from "@/lib/constants/registrations";

export async function updateRegistrationStatus(
  id: string,
  status: RegistrationStatus
): Promise<{ success: boolean; message: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return { success: false, message: "Neturite prieigos." };
  }

  if (!id?.trim()) {
    return { success: false, message: "Neteisingas registracijos identifikatorius." };
  }

  if (!isRegistrationStatus(status)) {
    return { success: false, message: "Neteisingas statusas." };
  }

  const result = await adminUpdateRegistrationStatus(id, status);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  revalidatePath("/admin/registracijos");

  return { success: true, message: "Statusas atnaujintas." };
}
