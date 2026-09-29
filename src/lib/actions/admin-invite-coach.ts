"use server";

import { inviteCoach, type InviteCoachInput, type InviteCoachResult } from "@/lib/admin/invite-coach";

/**
 * Phase 3 will attach an admin UI to this action.
 * It already requires isAdminAuthenticated() inside inviteCoach.
 */
export async function inviteCoachAction(
  input: InviteCoachInput
): Promise<InviteCoachResult> {
  return inviteCoach(input);
}
