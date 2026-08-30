export type KokodeAccountingMode = "social" | "corporate";

export type KokodeStaffingRow = {
  role: string;
  publicFullTime: number | "";
  publicPartTime: number | "";
  targetFullTimeFte: number | "";
  targetPartTimeFte: number | "";
  allFullTimeHeadcount: number | "";
  allPartTimeFte: number | "";
  weeklyHours: number | "";
};

export type KokodeSalaryRow = {
  role: string;
  experienceYears: number | "";
  tenureYears: number | "";
  childcareQualification: boolean;
  kindergartenLicense: boolean;
  nurseQualification: boolean;
  dietitianQualification: boolean;
  otherQualification: string;
  employmentType: "常勤" | "非常勤";
  fte: number | "";
  corporateOfficer: boolean;
  baselineBasePay: number | "";
  baselineAllowance: number | "";
  baselineBonus: number | "";
  currentBasePay: number | "";
  currentAllowance: number | "";
  currentBonus: number | "";
};

export type KokodeFinancialSection = "収入" | "支出" | "広義人件費";

export type KokodeFinancialRow = {
  section: KokodeFinancialSection;
  label: string;
  amount: number | "";
  auto?: boolean;
};

export type KokodeModelSalaryRow = {
  education: string;
  experienceYears: number;
  role: string;
  monthlyBasePay: number | "";
  monthlyAllowance: number | "";
  annualBonus: number | "";
  annualSalary: number | "";
};

export const KOKODE_FORMAT_CHECKED_AT = "2026年7月";

export const STAFFING_ROLES = [
  "施設長",
  "主任保育士",
  "保育士",
  "保育補助者（資格を有していない者）",
  "調理員",
  "栄養士（調理員に含まれる者を除く）",
  "看護師（保健師・助産師）・准看護師",
  "うち、保育業務従事者",
  "事務職員",
  "その他",
] as const;

export const SOCIAL_REVENUE_LABELS = [
  "保育事業収益",
  "施設型給付費収益（特例施設型給付費収益を含む）",
  "施設型給付費収益",
  "利用者負担金収益",
  "委託費収益",
  "利用者等利用料収益",
  "私的契約利用料収益",
  "その他の事業収益（補助金収入・受託事業収入）",
  "地域子ども・子育て支援事業",
  "地方単独事業に係る補助事業",
  "その他補助金",
  "児童福祉事業収益",
  "経常経費寄附金収益",
  "その他の収益",
  "事業活動外増減による収益",
  "うち、借入金利息補助金収入",
  "うち、受取利息配当金収入",
  "特別増減による収益",
  "うち、法人本部に帰属する収益",
  "収益計",
] as const;

export const SOCIAL_EXPENSE_LABELS = [
  "人件費",
  "事業費",
  "事務費",
  "利用者負担軽減額",
  "減価償却費",
  "国庫補助金等特別積立金取崩額",
  "徴収不能額",
  "徴収不能引当金繰入",
  "その他の費用",
  "事業活動外費用",
  "うち、支払利息",
  "特別費用",
  "うち、法人本部に帰属する費用",
  "費用計",
] as const;

export const BROAD_PERSONNEL_LABELS = [
  "福利厚生費",
  "研修研究費",
  "職員手数料に係る経費（紹介手数料を含む）",
  "その他",
] as const;

export const CORPORATE_FINANCIAL_LABELS = [
  "保育事業に係る売上高・収益",
  "施設型給付費",
  "利用者負担金",
  "委託費",
  "補助金",
  "その他の収益",
  "人件費",
  "給食材料費",
  "水道光熱費・事務費等",
  "減価償却費",
  "委託費のうち派遣委託費",
  "その他の費用",
] as const;

function cleanCell(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\t/g, " ").replace(/\r?\n/g, " ").trim();
}

export function toTsv(rows: Array<Array<string | number | boolean | null | undefined>>, includeBom = false) {
  const text = rows.map((row) => row.map(cleanCell).join("\t")).join("\r\n");
  return includeBom ? `\uFEFF${text}` : text;
}

function csvCell(value: string | number | boolean | null | undefined) {
  const text = cleanCell(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Array<Array<string | number | boolean | null | undefined>>, includeBom = true) {
  const text = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return includeBom ? `\uFEFF${text}` : text;
}

export function staffingTemplateInput(rows: KokodeStaffingRow[]) {
  return toTsv(rows.map((row) => [
    row.publicFullTime,
    row.publicPartTime,
    row.targetFullTimeFte,
    row.targetPartTimeFte,
    row.allFullTimeHeadcount,
    row.allPartTimeFte,
    row.weeklyHours,
  ]));
}

export function staffingAuditTsv(rows: KokodeStaffingRow[]) {
  return toTsv([
    [
      "職員配置",
      "公定価格基準 常勤",
      "公定価格基準 非常勤",
      "対象施設 実配置 常勤換算",
      "対象施設 実配置 非常勤換算",
      "全業務含む 常勤実人数",
      "全業務含む 非常勤換算",
      "施設で定める1週間の勤務時間",
    ],
    ...rows.map((row) => [
      row.role,
      row.publicFullTime,
      row.publicPartTime,
      row.targetFullTimeFte,
      row.targetPartTimeFte,
      row.allFullTimeHeadcount,
      row.allPartTimeFte,
      row.weeklyHours,
    ]),
  ], true);
}

const yesNo = (value: boolean) => value ? "有" : "無";

export function salaryTemplateInput(rows: KokodeSalaryRow[]) {
  return toTsv(rows.map((row) => [
    row.role,
    row.experienceYears,
    row.tenureYears,
    yesNo(row.childcareQualification),
    yesNo(row.kindergartenLicense),
    yesNo(row.nurseQualification),
    yesNo(row.dietitianQualification),
    row.otherQualification,
    row.employmentType,
    row.fte,
    yesNo(row.corporateOfficer),
    row.baselineBasePay,
    row.baselineAllowance,
    row.baselineBonus,
    row.currentBasePay,
    row.currentAllowance,
    row.currentBonus,
  ]));
}

export function salaryAuditTsv(rows: KokodeSalaryRow[]) {
  return toTsv([
    [
      "職種",
      "経験年数",
      "勤続年数",
      "保育士資格",
      "幼稚園教諭免許",
      "看護師資格",
      "栄養士資格",
      "その他資格",
      "常勤非常勤",
      "常勤換算値",
      "法人役員との兼務",
      "起点賃金水準 基本給",
      "起点賃金水準 手当",
      "起点賃金水準 賞与（一時金）",
      "当年度支払賃金 基本給",
      "当年度支払賃金 手当",
      "当年度支払賃金 賞与（一時金）",
    ],
    ...rows.map((row) => salaryTemplateInput([row]).split("\t")),
  ], true);
}

export function financialTemplateAmounts(rows: KokodeFinancialRow[]) {
  return toTsv(rows.map((row) => [row.amount]));
}

export function financialAuditTsv(rows: KokodeFinancialRow[]) {
  return toTsv([
    ["区分", "項目", "金額", "自動計算"],
    ...rows.map((row) => [row.section, row.label, row.amount, row.auto ? "自動" : ""]),
  ], true);
}

export function modelSalaryAuditTsv(rows: KokodeModelSalaryRow[]) {
  return toTsv([
    ["学歴区分", "経験年数", "職種", "月額基本給", "月額手当", "年間賞与", "モデル年収"],
    ...rows.map((row) => [
      row.education,
      row.experienceYears,
      row.role,
      row.monthlyBasePay,
      row.monthlyAllowance,
      row.annualBonus,
      row.annualSalary,
    ]),
  ], true);
}

export function sumFinancial(rows: KokodeFinancialRow[], section: KokodeFinancialSection) {
  return rows
    .filter((row) => row.section === section && !row.auto)
    .reduce((sum, row) => sum + (typeof row.amount === "number" ? row.amount : 0), 0);
}

export function personnelRatios(rows: KokodeFinancialRow[]) {
  const revenueTotalRow = rows.find((row) => row.label === "収益計");
  const revenue = typeof revenueTotalRow?.amount === "number"
    ? revenueTotalRow.amount
    : sumFinancial(rows, "収入");
  const personnelRow = rows.find((row) => row.section === "支出" && row.label === "人件費");
  const narrow = typeof personnelRow?.amount === "number" ? personnelRow.amount : 0;
  const broadExtra = sumFinancial(rows, "広義人件費");
  return {
    revenue,
    narrow,
    broad: narrow + broadExtra,
    narrowRatio: revenue > 0 ? narrow / revenue : 0,
    broadRatio: revenue > 0 ? (narrow + broadExtra) / revenue : 0,
  };
}

export function reportSummaryCsv(input: {
  facilityName: string;
  fiscalYear: number;
  accountingMode: KokodeAccountingMode;
  staffing: KokodeStaffingRow[];
  salaries: KokodeSalaryRow[];
  financials: KokodeFinancialRow[];
}) {
  const ratios = personnelRatios(input.financials);
  return toCsv([
    ["ここdeサーチ 経営情報報告 確認用", ""],
    ["施設名", input.facilityName],
    ["年度", `${input.fiscalYear}年度`],
    ["会計基準", input.accountingMode === "social" ? "社会福祉法人会計基準" : "企業会計"],
    ["様式確認", KOKODE_FORMAT_CHECKED_AT],
    ["職員配置行数", input.staffing.length],
    ["職員給与行数", input.salaries.length],
    ["収益計", Math.round(ratios.revenue)],
    ["狭義人件費", Math.round(ratios.narrow)],
    ["狭義人件費率", `${(ratios.narrowRatio * 100).toFixed(1)}%`],
    ["広義人件費", Math.round(ratios.broad)],
    ["広義人件費率", `${(ratios.broadRatio * 100).toFixed(1)}%`],
    ["注意", "最終提出時はここdeサーチから最新の公式Excelテンプレートをダウンロードして使用してください。"],
  ]);
}
