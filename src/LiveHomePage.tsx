import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CircleAlert,
  CircleCheck,
  FileCheck2,
  LoaderCircle,
  RefreshCw,
  Receipt,
  Users,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useFinanceSession } from "./FinanceSession";
import { listBudgetSpends, listBudgetSummary, type BudgetSpend, type BudgetSummary } from "./lib/financeRepository";
import { getOperationsSnapshot, type OperationsSnapshot } from "./lib/operationsRepository";

const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const shortYen = (value: number | null) => {
  if (value == null) return "未集計";
  if (Math.abs(value) >= 10_000) return `${(value / 10_000).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}万円`;
  return `¥${Math.round(value).toLocaleString("ja-JP")}`;
};

function messageFromError(caught: unknown) {
  const raw = caught instanceof Error ? caught.message : String(caught ?? "");
  if (raw.includes("forbidden") || raw.includes("42501")) return "この画面に必要なデータの閲覧権限がありません。";
  return raw || "ダッシュボードを取得できませんでした。";
}

export default function LiveHomePage() {
  const navigate = useNavigate();
  const session = useFinanceSession();
  const [yearMonth, setYearMonth] = useState(currentMonth());
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [spends, setSpends] = useState<BudgetSpend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!session.selectedFacilityId) return;
    setLoading(true);
    setError("");
    try {
      const budgetPromise = listBudgetSummary(session.selectedFacilityId, yearMonth);
      if (session.canManageFacilityBudget) {
        const [operations, budgetRows, spendRows] = await Promise.all([
          getOperationsSnapshot(session.selectedFacilityId, yearMonth),
          budgetPromise,
          listBudgetSpends(session.selectedFacilityId, yearMonth),
        ]);
        setSnapshot(operations);
        setBudgets(budgetRows);
        setSpends(spendRows);
      } else {
        const budgetRows = await budgetPromise;
        setSnapshot(null);
        setBudgets(budgetRows);
        setSpends([]);
      }
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setLoading(false);
    }
  }, [session.selectedFacilityId, session.canManageFacilityBudget, yearMonth]);

  useEffect(() => { void refresh(); }, [refresh]);

  const delegated = budgets.filter((row) => row.budgetScope === "facility_delegated");
  const availableBudget = delegated.reduce((sum, row) => sum + row.availableAmount, 0);
  const pending = spends.filter((row) => row.status === "submitted");
  const pendingAmount = pending.reduce((sum, row) => sum + row.amount, 0);
  const missingBudget = delegated.length === 0;
  const occupancy = snapshot?.occupancyRate ?? null;

  const status = useMemo(() => {
    if (!session.canManageFacilityBudget) return { tone: "blue", title: "あなたに公開されている園予算を確認できます。", body: "運営状況の詳細は園長・主任以上の権限で表示されます。" };
    if (!snapshot) return { tone: "blue", title: "運営データを確認中です。", body: "未集計の項目は推測せず、未集計のまま表示します。" };
    if (snapshot.netResult != null && snapshot.netResult < 0) return { tone: "amber", title: "今月は支出が収入を上回っています。", body: "保育の質を落とすためではなく、園児数・問い合わせ・予算を含めて状況を共有します。" };
    if (occupancy != null && occupancy < 85) return { tone: "amber", title: `園児数の稼働率は ${occupancy}% です。`, body: "保育の良さの発信や、見学・問い合わせ対応を見直す判断材料として使います。" };
    return { tone: "green", title: "今月の運営状況に大きな注意サインはありません。", body: "使える園予算は、必要な保育材料や環境改善に活用してください。" };
  }, [session.canManageFacilityBudget, snapshot, occupancy]);

  return (
    <div className="hf-live-home">
      <div className="page-header hf-live-home-header">
        <div>
          <h1>Hoiku Finance</h1>
          <p>{session.selectedFacility?.name ?? "施設"}のお金と運営状況を、役割に応じた範囲で分かりやすく表示します。</p>
        </div>
        <div className="page-actions hf-home-toolbar">
          {session.facilities.length > 1 && <select value={session.selectedFacilityId} onChange={(event) => session.setSelectedFacilityId(event.target.value)}>{session.facilities.map((facility) => <option value={facility.id} key={facility.id}>{facility.name}</option>)}</select>}
          <input type="month" value={yearMonth} onChange={(event) => setYearMonth(event.target.value)} />
          <button className="btn btn-secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} />更新</button>
        </div>
      </div>

      {error && <div className="notice notice-error"><CircleAlert size={17} /><span>{error}</span></div>}

      {loading && !budgets.length && !snapshot ? (
        <div className="hf-home-loading"><LoaderCircle className="spin" size={28} /><span>実データを集計しています</span></div>
      ) : (
        <>
          <section className="hf-home-metrics">
            {session.canManageFacilityBudget && <article><span className="hf-home-metric-icon"><BarChart3 size={20} /></span><small>収入</small><strong>{shortYen(snapshot?.incomeTotal ?? null)}</strong><em>Hoiku Office</em></article>}
            {session.canManageFacilityBudget && <article><span className="hf-home-metric-icon"><Receipt size={20} /></span><small>支出</small><strong>{shortYen(snapshot?.expenseTotal ?? null)}</strong><em>Hoiku Office</em></article>}
            {session.canManageFacilityBudget && <article><span className="hf-home-metric-icon"><Users size={20} /></span><small>園児数 / 定員</small><strong>{snapshot?.enrolledCount == null ? "未登録" : `${snapshot.enrolledCount} / ${snapshot.capacity ?? "—"}名`}</strong><em>{snapshot?.occupancyRate == null ? "稼働率 未登録" : `稼働率 ${snapshot.occupancyRate}%`}</em></article>}
            <article><span className="hf-home-metric-icon"><WalletCards size={20} /></span><small>園で使える予算</small><strong>{missingBudget ? "未設定" : shortYen(availableBudget)}</strong><em>Hoiku Finance</em></article>
          </section>

          <section className="hf-home-main-grid">
            <article className="panel hf-home-status-panel">
              <div className="panel-heading"><div><h2>今月の状況</h2><p>数字を節約圧力ではなく、判断材料として共有します。</p></div><span className={`badge ${status.tone === "green" ? "badge-green" : status.tone === "amber" ? "badge-amber" : "badge-blue"}`}>実データ</span></div>
              <div className={`hf-home-status hf-home-status-${status.tone}`}>{status.tone === "green" ? <CircleCheck size={20} /> : <CircleAlert size={20} />}<div><strong>{status.title}</strong><span>{status.body}</span></div></div>
              {session.canManageFacilityBudget && snapshot && <div className="hf-home-status-lines"><div><span>当月収支</span><strong>{shortYen(snapshot.netResult)}</strong></div><div><span>問い合わせ</span><strong>{snapshot.inquiryCount}件</strong></div><div><span>園予算余力</span><strong>{shortYen(snapshot.availableDelegatedBudget)}</strong></div></div>}
            </article>

            <article className="panel hf-home-tasks-panel">
              <div className="panel-heading"><div><h2>確認すること</h2><p>実際に処理が必要な項目だけを表示します。</p></div></div>
              <button onClick={() => navigate("/budget")}><span className="hf-task-icon"><WalletCards size={18} /></span><div><strong>園予算</strong><small>{missingBudget ? "予算がまだ設定されていません" : `現在利用可能 ${shortYen(availableBudget)}`}</small></div><ArrowRight size={16} /></button>
              {session.canApproveBudget && <button onClick={() => navigate("/budget")}><span className="hf-task-icon"><Receipt size={18} /></span><div><strong>承認待ちの支出</strong><small>{pending.length ? `${pending.length}件 / ${shortYen(pendingAmount)}` : "承認待ちはありません"}</small></div><ArrowRight size={16} /></button>}
              {session.canManageFacilityBudget && <button onClick={() => navigate("/operations")}><span className="hf-task-icon"><BarChart3 size={18} /></span><div><strong>運営状況</strong><small>{snapshot?.accountingStatus ? `会計月: ${snapshot.accountingStatus}` : "会計集計状況を確認"}</small></div><ArrowRight size={16} /></button>}
              <button onClick={() => navigate("/reporting")}><span className="hf-task-icon"><FileCheck2 size={18} /></span><div><strong>経営情報報告</strong><small>ここdeサーチ等の報告データを確認</small></div><ArrowRight size={16} /></button>
            </article>
          </section>

          <section className="panel hf-home-shortcuts">
            <div className="panel-heading"><div><h2>すぐに開く</h2><p>役割に応じて必要な機能へ移動します。</p></div></div>
            <div>
              <button onClick={() => navigate("/budget")}><WalletCards size={20} /><strong>予算管理</strong><span>残額・繰越・支出申請</span></button>
              <button onClick={() => navigate("/books")}><BookOpen size={20} /><strong>帳簿・出納</strong><span>日々のお金を確認</span></button>
              {session.canManageFacilityBudget && <button onClick={() => navigate("/operations")}><BarChart3 size={20} /><strong>運営状況</strong><span>園児数・収支・問い合わせ</span></button>}
              <button onClick={() => navigate("/reporting")}><FileCheck2 size={20} /><strong>経営情報報告</strong><span>公開・報告の準備</span></button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
