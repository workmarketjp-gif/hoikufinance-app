import { getSupabaseClient } from "./supabase";

export type OperationsSnapshot = {
  facilityId: string;
  facilityName: string;
  capacity: number | null;
  enrolledCount: number | null;
  occupancyRate: number | null;
  incomeTotal: number | null;
  expenseTotal: number | null;
  payrollTotal: number | null;
  netResult: number | null;
  accountingStatus: string | null;
  inquiryCount: number;
  availableDelegatedBudget: number;
};

const nullableNumber = (value: unknown) => value == null ? null : Number(value);

export async function getOperationsSnapshot(facilityId: string, yearMonth: string): Promise<OperationsSnapshot> {
  const { data, error } = await getSupabaseClient().rpc("hf_get_operations_snapshot", {
    p_facility_id: facilityId,
    p_year_month: `${yearMonth.slice(0, 7)}-01`,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("運営状況データを取得できませんでした。");

  return {
    facilityId: String(row.facility_id),
    facilityName: String(row.facility_name ?? ""),
    capacity: nullableNumber(row.capacity),
    enrolledCount: nullableNumber(row.enrolled_count),
    occupancyRate: nullableNumber(row.occupancy_rate),
    incomeTotal: nullableNumber(row.income_total),
    expenseTotal: nullableNumber(row.expense_total),
    payrollTotal: nullableNumber(row.payroll_total),
    netResult: nullableNumber(row.net_result),
    accountingStatus: row.accounting_status ? String(row.accounting_status) : null,
    inquiryCount: Number(row.inquiry_count ?? 0),
    availableDelegatedBudget: Number(row.available_delegated_budget ?? 0),
  };
}
