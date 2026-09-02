/**
 * One-off: generate a signed contract upload link for local testing.
 * Run: node scripts/generate-signed-contract-upload-link.mjs
 */
import { createHash, randomBytes } from "crypto";
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

function hashToken(token) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("FAIL: Missing Supabase env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: registrations, error: fetchError } = await supabase
  .from("registrations")
  .select("id, child_name, parent_name, created_at")
  .order("created_at", { ascending: false })
  .limit(1);

if (fetchError || !registrations?.length) {
  console.error("FAIL: Could not fetch registration:", fetchError?.message ?? "none found");
  process.exit(1);
}

const registration = registrations[0];
const token = randomBytes(32).toString("base64url");
const tokenHash = hashToken(token);
const createdAt = new Date().toISOString();

const { error: updateError } = await supabase
  .from("registrations")
  .update({
    signed_contract_upload_token_hash: tokenHash,
    signed_contract_upload_token_created_at: createdAt,
  })
  .eq("id", registration.id);

if (updateError) {
  console.error("FAIL: Could not save token hash:", updateError.message);
  process.exit(1);
}

const uploadUrl = `http://localhost:3000/sutartis/ikelti/${token}`;

console.log(JSON.stringify({
  registrationId: registration.id,
  childName: registration.child_name,
  parentName: registration.parent_name,
  uploadUrl,
}, null, 2));
