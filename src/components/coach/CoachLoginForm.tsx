"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loginCoach } from "@/lib/actions/coach-auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function CoachLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await loginCoach(email, password);
      if (!result.success) {
        setError(result.message);
        setIsLoading(false);
        return;
      }

      router.replace("/treneris");
      router.refresh();
    } catch {
      setError("Nepavyko prisijungti. Patikrinkite el. paštą ir slaptažodį.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="coachEmail"
        label="El. paštas"
        type="email"
        inputMode="email"
        autoComplete="username"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Input
        id="coachPassword"
        label="Slaptažodis"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full min-h-12" disabled={isLoading}>
        {isLoading ? "Jungiamasi..." : "Prisijungti"}
      </Button>
    </form>
  );
}
