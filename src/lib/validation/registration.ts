export interface RegistrationFormData {
  parentName: string;
  email: string;
  phone: string;
  childName: string;
  childBirthDate: string;
  experience: string;
  trainingGroup: string;
  referralSource: string;
  comments: string;
  privacyConsent: boolean;
}

export interface FormErrors {
  parentName?: string;
  email?: string;
  phone?: string;
  childName?: string;
  childBirthDate?: string;
  experience?: string;
  trainingGroup?: string;
  referralSource?: string;
  privacyConsent?: string;
}

export { TRAINING_GROUP_OPTIONS } from "@/lib/constants/training-groups";

export const EXPERIENCE_OPTIONS = [
  { value: "Neturi tinklinio patirties", label: "Neturi tinklinio patirties" },
  { value: "Lankė iki 1 metų", label: "Lankė iki 1 metų" },
  { value: "Lankė daugiau nei 1 metus", label: "Lankė daugiau nei 1 metus" },
  {
    value: "Žaidžia arba žaidė varžybose",
    label: "Žaidžia arba žaidė varžybose",
  },
] as const;

export const REFERRAL_SOURCE_OPTIONS = [
  { value: "Facebook", label: "Facebook" },
  { value: "Instagram", label: "Instagram" },
  { value: "Google paieška", label: "Google paieška" },
  { value: "Iš mokyklos", label: "Iš mokyklos" },
  { value: "Draugai / pažįstami", label: "Draugai / pažįstami" },
  { value: "Jau lankiau VTC", label: "Jau lankiau VTC" },
  { value: "Kita", label: "Kita" },
] as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+370|8)\d{8}$/;

export function validateRegistrationForm(
  data: RegistrationFormData
): FormErrors {
  const errors: FormErrors = {};

  if (!data.parentName.trim()) {
    errors.parentName = "Įveskite tėvo ar globėjo vardą ir pavardę.";
  } else if (data.parentName.trim().length < 3) {
    errors.parentName = "Vardas ir pavardė turi būti bent 3 simbolių.";
  }

  if (!data.email.trim()) {
    errors.email = "Įveskite el. pašto adresą.";
  } else if (!EMAIL_REGEX.test(data.email.trim())) {
    errors.email = "Įveskite teisingą el. pašto adresą.";
  }

  const normalizedPhone = data.phone.replace(/\s/g, "");
  if (!normalizedPhone) {
    errors.phone = "Įveskite telefono numerį.";
  } else if (!PHONE_REGEX.test(normalizedPhone)) {
    errors.phone =
      "Įveskite teisingą Lietuvos telefono numerį (pvz. +37061234567 arba 861234567).";
  }

  if (!data.childName.trim()) {
    errors.childName = "Įveskite vaiko vardą ir pavardę.";
  } else if (data.childName.trim().length < 3) {
    errors.childName = "Vardas ir pavardė turi būti bent 3 simbolių.";
  }

  if (!data.childBirthDate) {
    errors.childBirthDate = "Pasirinkite vaiko gimimo datą.";
  } else {
    const birthDate = new Date(data.childBirthDate);
    const today = new Date();
    if (birthDate > today) {
      errors.childBirthDate = "Gimimo data negali būti ateityje.";
    }
  }

  if (!data.experience) {
    errors.experience = "Pasirinkite tinklinio patirtį.";
  }

  if (!data.trainingGroup) {
    errors.trainingGroup = "Prašome pasirinkti treniruočių grupę.";
  }

  if (!data.referralSource) {
    errors.referralSource = "Pasirinkite, kaip apie mus sužinojote.";
  }

  if (!data.privacyConsent) {
    errors.privacyConsent =
      "Privalote sutikti su asmens duomenų tvarkymo taisyklėmis.";
  }

  return errors;
}

export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}
