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

const contractSecurityMigration = readFileSync(
  new URL("../supabase/migrations/20260910015900_harden_budget_period_contract_security_invoker.sql", import.meta.url),
  "utf8"
);
if (
  !contractSecurityMigration.includes("hf_budget_period_config_contract") ||
  !contractSecurityMigration.toLowerCase().includes("security invoker")
) {
  throw new Error("Finance period config contract must remain SECURITY INVOKER.");
}

const privilegedIntegrityMigration = readFileSync(
  new URL("../supabase/migrations/20260910022000_separate_public_build_contracts_from_privileged_integrity_contracts.sql", import.meta.url),
  "utf8"
);
for (const required of [
  "hf_budget_accounting_build_contract",
  "hf_budget_carryover_build_contract",
  "security invoker",
  "revoke execute on function public.hf_budget_accounting_integrity_contract() from public, anon, authenticated",
  "revoke execute on function public.hf_budget_carryover_integrity_contract() from public, anon, authenticated",
  "grant execute on function public.hf_budget_accounting_integrity_contract() to service_role",
  "grant execute on function public.hf_budget_carryover_integrity_contract() to service_role",
]) {
  if (!privilegedIntegrityMigration.toLowerCase().includes(required.toLowerCase())) {
    throw new Error(`Finance integrity privilege migration is missing guard: ${required}`);
  }
}

console.log("Finance carryover source contract: passed");
console.log("Finance period catalog contract invoker-security source guard: passed");
console.log("Finance live-data integrity diagnostics service-role-only source guard: passed");
