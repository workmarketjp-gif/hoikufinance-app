create or replace function public.hf_get_operations_snapshot(p_facility_id uuid, p_year_month date)
returns table (
  facility_id uuid,
  facility_name text,
  capacity integer,
  enrolled_count integer,
  occupancy_rate numeric,
  income_total bigint,
  expense_total bigint,
  payroll_total bigint,
  net_result bigint,
  accounting_status text,
  inquiry_count integer,
  available_delegated_budget bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_month date := date_trunc('month', p_year_month)::date;
  v_next_month date := (date_trunc('month', p_year_month) + interval '1 month')::date;
  v_name text;
  v_capacity integer;
  v_enrolled integer;
  v_income bigint;
  v_expense bigint;
  v_payroll bigint;
  v_net bigint;
  v_status text;
  v_inquiries integer;
  v_budget bigint;
begin
  if not hf_private.can_manage_facility_budget(p_facility_id) then
    raise exception 'operations_snapshot_forbidden' using errcode = '42501';
  end if;

  select f.name, f.capacity into v_name, v_capacity
  from public.ho_facilities f
  where f.id = p_facility_id and f.status = 'active';
  if v_name is null then raise exception 'facility_not_found'; end if;

  select (
    coalesce(c.age_0_standard,0) + coalesce(c.age_0_short,0) +
    coalesce(c.age_1_standard,0) + coalesce(c.age_1_short,0) +
    coalesce(c.age_2_standard,0) + coalesce(c.age_2_short,0) +
    coalesce(c.age_3_standard,0) + coalesce(c.age_3_short,0) +
    coalesce(c.age_4_standard,0) + coalesce(c.age_4_short,0) +
    coalesce(c.age_5_standard,0) + coalesce(c.age_5_short,0)
  )::integer into v_enrolled
  from public.ho_child_count_monthly c
  where c.facility_id = p_facility_id and c.year_month = v_month
  order by c.updated_at desc
  limit 1;

  if v_enrolled is null then
    select sum(coalesce(c.total_count, coalesce(c.standard_time_count,0) + coalesce(c.short_time_count,0)))::integer
      into v_enrolled
    from public.ho_child_counts c
    where c.facility_id = p_facility_id and c.target_month = v_month;
  end if;

  select p.income_total, p.expense_total, p.payroll_total, p.net_result, p.status
    into v_income, v_expense, v_payroll, v_net, v_status
  from public.ho_accounting_monthly_periods p
  where p.facility_id = p_facility_id and p.year_month = v_month
  order by p.updated_at desc
  limit 1;

  select count(*)::integer into v_inquiries
  from public.ho_market_inquiries i
  where i.facility_id = p_facility_id
    and i.created_at >= v_month::timestamptz
    and i.created_at < v_next_month::timestamptz;

  with category_base as (
    select c.id, c.monthly_base_amount
    from public.hf_budget_categories c
    where c.facility_id = p_facility_id
      and c.is_active
      and c.budget_scope = 'facility_delegated'
  ), period_values as (
    select cb.id,
           coalesce(p.allocated_amount, cb.monthly_base_amount) as allocated,
           coalesce(p.carryover_in,0) as carryover_in,
           coalesce(p.adjustment_amount,0) as adjustment
    from category_base cb
    left join public.hf_budget_periods p on p.category_id = cb.id and p.year_month = v_month
  ), spend_values as (
    select s.category_id, coalesce(sum(s.amount),0)::bigint as reserved
    from public.hf_budget_spends s
    where s.facility_id = p_facility_id
      and s.spend_date >= v_month
      and s.spend_date < v_next_month
      and s.status in ('submitted','posted')
    group by s.category_id
  )
  select coalesce(sum(greatest(0, pv.allocated + pv.carryover_in + pv.adjustment - coalesce(sv.reserved,0))),0)::bigint
    into v_budget
  from period_values pv
  left join spend_values sv on sv.category_id = pv.id;

  return query select
    p_facility_id,
    v_name,
    v_capacity,
    v_enrolled,
    case when coalesce(v_capacity,0) > 0 and v_enrolled is not null then round((v_enrolled::numeric / v_capacity::numeric) * 100, 1) else null end,
    v_income,
    v_expense,
    v_payroll,
    v_net,
    v_status,
    v_inquiries,
    coalesce(v_budget,0);
end
$$;

revoke all on function public.hf_get_operations_snapshot(uuid,date) from public;
grant execute on function public.hf_get_operations_snapshot(uuid,date) to authenticated;
