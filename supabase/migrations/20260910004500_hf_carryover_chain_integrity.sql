-- Keep Hoiku Finance monthly budget carryover consistent when the next period
-- already exists, and prevent periods from being closed out of sequence.

begin;

create or replace function public.hf_ensure_budget_period(p_category_id uuid, p_year_month date)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_category public.hf_budget_categories%rowtype;
  v_month date := date_trunc('month', p_year_month)::date;
  v_prev_month date := (date_trunc('month', p_year_month)::date - interval '1 month')::date;
  v_prev public.hf_budget_periods%rowtype;
  v_existing public.hf_budget_periods%rowtype;
  v_carry bigint := 0;
  v_id uuid;
  v_fiscal_year_start_month integer := 4;
begin
  select * into v_category
  from public.hf_budget_categories
  where id = p_category_id and is_active;

  if not found then raise exception 'budget_category_not_found'; end if;
  if not hf_private.can_manage_facility_budget(v_category.facility_id) then
    raise exception 'budget_period_forbidden' using errcode = '42501';
  end if;

  select coalesce(s.fiscal_year_start_month, 4)::integer
    into v_fiscal_year_start_month
  from public.ho_accounting_facility_settings s
  where s.facility_id = v_category.facility_id
    and s.organization_id = v_category.organization_id;
  if not found then v_fiscal_year_start_month := 4; end if;

  select * into v_existing
  from public.hf_budget_periods
  where category_id = p_category_id and year_month = v_month
  for update;

  select * into v_prev
  from public.hf_budget_periods
  where category_id = p_category_id and year_month = v_prev_month;

  if found and v_prev.status = 'closed' and v_category.carryover_mode = 'monthly' then
    if extract(month from v_month)::integer <> v_fiscal_year_start_month
       or v_category.allow_fiscal_year_carryover then
      v_carry := v_prev.carryover_out;
    end if;
  end if;

  if v_existing.id is not null then
    if v_existing.status = 'open' and v_existing.carryover_in is distinct from v_carry then
      update public.hf_budget_periods
         set carryover_in = v_carry,
             updated_at = now()
       where id = v_existing.id;
    end if;
    return v_existing.id;
  end if;

  insert into public.hf_budget_periods(
    organization_id, facility_id, category_id, year_month, allocated_amount, carryover_in
  ) values (
    v_category.organization_id, v_category.facility_id, v_category.id, v_month,
    v_category.monthly_base_amount, v_carry
  )
  on conflict (category_id, year_month) do update set updated_at = public.hf_budget_periods.updated_at
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.hf_close_budget_period(p_period_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_period public.hf_budget_periods%rowtype;
  v_category public.hf_budget_categories%rowtype;
  v_prev public.hf_budget_periods%rowtype;
  v_next public.hf_budget_periods%rowtype;
  v_pending integer;
  v_used bigint;
  v_carry bigint;
  v_expected_in bigint := 0;
  v_next_carry bigint := 0;
  v_fiscal_year_start_month integer := 4;
  v_next_month date;
begin
  select * into v_period
  from public.hf_budget_periods
  where id = p_period_id
  for update;
  if not found then raise exception 'budget_period_not_found'; end if;

  if not (hf_private.can_manage_budget_config(v_period.facility_id)
          or (ho_private.current_user_role()='director' and ho_private.has_facility_access(v_period.facility_id))) then
    raise exception 'budget_close_forbidden' using errcode='42501';
  end if;

  select * into v_category
  from public.hf_budget_categories
  where id = v_period.category_id
    and organization_id = v_period.organization_id
    and facility_id = v_period.facility_id;
  if not found then raise exception 'budget_category_tenant_mismatch'; end if;

  if v_period.status='closed' then return v_period.carryover_out; end if;

  select coalesce(s.fiscal_year_start_month, 4)::integer
    into v_fiscal_year_start_month
  from public.ho_accounting_facility_settings s
  where s.facility_id = v_period.facility_id
    and s.organization_id = v_period.organization_id;
  if not found then v_fiscal_year_start_month := 4; end if;

  select * into v_prev
  from public.hf_budget_periods
  where category_id = v_period.category_id
    and year_month = (v_period.year_month - interval '1 month')::date;

  if v_prev.id is not null then
    if v_prev.status <> 'closed' then
      raise exception 'budget_previous_period_open';
    end if;
    if v_category.carryover_mode='monthly'
       and (extract(month from v_period.year_month)::integer <> v_fiscal_year_start_month
            or v_category.allow_fiscal_year_carryover) then
      v_expected_in := v_prev.carryover_out;
    end if;
    if v_period.carryover_in is distinct from v_expected_in then
      update public.hf_budget_periods
         set carryover_in = v_expected_in,
             updated_at = now()
       where id = v_period.id;
      v_period.carryover_in := v_expected_in;
    end if;
  end if;

  v_next_month := (v_period.year_month + interval '1 month')::date;
  select * into v_next
  from public.hf_budget_periods
  where category_id = v_period.category_id
    and year_month = v_next_month
  for update;

  if v_next.id is not null and v_next.status = 'closed' then
    raise exception 'budget_next_period_already_closed';
  end if;

  select count(*) into v_pending
  from public.hf_budget_spends
  where budget_period_id=p_period_id and status='submitted';
  if v_pending > 0 then raise exception 'budget_pending_spends_exist'; end if;

  select coalesce(sum(amount),0) into v_used
  from public.hf_budget_spends
  where budget_period_id=p_period_id and status='posted';

  if v_category.carryover_mode='monthly' then
    v_carry := greatest(0, v_period.allocated_amount + v_period.carryover_in + v_period.adjustment_amount - v_used);
  else
    v_carry := 0;
  end if;

  update public.hf_budget_periods
     set status='closed',
         carryover_out=v_carry,
         closed_at=now(),
         closed_by=ho_private.current_clerk_user_id(),
         updated_at=now()
   where id=p_period_id;

  if v_next.id is not null then
    if v_category.carryover_mode='monthly'
       and (extract(month from v_next_month)::integer <> v_fiscal_year_start_month
            or v_category.allow_fiscal_year_carryover) then
      v_next_carry := v_carry;
    end if;

    update public.hf_budget_periods
       set carryover_in = v_next_carry,
           updated_at = now()
     where id = v_next.id
       and status = 'open';
  end if;

  return v_carry;
end;
$$;

create or replace function public.hf_budget_carryover_integrity_contract()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
with adjacent as (
  select
    prev.id as prev_id,
    prev.status as prev_status,
    prev.carryover_out,
    nxt.id as next_id,
    nxt.status as next_status,
    nxt.carryover_in,
    nxt.year_month as next_month,
    c.carryover_mode,
    c.allow_fiscal_year_carryover,
    coalesce(s.fiscal_year_start_month, 4)::integer as fiscal_year_start_month
  from public.hf_budget_periods prev
  join public.hf_budget_categories c on c.id = prev.category_id
  join public.hf_budget_periods nxt
    on nxt.category_id = prev.category_id
   and nxt.year_month = (prev.year_month + interval '1 month')::date
  left join public.ho_accounting_facility_settings s
    on s.facility_id = c.facility_id
   and s.organization_id = c.organization_id
), carryover_mismatches as (
  select count(*)::bigint as mismatch_count
  from adjacent a
  where a.prev_status = 'closed'
    and a.carryover_in is distinct from (
      case
        when a.carryover_mode='monthly'
         and (extract(month from a.next_month)::integer <> a.fiscal_year_start_month
              or a.allow_fiscal_year_carryover)
          then a.carryover_out
        else 0
      end
    )
), out_of_order as (
  select count(*)::bigint as out_of_order_count
  from adjacent a
  where a.prev_status <> 'closed' and a.next_status = 'closed'
), function_guards as (
  select
    coalesce(position('budget_previous_period_open' in pg_get_functiondef(p.oid)) > 0, false) as previous_guard,
    coalesce(position('budget_next_period_already_closed' in pg_get_functiondef(p.oid)) > 0, false) as next_guard,
    coalesce(position('carryover_in = v_next_carry' in pg_get_functiondef(p.oid)) > 0, false) as propagation_guard
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='hf_close_budget_period'
    and pg_get_function_identity_arguments(p.oid)='p_period_id uuid'
)
select jsonb_build_object(
  'ready', m.mismatch_count = 0
           and o.out_of_order_count = 0
           and coalesce(g.previous_guard,false)
           and coalesce(g.next_guard,false)
           and coalesce(g.propagation_guard,false),
  'carryoverMismatchCount', m.mismatch_count,
  'outOfOrderClosedCount', o.out_of_order_count,
  'previousPeriodGuard', coalesce(g.previous_guard,false),
  'nextPeriodGuard', coalesce(g.next_guard,false),
  'propagationGuard', coalesce(g.propagation_guard,false)
)
from carryover_mismatches m
cross join out_of_order o
left join function_guards g on true;
$$;

revoke all on function public.hf_budget_carryover_integrity_contract() from public;
revoke all on function public.hf_budget_carryover_integrity_contract() from anon, authenticated;
grant execute on function public.hf_budget_carryover_integrity_contract() to service_role;

commit;
