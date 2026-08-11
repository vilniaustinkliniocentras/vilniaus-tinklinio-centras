/**
 * Verify admin status update via service role (same path as server action).
 * Run: node scripts/verify-status-update.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("FAIL: Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const { data: rows, error: fetchError } = await supabase
  .from("registrations")
  .select("id, status")
  .order("created_at", { ascending: false })
  .limit(1);

if (fetchError || !rows?.length) {
  console.error("FAIL: No registrations to test:", fetchError?.message ?? "empty table");
  process.exit(1);
}

const target = rows[0];
const nextStatus = target.status === "contacted" ? "new" : "contacted";

const { error: updateError } = await supabase
  .from("registrations")
  .update({ status: nextStatus })
  .eq("id", target.id);

if (updateError) {
  console.error("FAIL: Update error:", updateError.message);
  process.exit(1);
}

const { data: verified, error: verifyError } = await supabase
  .from("registrations")
  .select("status")
  .eq("id", target.id)
  .single();

if (verifyError || verified?.status !== nextStatus) {
  console.error("FAIL: Status not persisted");
  process.exit(1);
}

console.log("OK: Status updated to", nextStatus, "for id", target.id);
