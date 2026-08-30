import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Banknote,
  Building2,
  Check,
  ChevronRight,
  Clipboard,
  Database,
  Download,
  FileSpreadsheet,
  Info,
  Users,
} from "lucide-react";
import { useLocation } from "react-router";
import { useFinanceSession } from "./FinanceSession";
import {
  BROAD_PERSONNEL_LABELS,
  CORPORATE_FINANCIAL_LABELS,
  KOKODE_FORMAT_CHECKED_AT,
  SOCIAL_EXPENSE_LABELS,
  SOCIAL_REVENUE_LABELS,
  STAFFING_ROLES,
  financialAuditTsv,
  financialTemplateAmounts,
  modelSalaryAuditTsv,
  personnelRatios,
  reportSummaryCsv,
  salaryAuditTsv,
  salaryTemplateInput,
  staffingAuditTsv,
  staffingTemplateInput,
  type KokodeAccountingMode,
  type KokodeFinancialRow,
  type KokodeModelSalaryRow,
  type KokodeSalaryRow,
  type KokodeStaffingRow,
} from "./lib/kokodeSearchExport";

type ReportTab = "staffing" | "salary" | "finance" | "model";

type Flash = { tone: "success" | "warning"; text: string } | null;

const staffingRows: KokodeStaffingRow[] = STAFFING_ROLES.map((role, index) => ({
  role,
  publicFullTime: [1, 1, 12, 0, 2, 1, 0, 0, 1, 0][index] ?? "",
  publicPartTime: [0, 0, 2.5, 1.5, 0.8, 0, 0, 0, 0, 0][index] ?? "",
  targetFullTimeFte: [1, 1, 13, 0, 2, 1, 0.5, 0.5, 1, 0][index] ?? "",
  targetPartTimeFte: [0, 0, 3.2, 1.8, 1.1, 0, 0, 0, 0.5, 0.3][index] ?? "",
  allFullTimeHeadcount: [1, 1, 13, 0, 2, 1, 1, 1, 1, 0][index] ?? "",
  allPartTimeFte: [0, 0, 3.5, 2.1, 1.1, 0, 0, 0, 0.5, 0.3][index] ?? "",
  weeklyHours: index <= 9 ? 40 : "",
}));

const salaryRows: KokodeSalaryRow[] = [
  {
    role: "施設長",
    experienceYears: 18,
    tenureYears: 8,
    childcareQualification: true,
    kindergartenLicense: true,
    nurseQualification: false,
    dietitianQualification: false,
    otherQualification: "",
    employmentType: "常勤",
    fte: 1,
    corporateOfficer: false,
    baselineBasePay: 335000,
    baselineAllowance: 76000,
    baselineBonus: 960000,
    currentBasePay: 348000,
    currentAllowance: 91000,
    currentBonus: 1010000,
  },
  {
    role: "主任保育士",
    experienceYears: 12,
    tenureYears: 9,
    childcareQualification: true,
    kindergartenLicense: true,
    nurseQualification: false,
    dietitianQualification: false,
    otherQualification: "",
    employmentType: "常勤",
    fte: 1,
    corporateOfficer: false,
    baselineBasePay: 292000,
    baselineAllowance: 68000,
    baselineBonus: 820000,
    currentBasePay: 304000,
    currentAllowance: 82000,
    currentBonus: 880000,
  },
  {
    role: "保育士",
    experienceYears: 7,
    tenureYears: 4,
    childcareQualification: true,
    kindergartenLicense: false,
    nurseQualification: false,
    dietitianQualification: false,
    otherQualification: "",
    employmentType: "常勤",
    fte: 1,
    corporateOfficer: false,
    baselineBasePay: 238000,
    baselineAllowance: 52000,
    baselineBonus: 650000,
    currentBasePay: 249000,
    currentAllowance: 64000,
    currentBonus: 700000,
  },
  {
    role: "保育士",
    experienceYears: 3,
    tenureYears: 2,
    childcareQualification: true,
    kindergartenLicense: true,
    nurseQualification: false,
    dietitianQualification: false,
    otherQualification: "",
    employmentType: "非常勤",
    fte: 0.75,
    corporateOfficer: false,
    baselineBasePay: 171000,
    baselineAllowance: 26000,
    baselineBonus: 180000,
    currentBasePay: 178000,
    currentAllowance: 31000,
    currentBonus: 210000,
  },
];

const modelSalaryRows: KokodeModelSalaryRow[] = [
  { education: "大学卒", experienceYears: 1, role: "保育士", monthlyBasePay: 224000, monthlyAllowance: 38000, annualBonus: 560000, annualSalary: 3704000 },
  { education: "大学卒", experienceYears: 5, role: "保育士", monthlyBasePay: 246000, monthlyAllowance: 54000, annualBonus: 680000, annualSalary: 4280000 },
  { education: "大学卒", experienceYears: 10, role: "保育士", monthlyBasePay: 278000, monthlyAllowance: 68000, annualBonus: 790000, annualSalary: 4942000 },
];

const socialFinanceRows: KokodeFinancialRow[] = [
  ...SOCIAL_REVENUE_LABELS.map((label): KokodeFinancialRow => ({
    section: "収入",
    label,
    amount: ({
      "保育事業収益": 98423000,
      "施設型給付費収益（特例施設型給付費収益を含む）": 86400000,
      "施設型給付費収益": 82000000,
      "利用者負担金収益": 4400000,
      "委託費収益": 0,
      "利用者等利用料収益": 2400000,
      "私的契約利用料収益": 0,
      "その他の事業収益（補助金収入・受託事業収入）": 7300000,
      "地域子ども・子育て支援事業": 1200000,
      "地方単独事業に係る補助事業": 1100000,
      "その他補助金": 5000000,
      "児童福祉事業収益": 0,
      "経常経費寄附金収益": 0,
      "その他の収益": 850000,
      "事業活動外増減による収益": 1220000,
      "うち、借入金利息補助金収入": 0,
      "うち、受取利息配当金収入": 220000,
      "特別増減による収益": 530000,
      "うち、法人本部に帰属する収益": 0,
      "収益計": 101023000,
    } as Record<string, number>)[label] ?? 0,
    auto: label === "収益計",
  })),
  ...SOCIAL_EXPENSE_LABELS.map((label): KokodeFinancialRow => ({
    section: "支出",
    label,
    amount: ({
      "人件費": 63040000,
      "事業費": 11860000,
      "事務費": 9140000,
      "利用者負担軽減額": 0,
      "減価償却費": 3860000,
      "国庫補助金等特別積立金取崩額": -1250000,
      "徴収不能額": 0,
      "徴収不能引当金繰入": 0,
      "その他の費用": 780000,
      "事業活動外費用": 610000,
      "うち、支払利息": 430000,
      "特別費用": 940000,
      "うち、法人本部に帰属する費用": 0,
      "費用計": 88980000,
    } as Record<string, number>)[label] ?? 0,
    auto: label === "費用計",
  })),
  ...BROAD_PERSONNEL_LABELS.map((label): KokodeFinancialRow => ({
    section: "広義人件費",
    label,
    amount: ({
      "福利厚生費": 1280000,
      "研修研究費": 480000,
      "職員手数料に係る経費（紹介手数料を含む）": 560000,
      "その他": 180000,
    } as Record<string, number>)[label] ?? 0,
  })),
];

const corporateFinanceRows: KokodeFinancialRow[] = CORPORATE_FINANCIAL_LABELS.map((label, index) => ({
  section: index < 6 ? "収入" : "支出",
  label,
  amount: [101023000, 82000000, 4400000, 0, 7300000, 11323000, 63040000, 4860000, 10200000, 3860000, 1200000, 5820000][index] ?? 0,
}));

function formatMoney(value: number | "") {
  return value === "" ? "—" : `¥${Math.round(value).toLocaleString("ja-JP")}`;
}

function downloadText(filename: string, text: string, type = "text/tab-separated-values;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function StatusPill({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "amber" }) {
  return <span className={`kokode-pill kokode-pill-${tone}`}>{children}</span>;
}

function KokodeSearchReportingPage() {
  const { selectedFacility } = useFinanceSession();
  const [tab, setTab] = useState<ReportTab>("staffing");
  const [accountingMode, setAccountingMode] = useState<KokodeAccountingMode>("social");
  const [flash, setFlash] = useState<Flash>(null);
  const facilityName = selectedFacility?.name || "選択中の施設";
  const fiscalYear = 2026;
  const financialRows = accountingMode === "social" ? socialFinanceRows : corporateFinanceRows;
  const ratios = useMemo(() => personnelRatios(socialFinanceRows), []);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 3200);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const handleCopy = async (text: string, label: string) => {
    try {
      await copyText(text);
      setFlash({ tone: "success", text: `${label}をコピーしました。最新の公式Excelテンプレートの入力欄へ貼り付けてください。` });
    } catch {
      setFlash({ tone: "warning", text: "クリップボードへコピーできませんでした。TSV保存を利用してください。" });
    }
  };

  const downloadSummary = () => {
    downloadText(
      `ここdeサーチ_経営情報報告_確認用_${fiscalYear}_${facilityName}.csv`,
      reportSummaryCsv({ facilityName, fiscalYear, accountingMode, staffing: staffingRows, salaries: salaryRows, financials: socialFinanceRows }),
      "text/csv;charset=utf-8",
    );
    setFlash({ tone: "success", text: "経営情報報告の全体確認CSVを保存しました。" });
  };

  const readiness = [
    ["会計年度・決算月", "設定", "完了"],
    ["施設等の設置主体", "設定", "完了"],
    ["施設の状況等", "施設情報", "完了"],
    ["人員配置", "Hoiku Office", "出力可"],
    ["職員給与", "Hoiku Office", "出力可"],
    ["モデル給与", "給与規程", "確認"],
    ["収支の状況", "Hoiku Finance", "出力可"],
    ["人件費比率・人的資本", "Office + Finance", "確認"],
  ];

  return (
    <div className="kokode-reporting-layer">
      <div className="kokode-page-head">
        <div>
          <div className="kokode-eyebrow"><FileSpreadsheet size={15} /> ここdeサーチ対応</div>
          <h1>経営情報報告</h1>
          <p>日々の会計・職員データを、ここdeサーチの経営情報報告で使う公式Excelテンプレートへ移しやすい形に整えます。</p>
        </div>
        <div className="kokode-head-actions">
          <StatusPill tone="blue">{fiscalYear}年度</StatusPill>
          <StatusPill tone="green">様式確認: {KOKODE_FORMAT_CHECKED_AT}</StatusPill>
          <button className="kokode-btn kokode-btn-primary" onClick={downloadSummary}><Download size={16} /> 全体確認CSV</button>
        </div>
      </div>

      {flash && <div className={`kokode-flash kokode-flash-${flash.tone}`}>{flash.tone === "success" ? <Check size={17} /> : <AlertTriangle size={17} />}<span>{flash.text}</span></div>}

      <section className="kokode-workflow">
        <div className="kokode-workflow-copy">
          <div className="kokode-workflow-icon"><Database size={22} /></div>
          <div>
            <strong>提出までの流れ</strong>
            <p>Hoiku Financeで集計 → ここdeサーチから最新の公式Excelをダウンロード → 入力欄へ貼り付け → Excel内の「貼り付けデータ」をコピー → ここdeサーチの「Excelデータ追加」へ貼り付け</p>
          </div>
        </div>
        <div className="kokode-flow-steps" aria-label="提出フロー">
          <span>Hoiku Finance</span><ChevronRight size={15} /><span>最新公式Excel</span><ChevronRight size={15} /><span>貼り付けデータ</span><ChevronRight size={15} /><span>ここdeサーチ</span>
        </div>
      </section>

      <div className="kokode-summary-grid">
        <article><Building2 size={18} /><span>対象施設</span><strong>{facilityName}</strong></article>
        <article><Users size={18} /><span>人員配置</span><strong>{staffingRows.length}職種</strong></article>
        <article><Banknote size={18} /><span>狭義人件費率</span><strong>{(ratios.narrowRatio * 100).toFixed(1)}%</strong></article>
        <article><Banknote size={18} /><span>広義人件費率</span><strong>{(ratios.broadRatio * 100).toFixed(1)}%</strong></article>
      </div>

      <section className="kokode-panel kokode-readiness-panel">
        <div className="kokode-panel-head">
          <div><h2>報告項目の準備状況</h2><p>公式の報告区分ごとに、Hoiku Grove内の入力元を整理しています。</p></div>
        </div>
        <div className="kokode-readiness-grid">
          {readiness.map(([name, source, status]) => (
            <div className="kokode-readiness-item" key={name}>
              <span className={status === "完了" || status === "出力可" ? "is-ready" : "is-check"}>{status === "完了" || status === "出力可" ? <Check size={14} /> : <AlertTriangle size={14} />}</span>
              <div><strong>{name}</strong><small>入力元: {source}</small></div>
              <em>{status}</em>
            </div>
          ))}
        </div>
      </section>

      <div className="kokode-report-tabs" role="tablist">
        <button className={tab === "staffing" ? "active" : ""} onClick={() => setTab("staffing")}><Users size={16} />人員配置</button>
        <button className={tab === "salary" ? "active" : ""} onClick={() => setTab("salary")}><Banknote size={16} />職員給与</button>
        <button className={tab === "finance" ? "active" : ""} onClick={() => setTab("finance")}><FileSpreadsheet size={16} />収支の状況</button>
        <button className={tab === "model" ? "active" : ""} onClick={() => setTab("model")}><Database size={16} />モデル給与</button>
      </div>

      {tab === "staffing" && (
        <section className="kokode-panel">
          <div className="kokode-panel-head kokode-panel-head-actions">
            <div><h2>人員配置に関する事項</h2><p>公式テンプレートの職種順に並べています。コピーは職種名を除いた7列です。</p></div>
            <div>
              <button className="kokode-btn" onClick={() => void handleCopy(staffingTemplateInput(staffingRows), "人員配置の入力データ")}><Clipboard size={15} /> 入力欄をコピー</button>
              <button className="kokode-btn" onClick={() => downloadText(`ここdeサーチ_人員配置_${facilityName}.tsv`, staffingAuditTsv(staffingRows))}><Download size={15} /> TSV保存</button>
            </div>
          </div>
          <div className="kokode-table-scroll">
            <table className="kokode-table">
              <thead><tr><th>職員配置</th><th>公定価格<br />常勤</th><th>公定価格<br />非常勤</th><th>対象施設<br />常勤換算</th><th>対象施設<br />非常勤換算</th><th>全業務<br />常勤実人数</th><th>全業務<br />非常勤換算</th><th>週所定時間</th></tr></thead>
              <tbody>{staffingRows.map((row) => <tr key={row.role}><td>{row.role}</td><td>{row.publicFullTime}</td><td>{row.publicPartTime}</td><td>{row.targetFullTimeFte}</td><td>{row.targetPartTimeFte}</td><td>{row.allFullTimeHeadcount}</td><td>{row.allPartTimeFte}</td><td>{row.weeklyHours}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "salary" && (
        <section className="kokode-panel">
          <div className="kokode-panel-head kokode-panel-head-actions">
            <div><h2>職員給与に関する事項</h2><p>職員ごとの経験・資格・常勤換算・起点賃金・当年度賃金を出力します。個人名は報告列に含めません。</p></div>
            <div>
              <button className="kokode-btn" onClick={() => void handleCopy(salaryTemplateInput(salaryRows), "職員給与の入力データ")}><Clipboard size={15} /> 入力行をコピー</button>
              <button className="kokode-btn" onClick={() => downloadText(`ここdeサーチ_職員給与_${facilityName}.tsv`, salaryAuditTsv(salaryRows))}><Download size={15} /> TSV保存</button>
            </div>
          </div>
          <div className="kokode-inline-notes">
            <StatusPill tone="blue">処遇改善加算 取得状況: 要確認</StatusPill>
            <StatusPill tone="amber">地方単独措置: 要確認</StatusPill>
          </div>
          <div className="kokode-table-scroll">
            <table className="kokode-table kokode-salary-table">
              <thead><tr><th>職種</th><th>経験</th><th>勤続</th><th>資格</th><th>勤務</th><th>常勤換算</th><th>起点 基本給</th><th>起点 手当</th><th>起点 賞与</th><th>当年 基本給</th><th>当年 手当</th><th>当年 賞与</th></tr></thead>
              <tbody>{salaryRows.map((row, index) => <tr key={`${row.role}-${index}`}><td>{row.role}</td><td>{row.experienceYears}年</td><td>{row.tenureYears}年</td><td>{[row.childcareQualification && "保育士", row.kindergartenLicense && "幼稚園", row.nurseQualification && "看護", row.dietitianQualification && "栄養士"].filter(Boolean).join("・") || "—"}</td><td>{row.employmentType}</td><td>{row.fte}</td><td>{formatMoney(row.baselineBasePay)}</td><td>{formatMoney(row.baselineAllowance)}</td><td>{formatMoney(row.baselineBonus)}</td><td>{formatMoney(row.currentBasePay)}</td><td>{formatMoney(row.currentAllowance)}</td><td>{formatMoney(row.currentBonus)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "finance" && (
        <section className="kokode-panel">
          <div className="kokode-panel-head kokode-panel-head-actions">
            <div><h2>収支の状況に関する事項</h2><p>採用する会計基準に合わせて、報告用の科目マッピングを確認します。</p></div>
            <div className="kokode-accounting-switch">
              <button className={accountingMode === "social" ? "active" : ""} onClick={() => setAccountingMode("social")}>社会福祉法人会計</button>
              <button className={accountingMode === "corporate" ? "active" : ""} onClick={() => setAccountingMode("corporate")}>企業会計</button>
            </div>
          </div>

          {accountingMode === "corporate" && <div className="kokode-caution"><AlertTriangle size={17} /><span><strong>企業会計:</strong> 公開資料だけでは最新テンプレートの全行順を確定できないため、項目名付きTSVで照合できる状態にしています。公式テンプレート取得後に無ラベルの一括貼り付けを有効化します。</span></div>}

          <div className="kokode-finance-actions">
            {accountingMode === "social" ? (
              <button className="kokode-btn kokode-btn-primary" onClick={() => void handleCopy(financialTemplateAmounts(financialRows), "収支の金額列")}><Clipboard size={15} /> 金額列をコピー</button>
            ) : (
              <button className="kokode-btn" disabled title="最新公式テンプレートの行順確認後に有効化します"><Clipboard size={15} /> 金額列コピーは照合待ち</button>
            )}
            <button className="kokode-btn" onClick={() => downloadText(`ここdeサーチ_収支_${accountingMode}_${facilityName}.tsv`, financialAuditTsv(financialRows))}><Download size={15} /> 項目名付きTSV</button>
          </div>

          {accountingMode === "social" && <div className="kokode-ratio-row"><div><span>収益計</span><strong>{formatMoney(ratios.revenue)}</strong></div><div><span>狭義人件費</span><strong>{formatMoney(ratios.narrow)}</strong><small>{(ratios.narrowRatio * 100).toFixed(1)}%</small></div><div><span>広義人件費</span><strong>{formatMoney(ratios.broad)}</strong><small>{(ratios.broadRatio * 100).toFixed(1)}%</small></div></div>}

          <div className="kokode-table-scroll">
            <table className="kokode-table">
              <thead><tr><th>区分</th><th>報告項目</th><th className="num">金額</th><th>取扱い</th></tr></thead>
              <tbody>{financialRows.map((row, index) => <tr key={`${row.section}-${row.label}-${index}`}><td><span className={`kokode-section kokode-section-${row.section === "収入" ? "income" : row.section === "支出" ? "expense" : "people"}`}>{row.section}</span></td><td>{row.label}</td><td className="num">{formatMoney(row.amount)}</td><td>{row.auto ? <StatusPill tone="green">自動計算</StatusPill> : <span className="kokode-muted">入力・集計</span>}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "model" && (
        <section className="kokode-panel">
          <div className="kokode-panel-head kokode-panel-head-actions">
            <div><h2>モデル給与に関する事項</h2><p>給与規程に基づくモデル給与です。実在職員の給与ではなく、1年目を含む複数の経験年数を設定します。</p></div>
            <button className="kokode-btn" onClick={() => downloadText(`ここdeサーチ_モデル給与_${facilityName}.tsv`, modelSalaryAuditTsv(modelSalaryRows))}><Download size={15} /> TSV保存</button>
          </div>
          <div className="kokode-table-scroll">
            <table className="kokode-table">
              <thead><tr><th>学歴区分</th><th>経験年数</th><th>職種</th><th className="num">月額基本給</th><th className="num">月額手当</th><th className="num">年間賞与</th><th className="num">モデル年収</th></tr></thead>
              <tbody>{modelSalaryRows.map((row) => <tr key={`${row.education}-${row.experienceYears}`}><td>{row.education}</td><td>{row.experienceYears}年目</td><td>{row.role}</td><td className="num">{formatMoney(row.monthlyBasePay)}</td><td className="num">{formatMoney(row.monthlyAllowance)}</td><td className="num">{formatMoney(row.annualBonus)}</td><td className="num"><strong>{formatMoney(row.annualSalary)}</strong></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      <div className="kokode-bottom-note"><Info size={17} /><div><strong>重要</strong><p>この画面はWAM NETへの自動送信ではありません。テンプレートは年度途中にも更新される可能性があるため、提出時は必ずここdeサーチから最新の公式Excelを取得し、Hoiku Financeの出力内容と項目順を最終確認してください。</p></div></div>
    </div>
  );
}

export default function KokodeSearchReportingEnhancement() {
  const location = useLocation();
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (location.pathname !== "/reporting") {
      setTarget(null);
      return;
    }
    const pageContent = document.querySelector<HTMLElement>(".page-content");
    if (!pageContent) return;
    pageContent.classList.add("kokode-reporting-active");
    setTarget(pageContent);
    return () => {
      pageContent.classList.remove("kokode-reporting-active");
    };
  }, [location.pathname]);

  if (location.pathname !== "/reporting" || !target) return null;
  return createPortal(<KokodeSearchReportingPage />, target);
}
