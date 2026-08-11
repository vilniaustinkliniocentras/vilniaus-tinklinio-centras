"use client";

import { logoutAdmin } from "@/lib/actions/admin-auth";
import { Button } from "@/components/ui/Button";

export function AdminLogoutButton() {
  async function handleLogout() {
    await logoutAdmin();
    window.location.reload();
  }

  return (
    <Button type="button" variant="outline" onClick={handleLogout}>
      Atsijungti
    </Button>
  );
}
