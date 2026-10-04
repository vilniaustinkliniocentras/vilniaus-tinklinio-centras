export const COACH_PASSWORD_MIN_LENGTH = 8;
export const COACH_PASSWORD_MAX_LENGTH = 128;

export function validateCoachPasswordPair(
  password: string,
  confirmPassword: string
): string | null {
  if (password.length < COACH_PASSWORD_MIN_LENGTH) {
    return `Slaptažodis turi būti bent ${COACH_PASSWORD_MIN_LENGTH} simbolių.`;
  }

  if (password.length > COACH_PASSWORD_MAX_LENGTH) {
    return `Slaptažodis negali būti ilgesnis nei ${COACH_PASSWORD_MAX_LENGTH} simbolių.`;
  }

  if (password !== confirmPassword) {
    return "Slaptažodžiai nesutampa.";
  }

  return null;
}
