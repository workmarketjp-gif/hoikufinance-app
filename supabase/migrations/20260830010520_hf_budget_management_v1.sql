create schema if not exists hf_private;

revoke all on schema hf_private from public;
grant usage on schema hf_private to authenticated;

create table if not exists public.hf_budget_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ho_organizations(id) on delete cascade,
  facility_id uuid not null references public.ho_facilities(id) on delete cascade,
  code text not null,
  name text not null,
  description text not null default '',
  budget_scope text not null default 'facility_delegated' check (budget_scope in ('facility_delegated','head_office','staff_return')),
  monthly_base_amount bigint not null default 0 check (monthly_base_amount >= 0),
  carryover_mode text not null default 'monthly' check (carryover_mode in ('monthly','none')),
  allow_fiscal_year_carryover boolean not null default false,
  approval_limit bigint not null default 0 check (approval_limit >= 0),
  visibility text not null default 'manager' check (visibility in ('staff','manager','hq')),
  accounting_category text not null default '',
  is_active boolean not null default true,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (facility_id, code)
);

create table if not exists public.hf_budget_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ho_organizations(id) on delete cascade,
  facility_id uuid not null references public.ho_facilities(id) on delete cascade,
  category_id uuid not null references public.hf_budget_categories(id) on delete cascade,
  year_month date not null check (extract(day from year_month) = 1),
  allocated_amount bigint not null default 0 check (allocated_amount >= 0),
  carryover_in bigint not null default 0 check (carryover_in >= 0),
  adjustment_amount bigint not null default 0,
  carryover_out bigint not null default 0 check (carryover_out >= 0),
  status text not null default 'open' check (status in ('open','closed')),
  closed_at timestamptz,
  closed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, year_month)
);

create table if not exists public.hf_budget_spends (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ho_organizations(id) on delete cascade,
  facility_id uuid not null references public.ho_facilities(id) on delete cascade,
  category_id uuid not null references public.hf_budget_categories(id) on delete restrict,
  budget_period_id uuid not null references public.hf_budget_periods(id) on delete restrict,
  spend_date date not null,
  amount bigint not null check (amount > 0),
  vendor_name text not null default '',
  description text not null,
  evidence_url text,
  payment_method text not null default 'other' check (payment_method in ('cash','bank','card','transfer','other')),
  tax_category text not null default '',
  status text not null default 'submitted' check (status in ('submitted','posted','rejected','cancelled')),
  requested_by text not null,
  submitted_at timestamptz not null default now(),
  approved_by text,
  approved_at timestamptz,
  rejected_by text,
  rejected_at timestamptz,
  rejection_reason text,
  ho_accounting_expense_id uuid references public.ho_accounting_expenses(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hf_budget_categories_facility_active_idx on public.hf_budget_categories(facility_id, is_active);
create index if not exists hf_budget_periods_facility_month_idx on public.hf_budget_periods(facility_id, year_month);
create index if not exists hf_budget_spends_facility_date_idx on public.hf_budget_spends(facility_id, spend_date desc);
create index if not exists hf_budget_spends_period_status_idx on public.hf_budget_spends(budget_period_id, status);

create or replace function hf_private.has_facility_membership(target_facility_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(auth.role() = 'service_role', false)
      or session_user in ('postgres','supabase_admin')
      or ho_private.has_facility_access(target_facility_id)
      or exists (
        select 1
        from public.ho_people pe
        join public.ho_facility_memberships m
          on m.person_id = pe.id
         and m.facility_id = target_facility_id
         and m.status = 'active'
         and (m.ended_at is null or m.ended_at > now())
        where pe.clerk_user_id = ho_private.current_clerk_user_id()
          and pe.status = 'active'
      )
$$;

create or replace function hf_private.is_hq_budget_role()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(auth.role() = 'service_role', false)
      or session_user in ('postgres','supabase_admin')
      or ho_private.current_user_role() in ('owner','admin','office_manager','accounting_manager')
$$;

create or replace function hf_private.can_manage_budget_config(target_facility_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(auth.role() = 'service_role', false)
      or session_user in ('postgres','supabase_admin')
      or (
        ho_private.has_facility_access(target_facility_id)
        and hf_private.is_hq_budget_role()
      )
$$;

create or replace function hf_private.can_manage_facility_budget(target_facility_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(auth.role() = 'service_role', false)
      or session_user in ('postgres','supabase_admin')
      or (
        ho_private.has_facility_access(target_facility_id)
        and ho_private.current_user_role() in ('owner','admin','director','office_manager','accounting_manager','chief_teacher')
      )
$$;

create or replace function hf_private.can_view_budget(target_facility_id uuid, target_visibility text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case target_visibility
    when 'hq' then hf_private.can_manage_budget_config(target_facility_id)
    when 'manager' then hf_private.can_manage_facility_budget(target_facility_id)
    when 'staff' then hf_private.has_facility_membership(target_facility_id)
    else false
  end
$$;

create or replace function hf_private.category_can_view(target_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.hf_budget_categories c
    where c.id = target_category_id
      and c.is_active
      and hf_private.can_view_budget(c.facility_id, c.visibility)
  )
$$;

alter table public.hf_budget_categories enable row level security;
alter table public.hf_budget_periods enable row level security;
alter table public.hf_budget_spends enable row level security;

revoke all on public.hf_budget_categories from anon, authenticated;
revoke all on public.hf_budget_periods from anon, authenticated;
revoke all on public.hf_budget_spends from anon, authenticated;
grant select on public.hf_budget_categories to authenticated;
grant select on public.hf_budget_periods to authenticated;
grant select on public.hf_budget_spends to authenticated;

create policy hf_budget_categories_select on public.hf_budget_categories
for select to authenticated
using (hf_private.can_view_budget(facility_id, visibility));

create policy hf_budget_periods_select on public.hf_budget_periods
for select to authenticated
using (hf_private.category_can_view(category_id));

create policy hf_budget_spends_select on public.hf_budget_spends
for select to authenticated
using (hf_private.can_manage_facility_budget(facility_id));

create or replace function public.hf_upsert_budget_category(
  p_id uuid,
  p_facility_id uuid,
  p_code text,
  p_name text,
  p_description text,
  p_budget_scope text,
  p_monthly_base_amount bigint,
  p_carryover_mode text,
  p_allow_fiscal_year_carryover boolean,
  p_approval_limit bigint,
  p_visibility text,
  p_accounting_category text,
  p_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_id uuid;
  v_code text;
begin
  if not hf_private.can_manage_budget_config(p_facility_id) then
    raise exception 'budget_config_forbidden' using errcode = '42501';
  end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'budget_name_required'; end if;
  if p_monthly_base_amount < 0 or p_approval_limit < 0 then raise exception 'budget_amount_invalid'; end if;
  if p_budget_scope not in ('facility_delegated','head_office','staff_return') then raise exception 'budget_scope_invalid'; end if;
  if p_carryover_mode not in ('monthly','none') then raise exception 'budget_carryover_invalid'; end if;
  if p_visibility not in ('staff','manager','hq') then raise exception 'budget_visibility_invalid'; end if;

  select organization_id into v_org from public.ho_facilities where id = p_facility_id;
  if v_org is null then raise exception 'facility_not_found'; end if;
  v_code := coalesce(nullif(trim(p_code),''), 'budget_' || substr(replace(gen_random_uuid()::text,'-',''),1,10));

  if p_id is null then
    insert into public.hf_budget_categories(
      organization_id, facility_id, code, name, description, budget_scope,
      monthly_base_amount, carryover_mode, allow_fiscal_year_carryover,
      approval_limit, visibility, accounting_category, is_active, created_by, updated_by
    ) values (
      v_org, p_facility_id, v_code, trim(p_name), coalesce(p_description,''), p_budget_scope,
      p_monthly_base_amount, p_carryover_mode, coalesce(p_allow_fiscal_year_carryover,false),
      p_approval_limit, p_visibility, coalesce(nullif(trim(p_accounting_category),''), trim(p_name)),
      coalesce(p_is_active,true), ho_private.current_clerk_user_id(), ho_private.current_clerk_user_id()
    ) returning id into v_id;
  else
    update public.hf_budget_categories
       set code = v_code,
           name = trim(p_name),
           description = coalesce(p_description,''),
           budget_scope = p_budget_scope,
           monthly_base_amount = p_monthly_base_amount,
           carryover_mode = p_carryover_mode,
           allow_fiscal_year_carryover = coalesce(p_allow_fiscal_year_carryover,false),
           approval_limit = p_approval_limit,
           visibility = p_visibility,
           accounting_category = coalesce(nullif(trim(p_accounting_category),''), trim(p_name)),
           is_active = coalesce(p_is_active,true),
           updated_by = ho_private.current_clerk_user_id(),
           updated_at = now()
     where id = p_id and facility_id = p_facility_id
     returning id into v_id;
    if v_id is null then raise exception 'budget_category_not_found'; end if;
  end if;
  return v_id;
end
$$;

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
  v_carry bigint := 0;
  v_id uuid;
begin
  select * into v_category from public.hf_budget_categories where id = p_category_id and is_active;
  if not found then raise exception 'budget_category_not_found'; end if;
  if not hf_private.can_manage_facility_budget(v_category.facility_id) then
    raise exception 'budget_period_forbidden' using errcode = '42501';
  end if;

  select id into v_id from public.hf_budget_periods where category_id = p_category_id and year_month = v_month;
  if v_id is not null then return v_id; end if;

  select * into v_prev from public.hf_budget_periods where category_id = p_category_id and year_month = v_prev_month;
  if found and v_prev.status = 'closed' and v_category.carryover_mode = 'monthly' then
    if extract(month from v_month) <> 4 or v_category.allow_fiscal_year_carryover then
      v_carry := v_prev.carryover_out;
    end if;
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
end
$$;

create or replace function public.hf_create_budget_spend(
  p_category_id uuid,
  p_spend_date date,
  p_amount bigint,
  p_vendor_name text,
  p_description text,
  p_evidence_url text,
  p_payment_method text,
  p_tax_category text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_category public.hf_budget_categories%rowtype;
  v_period public.hf_budget_periods%rowtype;
  v_period_id uuid;
  v_reserved bigint;
  v_available bigint;
  v_id uuid;
begin
  if p_amount <= 0 then raise exception 'budget_spend_amount_invalid'; end if;
  if coalesce(trim(p_description),'') = '' then raise exception 'budget_spend_description_required'; end if;
  if p_payment_method not in ('cash','bank','card','transfer','other') then raise exception 'budget_payment_method_invalid'; end if;

  select * into v_category from public.hf_budget_categories where id = p_category_id and is_active and budget_scope = 'facility_delegated';
  if not found then raise exception 'budget_category_not_found'; end if;
  if not hf_private.can_manage_facility_budget(v_category.facility_id) then
    raise exception 'budget_spend_forbidden' using errcode = '42501';
  end if;

  v_period_id := public.hf_ensure_budget_period(p_category_id, p_spend_date);
  select * into v_period from public.hf_budget_periods where id = v_period_id for update;
  if v_period.status <> 'open' then raise exception 'budget_period_closed'; end if;

  select coalesce(sum(amount),0) into v_reserved
  from public.hf_budget_spends
  where budget_period_id = v_period_id and status in ('submitted','posted');

  v_available := v_period.allocated_amount + v_period.carryover_in + v_period.adjustment_amount - v_reserved;
  if p_amount > v_available then
    raise exception 'budget_insufficient_available_amount';
  end if;

  insert into public.hf_budget_spends(
    organization_id, facility_id, category_id, budget_period_id, spend_date, amount,
    vendor_name, description, evidence_url, payment_method, tax_category,
    status, requested_by
  ) values (
    v_category.organization_id, v_category.facility_id, v_category.id, v_period_id, p_spend_date, p_amount,
    coalesce(p_vendor_name,''), trim(p_description), nullif(trim(coalesce(p_evidence_url,'')),''),
    p_payment_method, coalesce(p_tax_category,''), 'submitted', ho_private.current_clerk_user_id()
  ) returning id into v_id;

  return v_id;
end
$$;

create or replace function public.hf_approve_budget_spend(p_spend_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_spend public.hf_budget_spends%rowtype;
  v_category public.hf_budget_categories%rowtype;
  v_role text;
  v_month date;
  v_accounting_period_id uuid;
  v_accounting_status text;
  v_expense_id uuid;
begin
  select * into v_spend from public.hf_budget_spends where id = p_spend_id for update;
  if not found then raise exception 'budget_spend_not_found'; end if;
  if v_spend.status <> 'submitted' then raise exception 'budget_spend_not_submitted'; end if;
  select * into v_category from public.hf_budget_categories where id = v_spend.category_id;
  v_role := ho_private.current_user_role();

  if not (
    hf_private.can_manage_budget_config(v_spend.facility_id)
    or (v_role = 'director' and ho_private.has_facility_access(v_spend.facility_id) and v_spend.amount <= v_category.approval_limit)
  ) then
    raise exception 'budget_approval_forbidden' using errcode = '42501';
  end if;

  if not ho_private.accounting_can_write(v_spend.facility_id) then
    raise exception 'accounting_write_forbidden' using errcode = '42501';
  end if;

  v_month := date_trunc('month', v_spend.spend_date)::date;
  insert into public.ho_accounting_monthly_periods(organization_id, facility_id, year_month, status)
  values (v_spend.organization_id, v_spend.facility_id, v_month, 'open')
  on conflict (facility_id, year_month) do nothing;

  select id, status into v_accounting_period_id, v_accounting_status
  from public.ho_accounting_monthly_periods
  where facility_id = v_spend.facility_id and year_month = v_month;

  if v_accounting_period_id is null then raise exception 'accounting_period_not_found'; end if;
  if v_accounting_status in ('closed','exported') then raise exception 'accounting_period_closed'; end if;

  insert into public.ho_accounting_expenses(
    organization_id, facility_id, expense_date, year_month, category, vendor_name,
    description, amount, tax_category, payment_method, receipt_url, memo, status,
    submitted_by, submitted_at, approved_by, approved_at, period_id
  ) values (
    v_spend.organization_id, v_spend.facility_id, v_spend.spend_date, v_month,
    coalesce(nullif(v_category.accounting_category,''), v_category.name), v_spend.vendor_name,
    v_spend.description, v_spend.amount, v_spend.tax_category, v_spend.payment_method,
    v_spend.evidence_url, 'Hoiku Finance 園予算から連携', 'approved',
    v_spend.requested_by, v_spend.submitted_at, ho_private.current_clerk_user_id(), now(), v_accounting_period_id
  ) returning id into v_expense_id;

  update public.hf_budget_spends
     set status = 'posted', approved_by = ho_private.current_clerk_user_id(), approved_at = now(),
         ho_accounting_expense_id = v_expense_id, updated_at = now()
   where id = v_spend.id;

  return v_expense_id;
end
$$;

create or replace function public.hf_reject_budget_spend(p_spend_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_spend public.hf_budget_spends%rowtype;
  v_category public.hf_budget_categories%rowtype;
  v_role text;
begin
  select * into v_spend from public.hf_budget_spends where id = p_spend_id for update;
  if not found then raise exception 'budget_spend_not_found'; end if;
  if v_spend.status <> 'submitted' then raise exception 'budget_spend_not_submitted'; end if;
  select * into v_category from public.hf_budget_categories where id = v_spend.category_id;
  v_role := ho_private.current_user_role();
  if not (
    hf_private.can_manage_budget_config(v_spend.facility_id)
    or (v_role = 'director' and ho_private.has_facility_access(v_spend.facility_id) and v_spend.amount <= v_category.approval_limit)
  ) then
    raise exception 'budget_rejection_forbidden' using errcode = '42501';
  end if;
  update public.hf_budget_spends
     set status='rejected', rejected_by=ho_private.current_clerk_user_id(), rejected_at=now(),
         rejection_reason=coalesce(nullif(trim(p_reason),''),'承認されませんでした'), updated_at=now()
   where id=p_spend_id;
end
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
  v_pending integer;
  v_used bigint;
  v_carry bigint;
begin
  select * into v_period from public.hf_budget_periods where id = p_period_id for update;
  if not found then raise exception 'budget_period_not_found'; end if;
  if not (hf_private.can_manage_budget_config(v_period.facility_id) or (ho_private.current_user_role()='director' and ho_private.has_facility_access(v_period.facility_id))) then
    raise exception 'budget_close_forbidden' using errcode='42501';
  end if;
  if v_period.status='closed' then return v_period.carryover_out; end if;
  select count(*) into v_pending from public.hf_budget_spends where budget_period_id=p_period_id and status='submitted';
  if v_pending > 0 then raise exception 'budget_pending_spends_exist'; end if;
  select coalesce(sum(amount),0) into v_used from public.hf_budget_spends where budget_period_id=p_period_id and status='posted';
  select * into v_category from public.hf_budget_categories where id=v_period.category_id;
  if v_category.carryover_mode='monthly' then
    v_carry := greatest(0, v_period.allocated_amount + v_period.carryover_in + v_period.adjustment_amount - v_used);
  else
    v_carry := 0;
  end if;
  update public.hf_budget_periods
     set status='closed', carryover_out=v_carry, closed_at=now(), closed_by=ho_private.current_clerk_user_id(), updated_at=now()
   where id=p_period_id;
  return v_carry;
end
$$;

create or replace function public.hf_get_budget_summary(p_facility_id uuid, p_year_month date)
returns table (
  category_id uuid,
  code text,
  name text,
  description text,
  budget_scope text,
  visibility text,
  approval_limit bigint,
  accounting_category text,
  period_id uuid,
  period_status text,
  allocated_amount bigint,
  carryover_in bigint,
  adjustment_amount bigint,
  submitted_amount bigint,
  spent_amount bigint,
  available_amount bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with accessible as (
    select c.*
    from public.hf_budget_categories c
    where c.facility_id = p_facility_id
      and c.is_active
      and hf_private.can_view_budget(c.facility_id, c.visibility)
  ), periods as (
    select p.* from public.hf_budget_periods p
    where p.year_month = date_trunc('month', p_year_month)::date
  ), spend_totals as (
    select s.category_id,
           sum(s.amount) filter (where s.status='submitted')::bigint as submitted_amount,
           sum(s.amount) filter (where s.status='posted')::bigint as spent_amount
    from public.hf_budget_spends s
    where s.facility_id=p_facility_id
      and s.spend_date >= date_trunc('month', p_year_month)::date
      and s.spend_date < (date_trunc('month', p_year_month) + interval '1 month')::date
      and s.status in ('submitted','posted')
    group by s.category_id
  )
  select c.id, c.code, c.name, c.description, c.budget_scope, c.visibility,
         c.approval_limit, c.accounting_category,
         p.id, coalesce(p.status,'not_open'),
         coalesce(p.allocated_amount,c.monthly_base_amount), coalesce(p.carryover_in,0), coalesce(p.adjustment_amount,0),
         coalesce(st.submitted_amount,0), coalesce(st.spent_amount,0),
         greatest(0,
           coalesce(p.allocated_amount,c.monthly_base_amount) + coalesce(p.carryover_in,0) + coalesce(p.adjustment_amount,0)
           - coalesce(st.submitted_amount,0) - coalesce(st.spent_amount,0)
         )::bigint
  from accessible c
  left join periods p on p.category_id=c.id
  left join spend_totals st on st.category_id=c.id
  order by c.budget_scope, c.name
$$;

revoke all on function public.hf_upsert_budget_category(uuid,uuid,text,text,text,text,bigint,text,boolean,bigint,text,text,boolean) from public;
revoke all on function public.hf_ensure_budget_period(uuid,date) from public;
revoke all on function public.hf_create_budget_spend(uuid,date,bigint,text,text,text,text,text) from public;
revoke all on function public.hf_approve_budget_spend(uuid) from public;
revoke all on function public.hf_reject_budget_spend(uuid,text) from public;
revoke all on function public.hf_close_budget_period(uuid) from public;
revoke all on function public.hf_get_budget_summary(uuid,date) from public;

grant execute on function public.hf_upsert_budget_category(uuid,uuid,text,text,text,text,bigint,text,boolean,bigint,text,text,boolean) to authenticated;
grant execute on function public.hf_ensure_budget_period(uuid,date) to authenticated;
grant execute on function public.hf_create_budget_spend(uuid,date,bigint,text,text,text,text,text) to authenticated;
grant execute on function public.hf_approve_budget_spend(uuid) to authenticated;
grant execute on function public.hf_reject_budget_spend(uuid,text) to authenticated;
grant execute on function public.hf_close_budget_period(uuid) to authenticated;
grant execute on function public.hf_get_budget_summary(uuid,date) to authenticated;

create trigger hf_budget_categories_updated_at before update on public.hf_budget_categories
for each row execute function public.ho_set_updated_at();
create trigger hf_budget_periods_updated_at before update on public.hf_budget_periods
for each row execute function public.ho_set_updated_at();
create trigger hf_budget_spends_updated_at before update on public.hf_budget_spends
for each row execute function public.ho_set_updated_at();
