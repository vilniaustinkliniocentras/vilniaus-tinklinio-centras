export interface ContractTestModeConfig {
  enabled: boolean;
  recipient: string | null;
}

function normalizeOverrideValue(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  if (!trimmed || trimmed === "undefined" || trimmed === "null") {
    return null;
  }

  return trimmed.toLowerCase();
}

export function getContractEmailOverride(): string | null {
  return normalizeOverrideValue(process.env.CONTRACT_EMAIL_OVERRIDE);
}

export function getContractTestModeConfig(): ContractTestModeConfig {
  const recipient = getContractEmailOverride();

  return {
    enabled: recipient !== null,
    recipient,
  };
}

export function resolveContractRecipientEmail(parentEmail: string): string {
  const override = getContractEmailOverride();
  if (override) {
    return override;
  }

  return parentEmail.trim().toLowerCase();
}
