"use server";

import { revalidatePath } from "next/cache";
import { inviteCoach, type InviteCoachInput, type InviteCoachResult } from "@/lib/admin/invite-coach";

export async function inviteCoachAction(
  input: InviteCoachInput
): Promise<InviteCoachResult> {
  const result = await inviteCoach(input);
  if (result.success) {
    revalidatePath("/admin/grupes");
    revalidatePath("/treneris");
  }
  return result;
}
