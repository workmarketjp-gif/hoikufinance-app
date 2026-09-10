-- hf_budget_period_config_contract inspects PostgreSQL catalog metadata only.
-- Keep the build-time contract publicly callable, but remove SECURITY DEFINER elevation.
alter function public.hf_budget_period_config_contract() security invoker;
