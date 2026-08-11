/**
 * One-off verification script – tests anon INSERT into registrations.
 * Run: node scripts/verify-registration.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("FAIL: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

const testRow = {
  parent_name: "Testas Testauskas",
  parent_email: `test-${Date.now()}@example.com`,
  parent_phone: "+37061234567",
  child_name: "Vaikas Testauskas",
  child_birth_date: "2015-06-15",
  volleyball_experience: "Neturi patirties",
  preferred_training_times: "Pirmadieniais po 17 val.",
  additional_comments: "Automatinis testas – galima ištrinti",
  privacy_consent: true,
  status: "new",
};

const { error } = await supabase.from("registrations").insert(testRow);

if (error) {
  console.error("FAIL: Insert error:", error.message);
  process.exit(1);
}

console.log("OK: Registration inserted successfully");
