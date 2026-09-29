"use client";

import { logoutCoach } from "@/lib/actions/coach-auth";
import { Button } from "@/components/ui/Button";

export function CoachLogoutButton() {
  async function handleLogout() {
    await logoutCoach();
  }

  return (
    <Button type="button" variant="outline" className="min-h-11" onClick={handleLogout}>
      Atsijungti
    </Button>
  );
}
