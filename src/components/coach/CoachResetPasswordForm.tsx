"use client";

import { useState, type FormEvent } from "react";
import { updateCoachPasswordAfterRecovery } from "@/lib/actions/coach-auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function CoachResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await updateCoachPasswordAfterRecovery(
        password,
        confirmPassword
      );
      if (!result.success) {
        setError(result.message);
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="coachNewPassword"
        label="Naujas slaptažodis"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Input
        id="coachConfirmPassword"
        label="Pakartokite slaptažodį"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full min-h-12" disabled={isLoading}>
        {isLoading ? "Saugoma..." : "Išsaugoti naują slaptažodį"}
      </Button>
    </form>
  );
}
