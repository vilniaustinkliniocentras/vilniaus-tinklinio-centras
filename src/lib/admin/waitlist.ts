import "server-only";

import { adminFetchRegistrationAthleteStatuses } from "@/lib/admin/athletes";
import { fetchRegistrationById } from "@/lib/admin/registrations";

export const WAITLIST_CONTRACT_BLOCK_MESSAGE =
  "Laukiančiųjų sąrašo registracijai sutartis nesiunčiama.";

export async function waitlistBlocksNewContract(registrationId: string): Promise<
  | { blocked: false }
  | { blocked: true; missing: boolean; message: string }
> {
  const registration = await fetchRegistrationById(registrationId);
  if (!registration) {
    return { blocked: true, missing: true, message: "Registracija nerasta." };
  }

  if (registration.is_waitlist !== true) {
    return { blocked: false };
  }

  const state = await adminFetchRegistrationAthleteStatuses();
  if (state.success && state.statuses[registrationId]?.isCurrentlyAttending) {
    return { blocked: false };
  }

  return {
    blocked: true,
    missing: false,
    message: WAITLIST_CONTRACT_BLOCK_MESSAGE,
  };
}
