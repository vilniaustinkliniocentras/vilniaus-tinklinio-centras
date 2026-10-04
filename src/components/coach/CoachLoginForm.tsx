"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loginCoach, requestCoachPasswordReset } from "@/lib/actions/coach-auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function CoachLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
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

  async function handleForgotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setForgotSuccess(null);
    setIsLoading(true);

    try {
      const result = await requestCoachPasswordReset(email);
      setForgotSuccess(result.message);
    } catch {
      setForgotSuccess(
        "Jei paskyra su šiuo el. paštu egzistuoja, išsiuntėme slaptažodžio atkūrimo nuorodą."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (showForgotPassword) {
    return (
      <form onSubmit={handleForgotSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Įveskite savo el. paštą. Atsiųsime slaptažodžio atkūrimo nuorodą.
        </p>
        <Input
          id="coachForgotEmail"
          label="El. paštas"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {forgotSuccess && (
          <p className="text-sm text-green-700" role="status">
            {forgotSuccess}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full min-h-12" disabled={isLoading}>
          {isLoading ? "Siunčiama..." : "Siųsti atkūrimo nuorodą"}
        </Button>

        <button
          type="button"
          className="w-full text-sm font-medium text-vtc-blue-700 hover:text-vtc-blue-800"
          onClick={() => {
            setShowForgotPassword(false);
            setError(null);
            setForgotSuccess(null);
          }}
        >
          Grįžti į prisijungimą
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleLoginSubmit} className="space-y-4">
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

      <div className="text-right">
        <button
          type="button"
          className="text-sm font-medium text-vtc-blue-700 hover:text-vtc-blue-800"
          onClick={() => {
            setShowForgotPassword(true);
            setError(null);
            setForgotSuccess(null);
          }}
        >
          Pamiršote slaptažodį?
        </button>
      </div>

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
