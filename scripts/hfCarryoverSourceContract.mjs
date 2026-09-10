import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20260910005500_hf_budget_gap_and_zero_spend_close_integrity.sql", import.meta.url),
  "utf8"
);

for (const required of [
  "budget_previous_period_open",
  "budget_previous_period_missing",
  "budget_next_period_already_closed",
  "budget_later_period_already_closed",
  "carryover_in = v_next_carry",
  "gapCount",
  "ensureGapGuard",
  "closeGapGuard",
  "laterClosedGuard",
  "hf_budget_carryover_integrity_contract",
]) {
  if (!migration.includes(required)) {
    throw new Error(`Finance carryover migration is missing guard: ${required}`);
  }
}

console.log("Finance carryover source contract: passed");
