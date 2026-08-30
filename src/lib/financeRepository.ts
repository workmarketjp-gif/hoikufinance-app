import { getSupabaseClient } from "./supabase";

export type BudgetScope = "facility_delegated" | "head_office" | "staff_return";
export type BudgetVisibility = "staff" | "manager" | "hq";
export type BudgetPeriodStatus = "open" | "closed" | "not_open";
export type BudgetSpendStatus = "submitted" | "posted" | "rejected" | "cancelled";

export type BudgetSummary = {
  categoryId: string;
  code: string;
  name: string;
  description: string;
  budgetScope: BudgetScope;
  visibility: BudgetVisibility;
  approvalLimit: number;
  accountingCategory: string;
  periodId: string | null;
  periodStatus: BudgetPeriodStatus;
  allocatedAmount: number;
  carryoverIn: number;
  adjustmentAmount: number;
  submittedAmount: number;
  spentAmount: number;
  availableAmount: number;
};

export type BudgetSpend = {
  id: string;
  categoryId: string;
  budgetPeriodId: string;
  spendDate: string;
  amount: number;
  vendorName: string;
  description: string;
  evidenceUrl: string | null;
  paymentMethod: string;
  status: BudgetSpendStatus;
  requestedBy: string;
  submittedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  accountingExpenseId: string | null;
};

const asNumber = (value: unknown) => Number(value ?? 0);

function monthStart(yearMonth: string) {
  return `${yearMonth.slice(0, 7)}-01`;
}

function nextMonthStart(yearMonth: string) {
  const [year, month] = yearMonth.slice(0, 7).split("-").map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function listBudgetSummary(facilityId: string, yearMonth: string): Promise<BudgetSummary[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("hf_get_budget_summary", {
    p_facility_id: facilityId,
    p_year_month: monthStart(yearMonth),
  });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    categoryId: String(row.category_id),
    code: String(row.code ?? ""),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    budgetScope: row.budget_scope as BudgetScope,
    visibility: row.visibility as BudgetVisibility,
    approvalLimit: asNumber(row.approval_limit),
    accountingCategory: String(row.accounting_category ?? ""),
    periodId: row.period_id ? String(row.period_id) : null,
    periodStatus: String(row.period_status ?? "not_open") as BudgetPeriodStatus,
    allocatedAmount: asNumber(row.allocated_amount),
    carryoverIn: asNumber(row.carryover_in),
    adjustmentAmount: asNumber(row.adjustment_amount),
    submittedAmount: asNumber(row.submitted_amount),
    spentAmount: asNumber(row.spent_amount),
    availableAmount: asNumber(row.available_amount),
  }));
}

export async function listBudgetSpends(facilityId: string, yearMonth: string): Promise<BudgetSpend[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("hf_budget_spends")
    .select("id,category_id,budget_period_id,spend_date,amount,vendor_name,description,evidence_url,payment_method,status,requested_by,submitted_at,approved_by,approved_at,rejected_at,rejection_reason,ho_accounting_expense_id")
    .eq("facility_id", facilityId)
    .gte("spend_date", monthStart(yearMonth))
    .lt("spend_date", nextMonthStart(yearMonth))
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    categoryId: String(row.category_id),
    budgetPeriodId: String(row.budget_period_id),
    spendDate: String(row.spend_date),
    amount: asNumber(row.amount),
    vendorName: String(row.vendor_name ?? ""),
    description: String(row.description ?? ""),
    evidenceUrl: row.evidence_url ? String(row.evidence_url) : null,
    paymentMethod: String(row.payment_method ?? "other"),
    status: row.status as BudgetSpendStatus,
    requestedBy: String(row.requested_by ?? ""),
    submittedAt: String(row.submitted_at ?? ""),
    approvedBy: row.approved_by ? String(row.approved_by) : null,
    approvedAt: row.approved_at ? String(row.approved_at) : null,
    rejectedAt: row.rejected_at ? String(row.rejected_at) : null,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
    accountingExpenseId: row.ho_accounting_expense_id ? String(row.ho_accounting_expense_id) : null,
  }));
}

export async function createBudgetSpend(input: {
  categoryId: string;
  spendDate: string;
  amount: number;
  vendorName: string;
  description: string;
  evidenceUrl?: string;
  paymentMethod: "cash" | "bank" | "card" | "transfer" | "other";
  taxCategory?: string;
}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("hf_create_budget_spend", {
    p_category_id: input.categoryId,
    p_spend_date: input.spendDate,
    p_amount: Math.round(input.amount),
    p_vendor_name: input.vendorName,
    p_description: input.description,
    p_evidence_url: input.evidenceUrl ?? "",
    p_payment_method: input.paymentMethod,
    p_tax_category: input.taxCategory ?? "",
  });
  if (error) throw error;
  return String(data);
}

export async function approveBudgetSpend(spendId: string) {
  const { data, error } = await getSupabaseClient().rpc("hf_approve_budget_spend", { p_spend_id: spendId });
  if (error) throw error;
  return String(data);
}

export async function rejectBudgetSpend(spendId: string, reason: string) {
  const { error } = await getSupabaseClient().rpc("hf_reject_budget_spend", { p_spend_id: spendId, p_reason: reason });
  if (error) throw error;
}

export async function closeBudgetPeriod(periodId: string) {
  const { data, error } = await getSupabaseClient().rpc("hf_close_budget_period", { p_period_id: periodId });
  if (error) throw error;
  return asNumber(data);
}

export async function upsertBudgetCategory(input: {
  id?: string | null;
  facilityId: string;
  code: string;
  name: string;
  description: string;
  budgetScope: BudgetScope;
  monthlyBaseAmount: number;
  carryoverMode: "monthly" | "none";
  allowFiscalYearCarryover: boolean;
  approvalLimit: number;
  visibility: BudgetVisibility;
  accountingCategory: string;
  isActive?: boolean;
}) {
  const { data, error } = await getSupabaseClient().rpc("hf_upsert_budget_category", {
    p_id: input.id ?? null,
    p_facility_id: input.facilityId,
    p_code: input.code,
    p_name: input.name,
    p_description: input.description,
    p_budget_scope: input.budgetScope,
    p_monthly_base_amount: Math.round(input.monthlyBaseAmount),
    p_carryover_mode: input.carryoverMode,
    p_allow_fiscal_year_carryover: input.allowFiscalYearCarryover,
    p_approval_limit: Math.round(input.approvalLimit),
    p_visibility: input.visibility,
    p_accounting_category: input.accountingCategory,
    p_is_active: input.isActive ?? true,
  });
  if (error) throw error;
  return String(data);
}
