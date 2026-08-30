import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Baby,
  BarChart3,
  CircleAlert,
  CircleCheck,
  Coins,
  HeartHandshake,
  LoaderCircle,
  Megaphone,
  MessageCircleMore,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useFinanceSession } from "./FinanceSession";
import { getOperationsSnapshot, type OperationsSnapshot } from "./lib/operationsRepository";

const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const yen = (value: number | null) => value == null ? "未集計" : `¥${Math.round(value).toLocaleString("ja-JP")}`;
const shortYen = (value: number | null) => {
  if (value == null) return "未集計";
  if (Math.abs(value) >= 10_000) return `${(value / 10_000).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}万円`;
  return yen(value);
};
const percent = (value: number | null) => value == null ? "未登録" : `${value.toLocaleString("ja-JP", { maximumFractionDigits: 1 })}%`;

function errorMessage(caught: unknown) {
  const raw = caught instanceof Error ? caught.message : String(caught ?? "");
  if (raw.includes("operations_snapshot_forbidden") || raw.includes("42501")) return "運営状況の詳細は園長・主任または本部の権限者に公開されています。";
  return raw || "運営状況を取得できませんでした。";
}

function buildMessage(snapshot: OperationsSnapshot) {
  if (snapshot.enrolledCount == null || snapshot.capacity == null) {
    return {
      tone: "blue" as const,
      title: "園児数データがまだ登録されていません。",
      body: "Hoiku Officeで当月の園児数・定員を整えると、稼働状況を現場向けに分かりやすく表示できます。",
    };
  }
  if ((snapshot.occupancyRate ?? 100) < 85) {
    return {
      tone: "amber" as const,
      title: `現在の稼働率は ${percent(snapshot.occupancyRate)} です。`,
      body: "保育の質を落として支出を減らすのではなく、日々の保育の良さを保護者へ伝える機会や、見学・問い合わせへの対応を確認したい状態です。",
    };
  }
  if (snapshot.netResult != null && snapshot.netResult < 0) {
    return {
      tone: "amber" as const,
      title: "今月は支出が収入を上回っています。",
      body: "経営責任は本部が持ちます。そのうえで、現場には園児数や問い合わせ、使える予算を共有し、保育を良くするための判断材料として使います。",
    };
  }
  return {
    tone: "green" as const,
    title: "今月の運営状況は大きな注意サインがありません。",
    body: "使える園予算は必要な保育環境改善に活用しながら、保護者との関わりや日々の保育の発信も継続していきましょう。",
  };
}

export default function OperationsPage() {
  const navigate = useNavigate();
  const session = useFinanceSession();
  const [yearMonth, setYearMonth] = useState(currentMonth());
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!session.selectedFacilityId || !session.canManageFacilityBudget) return;
    setLoading(true);
    setError("");
    try {
      setSnapshot(await getOperationsSnapshot(session.selectedFacilityId, yearMonth));
    } catch (caught) {
      setSnapshot(null);
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [session.selectedFacilityId, session.canManageFacilityBudget, yearMonth]);

  useEffect(() => { void refresh(); }, [refresh]);

  const message = useMemo(() => snapshot ? buildMessage(snapshot) : null, [snapshot]);
  const accountingReady = snapshot?.incomeTotal != null || snapshot?.expenseTotal != null;
  const occupancyWidth = Math.max(0, Math.min(100, snapshot?.occupancyRate ?? 0));
  const payrollRate = snapshot?.incomeTotal && snapshot.payrollTotal != null && snapshot.incomeTotal > 0
    ? (snapshot.payrollTotal / snapshot.incomeTotal) * 100
    : null;

  if (session.loading) {
    return <div className="operations-live-loading"><LoaderCircle className="spin" size={28} /><span>施設情報を読み込んでいます</span></div>;
  }

  if (!session.canManageFacilityBudget) {
    return (
      <>
        <div className="page-header operations-page-header"><div><h1>運営状況</h1><p>園の経営状況を、現場でも理解できる言葉で共有します。</p></div></div>
        <section className="operations-permission panel">
          <ShieldCheck size={34} />
          <h2>この画面は園長・主任以上に公開されています</h2>
          <p>個人給与や本部の機密情報を無制限に公開せず、役割に応じて必要な情報だけを共有します。</p>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="page-header operations-page-header">
        <div>
          <h1>運営状況</h1>
          <p>園の経営状況を、現場でも理解できる言葉で共有します。節約を求めるためではなく、保育と運営を一緒に良くするための情報です。</p>
        </div>
        <div className="page-actions operations-toolbar">
          {session.facilities.length > 1 && (
            <select value={session.selectedFacilityId} onChange={(event) => session.setSelectedFacilityId(event.target.value)} aria-label="施設">
              {session.facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
            </select>
          )}
          <input type="month" value={yearMonth} onChange={(event) => setYearMonth(event.target.value)} aria-label="対象月" />
          <button className="btn btn-secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} />更新</button>
          <span className="badge badge-blue">実データ</span>
        </div>
      </div>

      {error && <div className="notice notice-error"><CircleAlert size={17} /><span>{error}</span></div>}

      <div className="operations-principle">
        <ShieldCheck size={20} />
        <div>
          <strong>経営責任を現場へ押しつける画面ではありません。</strong>
          <span>本部が経営責任を持ちながら、園児数・問い合わせ・園予算など、保育の現場と関係する情報は閉じずに共有します。</span>
        </div>
      </div>

      {loading && !snapshot ? (
        <div className="operations-live-loading"><LoaderCircle className="spin" size={28} /><span>Hoiku Office・Market・Financeのデータを集計しています</span></div>
      ) : snapshot ? (
        <>
          <section className="operations-score-grid">
            <article className="operations-score-card">
              <span className="operations-score-icon"><Baby size={20} /></span>
              <div><small>園児数 / 定員</small><strong>{snapshot.enrolledCount == null ? "未登録" : `${snapshot.enrolledCount} / ${snapshot.capacity ?? "—"}名`}</strong><span>稼働率 {percent(snapshot.occupancyRate)}</span></div>
              <em>Hoiku Office</em>
            </article>
            <article className="operations-score-card">
              <span className="operations-score-icon"><BarChart3 size={20} /></span>
              <div><small>今月の収入 / 支出</small><strong>{shortYen(snapshot.incomeTotal)} / {shortYen(snapshot.expenseTotal)}</strong><span className={snapshot.netResult != null && snapshot.netResult < 0 ? "warning-text" : "positive-text"}>収支 {shortYen(snapshot.netResult)}</span></div>
              <em>Hoiku Office</em>
            </article>
            <article className="operations-score-card">
              <span className="operations-score-icon"><Users size={20} /></span>
              <div><small>見学・入園等の問い合わせ</small><strong>{snapshot.inquiryCount}件</strong><span>{yearMonth.replace("-", "年")}月の受付件数</span></div>
              <em>Hoiku Market</em>
            </article>
            <article className="operations-score-card">
              <span className="operations-score-icon"><WalletCards size={20} /></span>
              <div><small>園で使える予算余力</small><strong>{shortYen(snapshot.availableDelegatedBudget)}</strong><span>申請中支出を差引済み</span></div>
              <em>Hoiku Finance</em>
            </article>
          </section>

          <section className="operations-main-grid">
            <article className="panel operations-health-panel">
              <div className="panel-heading"><div><h2>園の運営状況</h2><p>登録済みの実データだけを、現場が判断しやすい指標へ置き換えています。</p></div><span className={`badge ${message?.tone === "amber" ? "badge-amber" : message?.tone === "green" ? "badge-green" : "badge-blue"}`}>{accountingReady ? "会計連携済" : "会計集計待ち"}</span></div>
              <div className="operations-health-row">
                <div className="health-label"><span>園児数</span><small>定員に対する在籍状況</small></div>
                <div className="health-meter"><span style={{ width: `${occupancyWidth}%` }} /></div><strong>{percent(snapshot.occupancyRate)}</strong>
              </div>
              <div className="operations-health-row">
                <div className="health-label"><span>当月収支</span><small>収入から支出を差し引いた額</small></div>
                <div className={`health-meter ${snapshot.netResult != null && snapshot.netResult >= 0 ? "healthy" : ""}`}><span style={{ width: accountingReady ? `${snapshot.netResult != null && snapshot.netResult >= 0 ? 88 : 42}%` : "0%" }} /></div><strong>{shortYen(snapshot.netResult)}</strong>
              </div>
              <div className="operations-health-row">
                <div className="health-label"><span>現場予算余力</span><small>保育・給食・環境改善等で使える残額</small></div>
                <div className="health-meter healthy"><span style={{ width: snapshot.availableDelegatedBudget > 0 ? "76%" : "0%" }} /></div><strong>{shortYen(snapshot.availableDelegatedBudget)}</strong>
              </div>
              <div className="operations-health-row">
                <div className="health-label"><span>人件費 / 収入</span><small>給与連携済みの場合のみ計算</small></div>
                <div className="health-meter"><span style={{ width: `${Math.max(0, Math.min(100, payrollRate ?? 0))}%` }} /></div><strong>{payrollRate == null ? "未集計" : percent(payrollRate)}</strong>
              </div>
            </article>

            <article className="panel operations-message-panel">
              <div className="panel-heading"><div><h2>今月の共有メッセージ</h2><p>数字だけではなく、状況の意味を短く共有します。</p></div></div>
              <div className={`operations-message-status operations-message-${message?.tone ?? "blue"}`}>
                {message?.tone === "green" ? <CircleCheck size={19} /> : <CircleAlert size={19} />}
                <div><strong>{message?.title}</strong><span>{message?.body}</span></div>
              </div>
              <div className="operations-message-note">
                <span>HFの考え方</span>
                <p>数字が悪いから現場に節約を求めるのではなく、使える予算は保育環境のために使いながら、園児数や問い合わせなど自分たちの保育とも関係する情報を理解できる状態にします。</p>
              </div>
            </article>
          </section>

          <section className="panel operations-actions-panel">
            <div className="panel-heading"><div><h2>現場で変えられること</h2><p>経営数字を責任転嫁に使わず、改善のヒントとしてつなげます。</p></div></div>
            <div className="operations-action-grid">
              <button onClick={() => navigate("/operations")}>
                <span className="action-idea-icon"><Megaphone size={20} /></span>
                <strong>保育の良さを伝える</strong>
                <small>園だより・写真・見学時の説明など、日々の保育を保護者へ伝える。</small>
                <span className="action-link">今月の問い合わせ {snapshot.inquiryCount}件 <ArrowRight size={14} /></span>
              </button>
              <button type="button">
                <span className="action-idea-icon"><MessageCircleMore size={20} /></span>
                <strong>保護者との関わりを確認</strong>
                <small>アンケートや相談内容を、個人情報を守った形で今後ここへ連携します。</small>
                <span className="action-link muted">アンケートは未連携</span>
              </button>
              <button onClick={() => navigate("/budget")}>
                <span className="action-idea-icon"><Sparkles size={20} /></span>
                <strong>保育環境に予算を使う</strong>
                <small>必要な絵本・玩具・環境改善を我慢せず、残予算の範囲で実行する。</small>
                <span className="action-link">園予算を見る <ArrowRight size={14} /></span>
              </button>
            </div>
          </section>

          <section className="operations-signal-grid">
            <article className="panel">
              <div className="panel-heading"><div><h2>実データの接続状況</h2><p>どの数字がどこから来ているかを明確にします。</p></div></div>
              <div className="operations-source-list">
                <div><span className="source-icon"><Baby size={17} /></span><div><strong>園児数・定員</strong><small>Hoiku Office</small></div><span className={`badge ${snapshot.enrolledCount == null ? "badge-amber" : "badge-green"}`}>{snapshot.enrolledCount == null ? "未登録" : "接続済"}</span></div>
                <div><span className="source-icon"><Coins size={17} /></span><div><strong>収入・支出・人件費</strong><small>Hoiku Office 会計</small></div><span className={`badge ${accountingReady ? "badge-green" : "badge-amber"}`}>{accountingReady ? "接続済" : "集計待ち"}</span></div>
                <div><span className="source-icon"><Users size={17} /></span><div><strong>問い合わせ件数</strong><small>Hoiku Market</small></div><span className="badge badge-green">接続済</span></div>
                <div><span className="source-icon"><WalletCards size={17} /></span><div><strong>園予算</strong><small>Hoiku Finance</small></div><span className="badge badge-green">接続済</span></div>
              </div>
            </article>

            <article className="panel operations-unconnected-panel">
              <div className="panel-heading"><div><h2>保護者の声</h2><p>架空の評価点やコメントは表示しません。</p></div></div>
              <div className="operations-unconnected"><HeartHandshake size={28} /><strong>アンケートデータは未連携です</strong><p>保護者アンケート・相談・クチコミ等を安全に集約できるようになった時点で、個人情報を除いた傾向だけをここへ表示します。</p></div>
            </article>
          </section>

          <section className="panel operations-visibility-panel">
            <div className="panel-heading"><div><h2>見せる範囲も管理</h2><p>透明性は、個人給与や機密情報まで無制限に公開することではありません。</p></div></div>
            <div className="visibility-table">
              <div className="visibility-row head"><span>情報</span><span>一般職員</span><span>主任・園長</span><span>本部</span></div>
              <div className="visibility-row"><strong>園児数・運営状況</strong><span>今後設定</span><span>詳細</span><span>全施設</span></div>
              <div className="visibility-row"><strong>園で使える予算</strong><span>予算設定による</span><span>管理</span><span>設定・管理</span></div>
              <div className="visibility-row"><strong>個人給与</strong><span>本人のみ</span><span>権限なし</span><span>権限者のみ</span></div>
              <div className="visibility-row"><strong>処遇改善の総額・配分状況</strong><span>今後設定</span><span>詳細</span><span>設定・確認</span></div>
            </div>
          </section>
        </>
      ) : (
        <section className="operations-empty panel"><CircleAlert size={32} /><h2>運営状況を表示できません</h2><p>施設データまたは権限設定を確認してください。</p></section>
      )}
    </>
  );
}
