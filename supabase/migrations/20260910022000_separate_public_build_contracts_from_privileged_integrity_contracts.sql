-- Public build checks inspect metadata only. Full live-data integrity diagnostics are service-role-only.
create or replace function public.hf_budget_accounting_build_contract()
returns jsonb
language sql
stable
security invoker
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $function$
with approval_function as (
  select p.oid, pg_get_functiondef(p.oid) as definition,
    not has_function_privilege('anon', p.oid, 'EXECUTE') as anonymous_blocked,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_allowed
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='hf_approve_budget_spend'
    and pg_get_function_identity_arguments(p.oid)='p_spend_id uuid'
), trigger_state as (
  select exists (
    select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='hf_budget_spends'
      and t.tgname='hf_budget_spends_posted_accounting_guard' and not t.tgisinternal and t.tgenabled <> 'D'
  ) as guard_enabled
), checks as (
  select t.guard_enabled,
    exists(select 1 from approval_function) as approval_function_exists,
    coalesce((select anonymous_blocked from approval_function limit 1),false) as anonymous_approval_blocked,
    coalesce((select authenticated_allowed from approval_function limit 1),false) as authenticated_approval_allowed,
    coalesce((select position('accounting_can_approve' in definition)>0 from approval_function limit 1),false) as canonical_role_guard,
    coalesce((select position('ho_accounting_review_expense' in definition)>0 from approval_function limit 1),false) as canonical_review_delegate
  from trigger_state t
)
select jsonb_build_object(
  'ready',guard_enabled and approval_function_exists and anonymous_approval_blocked and authenticated_approval_allowed and canonical_role_guard and canonical_review_delegate,
  'guardEnabled',guard_enabled,
  'approvalFunctionExists',approval_function_exists,
  'anonymousApprovalBlocked',anonymous_approval_blocked,
  'authenticatedApprovalAllowed',authenticated_approval_allowed,
  'canonicalRoleGuard',canonical_role_guard,
  'canonicalReviewDelegate',canonical_review_delegate
) from checks;
$function$;

create or replace function public.hf_budget_carryover_build_contract()
returns jsonb
language sql
stable
security invoker
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $function$
with function_guards as (
  select
    coalesce((select position('budget_previous_period_open' in pg_get_functiondef(p.oid))>0 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='hf_close_budget_period' and pg_get_function_identity_arguments(p.oid)='p_period_id uuid'),false) as previous_guard,
    coalesce((select position('budget_next_period_already_closed' in pg_get_functiondef(p.oid))>0 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='hf_close_budget_period' and pg_get_function_identity_arguments(p.oid)='p_period_id uuid'),false) as next_guard,
    coalesce((select position('carryover_in = v_next_carry' in pg_get_functiondef(p.oid))>0 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='hf_close_budget_period' and pg_get_function_identity_arguments(p.oid)='p_period_id uuid'),false) as propagation_guard,
    coalesce((select position('budget_previous_period_missing' in pg_get_functiondef(p.oid))>0 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='hf_ensure_budget_period' and pg_get_function_identity_arguments(p.oid)='p_category_id uuid, p_year_month date'),false) as ensure_gap_guard,
    coalesce((select position('budget_previous_period_missing' in pg_get_functiondef(p.oid))>0 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='hf_close_budget_period' and pg_get_function_identity_arguments(p.oid)='p_period_id uuid'),false) as close_gap_guard,
    coalesce((select position('budget_later_period_already_closed' in pg_get_functiondef(p.oid))>0 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='hf_close_budget_period' and pg_get_function_identity_arguments(p.oid)='p_period_id uuid'),false) as later_closed_guard
)
select jsonb_build_object(
  'ready',previous_guard and next_guard and propagation_guard and ensure_gap_guard and close_gap_guard and later_closed_guard,
  'previousPeriodGuard',previous_guard,
  'nextPeriodGuard',next_guard,
  'propagationGuard',propagation_guard,
  'ensureGapGuard',ensure_gap_guard,
  'closeGapGuard',close_gap_guard,
  'laterClosedGuard',later_closed_guard
) from function_guards;
$function$;

grant execute on function public.hf_budget_accounting_build_contract() to anon, authenticated, service_role;
grant execute on function public.hf_budget_carryover_build_contract() to anon, authenticated, service_role;
revoke execute on function public.hf_budget_accounting_integrity_contract() from public, anon, authenticated;
revoke execute on function public.hf_budget_carryover_integrity_contract() from public, anon, authenticated;
grant execute on function public.hf_budget_accounting_integrity_contract() to service_role;
grant execute on function public.hf_budget_carryover_integrity_contract() to service_role;
