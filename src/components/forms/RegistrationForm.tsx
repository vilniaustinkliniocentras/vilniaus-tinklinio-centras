"use client";

import { useRef, useState, type FormEvent } from "react";
import { submitRegistration } from "@/lib/actions/submit-registration";
import { siteConfig } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  EXPERIENCE_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
  type FormErrors,
  type RegistrationFormData,
  validateRegistrationForm,
  hasErrors,
} from "@/lib/validation/registration";
import {
  formatTrainingGroupOptionLabel,
  formatTrainingGroupScheduleDisplay,
  getTrainingGroupSchedule,
  TRAINING_GROUPS,
} from "@/lib/constants/training-groups";

const initialFormData: RegistrationFormData = {
  parentName: "",
  email: "",
  phone: "",
  childName: "",
  childBirthDate: "",
  experience: "",
  trainingGroup: "",
  referralSource: "",
  comments: "",
  privacyConsent: false,
};

const registrationSuccessContact = {
  phone: siteConfig.contact.phone,
  email: siteConfig.contact.email,
  phoneLink: siteConfig.contact.phoneLink,
};

export function RegistrationForm() {
  const [formData, setFormData] = useState<RegistrationFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  function handleChange(
    field: keyof RegistrationFormData,
    value: string | boolean
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSubmitError(null);
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof FormErrors];
        return next;
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmittingRef.current) return;

    setSubmitError(null);
    setIsSubmitting(true);
    isSubmittingRef.current = true;

    const validationErrors = validateRegistrationForm(formData);
    setErrors(validationErrors);

    if (hasErrors(validationErrors)) {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }

    const result = await submitRegistration(formData);

    if (result.success) {
      setFormData(initialFormData);
      setErrors({});
      setIsSubmitted(true);
    } else {
      if (result.errors) {
        setErrors(result.errors);
      }
      setSubmitError(result.message);
    }

    setIsSubmitting(false);
    isSubmittingRef.current = false;
  }

  if (isSubmitted) {
    return (
      <div
        className="rounded-xl border-2 border-green-200 bg-green-50 p-5 text-center sm:p-8"
        role="status"
        aria-live="polite"
      >
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
          aria-hidden="true"
        >
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-green-900 sm:text-2xl">
          Registracija sėkmingai gauta!
        </h2>
        <p className="mt-3 text-green-800">
          Dėkojame už registraciją.
          <br />
          Per artimiausias 24 valandas su Jumis susisieksime dėl pirmosios treniruotės.
        </p>
        <div className="mt-6 space-y-3 text-left text-sm text-green-800">
          <div>
            <p className="font-medium">Jeigu turite klausimų:</p>
            <p>
              <a
                href={registrationSuccessContact.phoneLink}
                className="break-all font-medium underline hover:text-green-900"
              >
                {registrationSuccessContact.phone}
              </a>
            </p>
            <p>
              <a
                href={`mailto:${registrationSuccessContact.email}`}
                className="break-all font-medium underline hover:text-green-900"
              >
                {registrationSuccessContact.email}
              </a>
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-6 border-green-600 text-green-700 hover:bg-green-100"
          onClick={() => {
            setFormData(initialFormData);
            setErrors({});
            setSubmitError(null);
            setIsSubmitted(false);
          }}
        >
          Pateikti naują registraciją
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="min-w-0 space-y-6">
      {submitError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
          aria-live="assertive"
        >
          {submitError}
        </div>
      )}

      <fieldset className="space-y-6" disabled={isSubmitting}>
        <legend className="text-base font-semibold text-vtc-blue-900 sm:text-lg">
          Tėvo / globėjo duomenys
        </legend>

        <Input
          id="parentName"
          label="Tėvo / globėjo vardas ir pavardė"
          type="text"
          autoComplete="name"
          required
          value={formData.parentName}
          onChange={(e) => handleChange("parentName", e.target.value)}
          error={errors.parentName}
          placeholder="Pvz. Jonas Jonaitis"
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            id="email"
            label="El. paštas"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            error={errors.email}
            placeholder="pvz. vardas@pastas.lt"
          />

          <Input
            id="phone"
            label="Telefono numeris"
            type="tel"
            autoComplete="tel"
            required
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            error={errors.phone}
            placeholder="Pvz. +37061234567"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-6" disabled={isSubmitting}>
        <legend className="text-base font-semibold text-vtc-blue-900 sm:text-lg">
          Vaiko duomenys
        </legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            id="childName"
            label="Vaiko vardas ir pavardė"
            type="text"
            required
            value={formData.childName}
            onChange={(e) => handleChange("childName", e.target.value)}
            error={errors.childName}
            placeholder="Pvz. Petras Petraitis"
          />

          <Input
            id="childBirthDate"
            label="Vaiko gimimo data"
            type="date"
            required
            value={formData.childBirthDate}
            onChange={(e) => handleChange("childBirthDate", e.target.value)}
            error={errors.childBirthDate}
          />
        </div>

        <Select
          id="experience"
          label="Tinklinio patirtis"
          required
          options={[...EXPERIENCE_OPTIONS]}
          value={formData.experience}
          onChange={(e) => handleChange("experience", e.target.value)}
          error={errors.experience}
        />

        <div>
          <Select
            id="trainingGroup"
            label="Treniruočių grupė"
            required
            options={TRAINING_GROUPS.map((option) => ({
              value: option.value,
              label: formatTrainingGroupOptionLabel(option),
            }))}
            value={formData.trainingGroup}
            onChange={(e) => handleChange("trainingGroup", e.target.value)}
            error={errors.trainingGroup}
            className="text-sm leading-snug sm:text-base"
          />
          <p id="trainingGroup-hint" className="mt-1.5 break-words text-sm leading-relaxed text-gray-500">
            Nežinote, kuri grupė tinkamiausia? Pasirinkite „Nežinau“ – susisieksime ir
            padėsime parinkti grupę pagal vaiko amžių ir patirtį.
          </p>
          {getTrainingGroupSchedule(formData.trainingGroup) && (
            <p className="mt-1.5 break-words text-sm leading-relaxed text-gray-600">
              Treniruočių laikas:{" "}
              {formatTrainingGroupScheduleDisplay(
                getTrainingGroupSchedule(formData.trainingGroup)!
              )}
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-6" disabled={isSubmitting}>
        <legend className="text-base font-semibold text-vtc-blue-900 sm:text-lg">
          Papildoma informacija
        </legend>

        <Select
          id="referralSource"
          label="Kaip apie mus sužinojote?"
          required
          options={[...REFERRAL_SOURCE_OPTIONS]}
          value={formData.referralSource}
          onChange={(e) => handleChange("referralSource", e.target.value)}
          error={errors.referralSource}
        />

        <Textarea
          id="comments"
          label="Papildoma informacija (neprivaloma)"
          value={formData.comments}
          onChange={(e) => handleChange("comments", e.target.value)}
          placeholder="Bet kokia papildoma informacija, kuri gali būti naudinga (nebūtina)"
        />
      </fieldset>

      <Checkbox
        id="privacyConsent"
        required
        disabled={isSubmitting}
        checked={formData.privacyConsent}
        onChange={(e) => handleChange("privacyConsent", e.target.checked)}
        error={errors.privacyConsent}
        label={
          <>
            Sutinku, kad mano ir mano vaiko asmens duomenys būtų tvarkomi registracijos
            tikslais pagal{" "}
            <a
              href="/kontaktai"
              className="font-medium text-vtc-blue-700 underline hover:text-vtc-blue-900"
            >
              privatumo politiką
            </a>
            . *
          </>
        }
      />

      <Button
        type="submit"
        size="lg"
        className="min-h-12 w-full sm:w-auto"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Siunčiama...
          </span>
        ) : (
          "Pateikti registraciją"
        )}
      </Button>
    </form>
  );
}
