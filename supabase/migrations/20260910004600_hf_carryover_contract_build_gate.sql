-- The contract exposes only integrity booleans/counts and is intentionally readable
-- by the publishable key so production builds can fail closed on Supabase drift.
begin;
grant execute on function public.hf_budget_carryover_integrity_contract() to anon, authenticated, service_role;
commit;
