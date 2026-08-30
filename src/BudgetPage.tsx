import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  Coins,
  Gift,
  Leaf,
  LoaderCircle,
  Plus,
  Receipt,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  X,
} from "lucide-react";
import { useFinanceSession } from "./FinanceSession";
import {
  approveBudgetSpend,
  closeBudgetPeriod,
  createBudgetSpend,
  listBudgetSpends,
  listBudgetSummary,
  rejectBudgetSpend,
  upsertBudgetCategory,
  type BudgetScope,
  type BudgetSpend,
  type BudgetSummary,
  type BudgetVisibility,
} from "./lib/financeRepository";

type BudgetTab = "facility" | "hq" | "reward";

type SpendDraft = {
  categoryId: string;
  spendDate: string;
  amount: string;
  vendorName: string;
  description: string;
  paymentMethod: "cash" | "bank" | "card" | "transfer" | "other";
};

type CategoryDraft = {
  name: string;
  code: string;
  description: string;
  budgetScope: BudgetScope;
  monthlyBaseAmount: string;
  approvalLimit: string;
  carryoverMode: "monthly" | "none";
  allowFiscalYearCarryover: boolean;
  visibility: BudgetVisibility;
  accountingCategory: string;
};

const yen = (value: number) => `¥${Math.round(value).toLocaleString("ja-JP")}`;
const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const emptySpend = (): SpendDraft => ({ categoryId: "", spendDate: today(), amount: "", vendorName: "", description: "", paymentMethod: "other" });
const emptyCategory = (): CategoryDraft => ({
  name: "",
  code: "",
  description: "",
  budgetScope: "facility_delegated",
  monthlyBaseAmount: "",
  approvalLimit: "",
  carryoverMode: "monthly",
  allowFiscalYearCarryover: false,
  visibility: "manager",
  accountingCategory: "",
});

function messageFromError(caught: unknown) {
  const raw = caught instanceof Error ? caught.message : String(caught ?? "");
  if (raw.includes("budget_insufficient_available_amount")) return "利用可能額を超えています。追加予算が必要です。";
  if (raw.includes("budget_approval_forbidden")) return "この金額はあなたの承認権限を超えています。本部承認が必要です。";
  if (raw.includes("accounting_period_closed")) return "会計月が締め済みのため、会計へ反映できません。";
  if (raw.includes("budget_pending_spends_exist")) return "承認待ちの支出があるため、月を締められません。";
  if (raw.includes("forbidden") || raw.includes("42501")) return "この操作を行う権限がありません。";
  return raw || "処理に失敗しました。";
}

export default function BudgetPage() {
  const session = useFinanceSession();
  const [tab, setTab] = useState<BudgetTab>("facility");
  const [yearMonth, setYearMonth] = useState(currentMonth());
  const [summaries, setSummaries] = useState<BudgetSummary[]>([]);
  const [spends, setSpends] = useState<BudgetSpend[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [spendOpen, setSpendOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [spendDraft, setSpendDraft] = useState<SpendDraft>(emptySpend());
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(emptyCategory());

  const refresh = useCallback(async () => {
    if (!session.selectedFacilityId) return;
    setLoading(true);
    setError("");
    try {
      const [budgetRows, spendRows] = await Promise.all([
        listBudgetSummary(session.selectedFacilityId, yearMonth),
        session.canManageFacilityBudget ? listBudgetSpends(session.selectedFacilityId, yearMonth) : Promise.resolve([]),
      ]);
      setSummaries(budgetRows);
      setSpends(spendRows);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setLoading(false);
    }
  }, [session.selectedFacilityId, session.canManageFacilityBudget, yearMonth]);

  useEffect(() => { void refresh(); }, [refresh]);

  const delegated = summaries.filter((row) => row.budgetScope === "facility_delegated");
  const hq = summaries.filter((row) => row.budgetScope === "head_office");
  const rewards = summaries.filter((row) => row.budgetScope === "staff_return");
  const summaryByCategory = useMemo(() => new Map(summaries.map((row) => [row.categoryId, row])), [summaries]);
  const totals = useMemo(() => delegated.reduce((total, row) => ({
    allocated: total.allocated + row.allocatedAmount,
    carryover: total.carryover + row.carryoverIn,
    adjustment: total.adjustment + row.adjustmentAmount,
    submitted: total.submitted + row.submittedAmount,
    spent: total.spent + row.spentAmount,
    available: total.available + row.availableAmount,
  }), { allocated: 0, carryover: 0, adjustment: 0, submitted: 0, spent: 0, available: 0 }), [delegated]);

  const openSpend = (categoryId: string) => {
    setSpendDraft({ ...emptySpend(), categoryId });
    setSpendOpen(true);
    setError("");
  };

  const saveSpend = async () => {
    const amount = Number(spendDraft.amount.replace(/,/g, ""));
    if (!spendDraft.categoryId || !Number.isFinite(amount) || amount <= 0 || !spendDraft.description.trim()) {
      setError("予算・金額・内容を入力してください。");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createBudgetSpend({
        categoryId: spendDraft.categoryId,
        spendDate: spendDraft.spendDate,
        amount,
        vendorName: spendDraft.vendorName,
        description: spendDraft.description,
        paymentMethod: spendDraft.paymentMethod,
      });
      setSpendOpen(false);
      setNotice("支出を申請しました。承認されるまで利用可能額から確保されます。");
      await refresh();
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  };

  const saveCategory = async () => {
    if (!session.selectedFacilityId || !categoryDraft.name.trim()) {
      setError("予算名を入力してください。");
      return;
    }
    const monthly = Number(categoryDraft.monthlyBaseAmount.replace(/,/g, ""));
    const limit = Number(categoryDraft.approvalLimit.replace(/,/g, ""));
    if (!Number.isFinite(monthly) || monthly < 0 || !Number.isFinite(limit) || limit < 0) {
      setError("月額予算と承認上限を正しく入力してください。");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await upsertBudgetCategory({
        facilityId: session.selectedFacilityId,
        code: categoryDraft.code,
        name: categoryDraft.name,
        description: categoryDraft.description,
        budgetScope: categoryDraft.budgetScope,
        monthlyBaseAmount: monthly,
        carryoverMode: categoryDraft.carryoverMode,
        allowFiscalYearCarryover: categoryDraft.allowFiscalYearCarryover,
        approvalLimit: limit,
        visibility: categoryDraft.visibility,
        accountingCategory: categoryDraft.accountingCategory || categoryDraft.name,
      });
      setCategoryOpen(false);
      setCategoryDraft(emptyCategory());
      setNotice("予算ルールを登録しました。設定した金額が実際の予算として利用されます。");
      await refresh();
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  };

  const approve = async (spend: BudgetSpend) => {
    setSaving(true);
    setError("");
    try {
      await approveBudgetSpend(spend.id);
      setNotice("承認しました。Hoiku Officeの正式な会計経費へ自動反映しました。");
      await refresh();
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  };

  const reject = async (spend: BudgetSpend) => {
    const reason = window.prompt("差戻し理由を入力してください", "内容を確認してください");
    if (reason === null) return;
    setSaving(true);
    setError("");
    try {
      await rejectBudgetSpend(spend.id, reason);
      setNotice("支出申請を差し戻しました。");
      await refresh();
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  };

  const closePeriod = async (row: BudgetSummary) => {
    if (!row.periodId || !window.confirm(`${row.name}の${yearMonth}予算を締めますか？ 未使用額は設定に従って翌月へ繰り越されます。`)) return;
    setSaving(true);
    setError("");
    try {
      const carry = await closeBudgetPeriod(row.periodId);
      setNotice(`${row.name}を締めました。繰越額は${yen(carry)}です。`);
      await refresh();
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  };

  if (session.loading) return <div className="budget-loading"><LoaderCircle className="spin" size={28} /><span>施設情報を読み込んでいます</span></div>;

  return (
    <>
      <div className="page-header budget-page-header">
        <div>
          <h1>予算管理</h1>
          <p>本部が予算とルールを設定し、園長・主任は保育のために使える金額を明確に管理します。</p>
        </div>
        <div className="page-actions budget-toolbar">
          {session.facilities.length > 1 && (
            <select value={session.selectedFacilityId} onChange={(event) => session.setSelectedFacilityId(event.target.value)} aria-label="施設">
              {session.facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
            </select>
          )}
          <input type="month" value={yearMonth} onChange={(event) => setYearMonth(event.target.value)} aria-label="対象月" />
          <button className="btn btn-secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} />更新</button>
          {session.isHeadOffice && <button className="btn btn-primary" onClick={() => { setCategoryDraft(emptyCategory()); setCategoryOpen(true); }}><Plus size={16} />予算を設定</button>}
        </div>
      </div>

      {session.error && <div className="notice notice-error"><CircleAlert size={17} /><span>{session.error}</span></div>}
      {error && <div className="notice notice-error"><CircleAlert size={17} /><span>{error}</span></div>}
      {notice && <div className="notice notice-success"><CircleCheck size={17} /><span>{notice}</span><button className="notice-close" onClick={() => setNotice("")}><X size={15} /></button></div>}

      <div className="budget-context-bar">
        <div><span>施設</span><strong>{session.selectedFacility?.name ?? "施設未選択"}</strong></div>
        <div><span>あなたの権限</span><strong>{session.role || "未設定"}</strong></div>
        <div><span>予算データ</span><strong>実データ</strong></div>
      </div>

      <div className="budget-view-tabs" role="tablist" aria-label="予算管理の表示切替">
        <button className={tab === "facility" ? "active" : ""} onClick={() => setTab("facility")}><WalletCards size={17} />園で使える予算</button>
        <button className={tab === "hq" ? "active" : ""} onClick={() => setTab("hq")}><ShieldCheck size={17} />本部管理予算</button>
        <button className={tab === "reward" ? "active" : ""} onClick={() => setTab("reward")}><Gift size={17} />職員への還元</button>
      </div>

      {tab === "facility" && (
        <>
          <section className="budget-hero">
            <div>
              <span className="budget-kicker">園で現在使える予算</span>
              <strong>{delegated.length ? yen(totals.available) : "未設定"}</strong>
              <p>申請中の支出は二重利用を防ぐため、承認前でも利用可能額から確保しています。</p>
            </div>
            <div className="budget-hero-stats">
              <div><span>今月付与</span><strong>{yen(totals.allocated)}</strong></div>
              <div><span>前月繰越・調整</span><strong>{yen(totals.carryover + totals.adjustment)}</strong></div>
              <div><span>承認済 / 申請中</span><strong>{yen(totals.spent)} / {yen(totals.submitted)}</strong></div>
            </div>
          </section>

          <div className="budget-guidance">
            <Check size={18} />
            <div><strong>節約額ではなく、保育のために「あといくら使えるか」を見ます。</strong><span>未使用額は各予算の繰越ルールに従って翌月へ移ります。</span></div>
          </div>

          {loading ? (
            <div className="budget-loading"><LoaderCircle className="spin" size={26} /><span>予算を集計しています</span></div>
          ) : !delegated.length ? (
            <section className="budget-empty panel">
              <WalletCards size={34} />
              <h2>園で使える予算はまだ設定されていません</h2>
              <p>{session.isHeadOffice ? "本部から保育材料費・給食材料費・環境改善費などの予算を設定してください。" : "本部が予算を設定すると、ここに利用可能額と繰越額が表示されます。"}</p>
              {session.isHeadOffice && <button className="btn btn-primary" onClick={() => setCategoryOpen(true)}><Plus size={16} />最初の予算を設定</button>}
            </section>
          ) : (
            <section className="budget-card-grid">
              {delegated.map((budget) => {
                const base = budget.allocatedAmount + budget.carryoverIn + budget.adjustmentAmount;
                const reserved = budget.spentAmount + budget.submittedAmount;
                const usage = base > 0 ? Math.min(100, Math.round((reserved / base) * 100)) : 0;
                return (
                  <article className="budget-card" key={budget.categoryId}>
                    <div className="budget-card-head"><span className="budget-category-icon"><Leaf size={20} /></span><span className="budget-owner">{budget.periodStatus === "closed" ? "締め済" : "利用中"}</span></div>
                    <h2>{budget.name}</h2>
                    <p>{budget.description || "園に委譲された予算"}</p>
                    <div className="budget-available"><span>現在使える金額</span><strong>{yen(budget.availableAmount)}</strong></div>
                    <div className="budget-progress"><span style={{ width: `${usage}%` }} /></div>
                    <div className="budget-breakdown"><span>今月 {yen(budget.allocatedAmount)}</span><span>繰越 {yen(budget.carryoverIn)}</span><span>使用 {yen(budget.spentAmount)}</span><span>申請中 {yen(budget.submittedAmount)}</span></div>
                    <div className="budget-rule"><CircleAlert size={14} />園長承認上限: 1件 {yen(budget.approvalLimit)}</div>
                    {session.canManageFacilityBudget && budget.periodStatus !== "closed" && <button className="budget-spend-button" onClick={() => openSpend(budget.categoryId)}><Plus size={16} />この予算から支出を申請</button>}
                    {session.canManageFacilityBudget && budget.periodId && budget.periodStatus === "open" && <button className="budget-close-button" onClick={() => void closePeriod(budget)}>この月を締める</button>}
                  </article>
                );
              })}
            </section>
          )}

          {session.canManageFacilityBudget && (
            <section className="panel">
              <div className="panel-heading"><div><h2>支出申請・会計反映</h2><p>承認されるとHoiku Officeの正式な経費データへ自動反映されます。</p></div><span className="badge badge-blue">{spends.length}件</span></div>
              {!spends.length ? <div className="budget-list-empty">この月の支出申請はありません。</div> : (
                <div className="budget-spend-list">
                  {spends.map((spend) => {
                    const category = summaryByCategory.get(spend.categoryId);
                    const canApproveThis = session.isHeadOffice || (session.role === "director" && spend.amount <= (category?.approvalLimit ?? 0));
                    return (
                      <div className="budget-spend-row" key={spend.id}>
                        <span className={`spend-status spend-status-${spend.status}`}>{spend.status === "posted" ? <CircleCheck size={16} /> : spend.status === "submitted" ? <Clock3 size={16} /> : <CircleAlert size={16} />}</span>
                        <div className="budget-spend-copy"><strong>{spend.description}</strong><span>{category?.name ?? "予算"} · {spend.spendDate} {spend.vendorName ? `· ${spend.vendorName}` : ""}</span>{spend.rejectionReason && <small>差戻し: {spend.rejectionReason}</small>}</div>
                        <strong className="budget-spend-amount">{yen(spend.amount)}</strong>
                        <span className={`badge ${spend.status === "posted" ? "badge-green" : spend.status === "submitted" ? "badge-amber" : "badge-neutral"}`}>{spend.status === "posted" ? "会計反映済" : spend.status === "submitted" ? "承認待ち" : spend.status === "rejected" ? "差戻し" : "取消"}</span>
                        {spend.status === "submitted" && session.canApproveBudget && canApproveThis && <div className="spend-actions"><button className="btn btn-secondary btn-sm" onClick={() => void reject(spend)} disabled={saving}>差戻し</button><button className="btn btn-primary btn-sm" onClick={() => void approve(spend)} disabled={saving}>承認</button></div>}
                        {spend.status === "submitted" && session.role === "director" && !canApproveThis && <span className="hq-required">本部承認</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {tab === "hq" && (
        <>
          <div className="budget-guidance compact"><ShieldCheck size={17} /><div><strong>人件費・家賃・通信費など、本部だけが管理する予算です。</strong><span>現場へ見せるかどうかも予算単位で本部が設定します。</span></div></div>
          {!hq.length ? (
            <section className="budget-empty panel"><Coins size={34} /><h2>本部管理予算は未設定です</h2><p>必要な場合だけ登録してください。HFが架空の固定費を自動作成することはありません。</p>{session.isHeadOffice && <button className="btn btn-primary" onClick={() => { setCategoryDraft({ ...emptyCategory(), budgetScope: "head_office", visibility: "hq" }); setCategoryOpen(true); }}><Plus size={16} />本部予算を設定</button>}</section>
          ) : <section className="budget-card-grid">{hq.map((row) => <article className="budget-card" key={row.categoryId}><div className="budget-card-head"><span className="budget-category-icon"><Coins size={20} /></span><span className="budget-owner">本部管理</span></div><h2>{row.name}</h2><p>{row.description}</p><div className="budget-available"><span>当月予算</span><strong>{yen(row.allocatedAmount)}</strong></div><div className="budget-breakdown"><span>調整 {yen(row.adjustmentAmount)}</span><span>公開範囲 {row.visibility}</span></div></article>)}</section>}
        </>
      )}

      {tab === "reward" && (
        <>
          <div className="budget-guidance compact"><Gift size={17} /><div><strong>職員のために確保された予算も、本部管理費と分離して見えるようにします。</strong><span>賞与裁量枠や処遇改善の個人配分は、Hoiku Officeの給与・処遇改善データと連携して管理します。</span></div></div>
          {!rewards.length ? (
            <section className="budget-empty panel"><Gift size={34} /><h2>職員還元予算は未設定です</h2><p>金額を推測して表示しません。本部が設定した予算とHoiku Officeの実績データだけを表示します。</p>{session.isHeadOffice && <button className="btn btn-primary" onClick={() => { setCategoryDraft({ ...emptyCategory(), budgetScope: "staff_return", visibility: "manager" }); setCategoryOpen(true); }}><Plus size={16} />職員還元予算を設定</button>}</section>
          ) : <section className="budget-card-grid">{rewards.map((row) => <article className="budget-card" key={row.categoryId}><div className="budget-card-head"><span className="budget-category-icon"><Gift size={20} /></span><span className="budget-owner">職員還元</span></div><h2>{row.name}</h2><p>{row.description}</p><div className="budget-available"><span>予算額</span><strong>{yen(row.allocatedAmount + row.carryoverIn + row.adjustmentAmount)}</strong></div><div className="budget-breakdown"><span>今月 {yen(row.allocatedAmount)}</span><span>繰越 {yen(row.carryoverIn)}</span></div></article>)}</section>}
          <section className="panel reward-link-panel"><div className="panel-heading"><div><h2>Hoiku Office連携</h2><p>賞与・処遇改善の実際の配分額は、個人給与の閲覧権限を守ったまま次段階で接続します。</p></div><SlidersHorizontal size={20} /></div></section>
        </>
      )}

      {spendOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSpendOpen(false)}>
          <div className="modal budget-entry-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><h2>予算から支出を申請</h2><p>{summaryByCategory.get(spendDraft.categoryId)?.name}</p></div><button className="icon-button" onClick={() => setSpendOpen(false)}><X size={18} /></button></div>
            <div className="selected-budget-balance"><WalletCards size={18} /><div><span>現在の利用可能額</span><strong>{yen(summaryByCategory.get(spendDraft.categoryId)?.availableAmount ?? 0)}</strong></div></div>
            <div className="form-grid">
              <label className="field"><span>日付</span><input type="date" value={spendDraft.spendDate} onChange={(event) => setSpendDraft({ ...spendDraft, spendDate: event.target.value })} /></label>
              <label className="field"><span>支払方法</span><select value={spendDraft.paymentMethod} onChange={(event) => setSpendDraft({ ...spendDraft, paymentMethod: event.target.value as SpendDraft["paymentMethod"] })}><option value="other">その他</option><option value="cash">現金</option><option value="bank">銀行</option><option value="card">カード</option><option value="transfer">振込</option></select></label>
              <label className="field full"><span>金額</span><div className="amount-input"><span>¥</span><input inputMode="numeric" value={spendDraft.amount} onChange={(event) => setSpendDraft({ ...spendDraft, amount: event.target.value })} placeholder="0" /></div></label>
              <label className="field full"><span>購入先・支払先</span><input value={spendDraft.vendorName} onChange={(event) => setSpendDraft({ ...spendDraft, vendorName: event.target.value })} placeholder="例：○○教材" /></label>
              <label className="field full"><span>内容</span><input value={spendDraft.description} onChange={(event) => setSpendDraft({ ...spendDraft, description: event.target.value })} placeholder="例：絵本・制作材料" /></label>
            </div>
            <div className="budget-entry-note"><Receipt size={16} /><span>証憑ファイルの直接アップロードは次の実装でStorageと接続します。支出・承認・会計反映はこの画面から実データで動作します。</span></div>
            <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setSpendOpen(false)}>キャンセル</button><button className="btn btn-primary" onClick={() => void saveSpend()} disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}申請する</button></div>
          </div>
        </div>
      )}

      {categoryOpen && session.isHeadOffice && (
        <div className="modal-backdrop" onMouseDown={() => setCategoryOpen(false)}>
          <div className="modal budget-config-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><h2>予算を設定</h2><p>{session.selectedFacility?.name}</p></div><button className="icon-button" onClick={() => setCategoryOpen(false)}><X size={18} /></button></div>
            <div className="form-grid">
              <label className="field full"><span>予算名</span><input value={categoryDraft.name} onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value })} placeholder="例：保育材料費" /></label>
              <label className="field full"><span>説明</span><input value={categoryDraft.description} onChange={(event) => setCategoryDraft({ ...categoryDraft, description: event.target.value })} placeholder="例：玩具・絵本・制作・教材" /></label>
              <label className="field"><span>管理区分</span><select value={categoryDraft.budgetScope} onChange={(event) => setCategoryDraft({ ...categoryDraft, budgetScope: event.target.value as BudgetScope })}><option value="facility_delegated">園へ委譲</option><option value="head_office">本部管理</option><option value="staff_return">職員還元</option></select></label>
              <label className="field"><span>公開範囲</span><select value={categoryDraft.visibility} onChange={(event) => setCategoryDraft({ ...categoryDraft, visibility: event.target.value as BudgetVisibility })}><option value="manager">園長・主任以上</option><option value="staff">職員にも公開</option><option value="hq">本部のみ</option></select></label>
              <label className="field"><span>月額予算</span><div className="amount-input"><span>¥</span><input inputMode="numeric" value={categoryDraft.monthlyBaseAmount} onChange={(event) => setCategoryDraft({ ...categoryDraft, monthlyBaseAmount: event.target.value })} placeholder="0" /></div></label>
              <label className="field"><span>園長承認上限 / 1件</span><div className="amount-input"><span>¥</span><input inputMode="numeric" value={categoryDraft.approvalLimit} onChange={(event) => setCategoryDraft({ ...categoryDraft, approvalLimit: event.target.value })} placeholder="0" /></div></label>
              <label className="field"><span>翌月繰越</span><select value={categoryDraft.carryoverMode} onChange={(event) => setCategoryDraft({ ...categoryDraft, carryoverMode: event.target.value as "monthly" | "none" })}><option value="monthly">する</option><option value="none">しない</option></select></label>
              <label className="field"><span>会計科目</span><input value={categoryDraft.accountingCategory} onChange={(event) => setCategoryDraft({ ...categoryDraft, accountingCategory: event.target.value })} placeholder="例：消耗品費" /></label>
              <label className="field full checkbox-field"><input type="checkbox" checked={categoryDraft.allowFiscalYearCarryover} onChange={(event) => setCategoryDraft({ ...categoryDraft, allowFiscalYearCarryover: event.target.checked })} /><span>年度をまたいだ繰越も許可する</span></label>
            </div>
            <div className="budget-config-warning"><CircleAlert size={16} /><span>ここで登録した金額が実際の利用可能予算になります。サンプル値は自動入力しません。</span></div>
            <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setCategoryOpen(false)}>キャンセル</button><button className="btn btn-primary" onClick={() => void saveCategory()} disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}設定する</button></div>
          </div>
        </div>
      )}
    </>
  );
}
