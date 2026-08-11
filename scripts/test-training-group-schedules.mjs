/**
 * Verifies training group → preferred_training_times mapping against Supabase.
 * Run: node scripts/test-training-group-schedules.mjs
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const TRAINING_GROUPS = [
  {
    value: "2016–2014 m. mišri pradedančiųjų grupė",
    schedule: "Pirmadieniais ir trečiadieniais 16:00–17:00",
  },
  {
    value: "2014–2012 m. mergaičių pradedančiųjų / lengvai pažengusiųjų grupė",
    schedule: "Pirmadieniais ir trečiadieniais 17:00–18:00",
  },
  {
    value: "2012–2008 m. pažengusiųjų vaikinų grupė",
    schedule: "Pirmadieniais ir trečiadieniais 18:00–19:00",
  },
  {
    value: "2012–2008 m. lengvai pažengusiųjų merginų grupė",
    schedule: "Pirmadieniais ir trečiadieniais 19:00–20:00",
  },
  {
    value: "Nežinau – padėkite parinkti tinkamiausią grupę",
    schedule: null,
  },
];

function getPreferredTrainingTimes(trainingGroup) {
  return TRAINING_GROUPS.find((g) => g.value === trainingGroup)?.schedule ?? null;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const insertedIds = [];

try {
  for (const [index, group] of TRAINING_GROUPS.entries()) {
    const preferredTimes = getPreferredTrainingTimes(group.value);
    const payload = {
      parent_name: "Test Tėvas",
      parent_email: `test-schedule-${index}@example.com`,
      parent_phone: "+37060000001",
      child_name: "Test Vaikas",
      child_birth_date: "2015-01-01",
      volleyball_experience: "Neturi tinklinio patirties",
      training_group: group.value,
      preferred_training_times: preferredTimes,
      referral_source: "Kita",
      additional_comments: "Automatinis tvarkaraščio testas",
      privacy_consent: true,
      status: "new",
    };

    const response = await fetch(`${url}/rest/v1/registrations`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Insert failed for "${group.value}": ${response.status} ${body}`);
    }

    const [row] = await response.json();
    insertedIds.push(row.id);

    const okGroup = row.training_group === group.value;
    const okSchedule = row.preferred_training_times === group.schedule;

    console.log(
      okGroup && okSchedule ? "PASS" : "FAIL",
      `- ${group.value}`,
      `\n  training_group: ${row.training_group}`,
      `\n  preferred_training_times: ${row.preferred_training_times}`
    );

    if (!okGroup || !okSchedule) {
      throw new Error("Stored values do not match expected mapping");
    }
  }

  console.log("\nAll 5 training group schedule tests passed.");
} finally {
  for (const id of insertedIds) {
    await fetch(`${url}/rest/v1/registrations?id=eq.${id}`, {
      method: "DELETE",
      headers,
    });
  }
}
