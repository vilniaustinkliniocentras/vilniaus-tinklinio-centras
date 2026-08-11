"use client";

import { useState, type FormEvent } from "react";
import { loginAdmin } from "@/lib/actions/admin-auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await loginAdmin(password);

    if (result.success) {
      window.location.reload();
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-4">
      <Input
        id="adminPassword"
        label="Administravimo slaptažodis"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Jungiamasi..." : "Prisijungti"}
      </Button>
    </form>
  );
}
