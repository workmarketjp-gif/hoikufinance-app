import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Coins,
  Gift,
  Leaf,
  Plus,
  Receipt,
  ShieldCheck,
  Soup,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";

type BudgetKind = "materials" | "meal" | "environment" | "event";
type BudgetTab = "facility" | "hq" | "reward";

type BudgetItem = {
  id: BudgetKind;
  name: string;
  description: string;
  monthly: number;
  carryover: number;
  used: number;
  approvalLimit: number;
  owner: string;
  icon: typeof Leaf;
};

const yen = (value: number) => `¥${Math.round(value).toLocaleString("ja-JP")}`;

const initialBudgets: BudgetItem[] = [
  {
    id: "materials",
    name: "保育材料費",
    description: "玩具・絵本・制作・教材など",
    monthly: 150_000,
    carryover: 82_400,
    used: 64_800,
    approvalLimit: 30_000,
    owner: "園長・主任",
    icon: Leaf,
  },
  {
    id: "meal",
    name: "給食材料費",
    description: "食材・おやつ・季節メニューなど",
    monthly: 420_000,
    carryover: 0,
    used: 311_200,
    approvalLimit: 50_000,
    owner: "園長・栄養士",
    icon: Soup,
  },
  {
    id: "environment",
    name: "保育環境改善費",
    description: "保育室・園庭・収納・備品の改善",
    monthly: 100_000,
    carryover: 52_000,
    used: 25_000,
    approvalLimit: 30_000,
    owner: "園長・主任",
    icon: Sparkles,
  },
  {
    id: "event",
    name: "行事費",
    description: "季節行事・園外活動・装飾など",
    monthly: 80_000,
    carryover: 20_000,
    used: 35_000,
    approvalLimit: 30_000,
    owner: "園長・主任",
    icon: Gift,
  },
];

export default function BudgetPage() {
  const [tab, setTab] = useState<BudgetTab>("facility");
  const [budgets, setBudgets] = useState(initialBudgets);
  const [entryOpen, setEntryOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<BudgetKind>("materials");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  const totalAvailable = useMemo(
    () => budgets.reduce((sum, budget) => sum + budget.monthly + budget.carryover - budget.used, 0),
    [budgets],
  );
  const totalMonthly = budgets.reduce((sum, budget) => sum + budget.monthly, 0);
  const totalCarryover = budgets.reduce((sum, budget) => sum + budget.carryover, 0);
  const totalUsed = budgets.reduce((sum, budget) => sum + budget.used, 0);

  const openEntry = (id: BudgetKind) => {
    setSelectedId(id);
    setAmount("");
    setMemo("");
    setEntryOpen(true);
  };

  const saveEntry = () => {
    const numeric = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(numeric) || numeric <= 0 || !memo.trim()) return;
    const target = budgets.find((budget) => budget.id === selectedId);
    if (!target) return;
    const available = target.monthly + target.carryover - target.used;
    if (numeric > available) return;
    setBudgets((current) => current.map((budget) => budget.id === selectedId ? { ...budget, used: budget.used + numeric } : budget));
    setEntryOpen(false);
  };

  return (
    <>
      <div className="page-header budget-page-header">
        <div>
          <h1>予算管理</h1>
          <p>本部が管理するお金と、園長・主任が保育のために使えるお金を分けて管理します。</p>
        </div>
        <div className="page-actions"><span className="badge badge-blue">2026年8月</span><span className="badge badge-neutral">サンプルデータ</span></div>
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
              <span className="budget-kicker">園長・主任が管理できる予算</span>
              <strong>{yen(totalAvailable)}</strong>
              <p>今月、保育・給食・環境改善・行事のために使える残額です。</p>
            </div>
            <div className="budget-hero-stats">
              <div><span>今月付与</span><strong>{yen(totalMonthly)}</strong></div>
              <div><span>前月繰越</span><strong>{yen(totalCarryover)}</strong></div>
              <div><span>今月使用</span><strong>{yen(totalUsed)}</strong></div>
            </div>
          </section>

          <div className="budget-guidance">
            <CheckCircle2 size={18} />
            <div><strong>「使わないこと」ではなく「保育を良くするために、予算内でどう使うか」を管理します。</strong><span>使わなかった金額は、設定されたルールに従って翌月へ繰り越します。</span></div>
          </div>

          <section className="budget-card-grid">
            {budgets.map((budget) => {
              const Icon = budget.icon;
              const available = budget.monthly + budget.carryover - budget.used;
              const total = budget.monthly + budget.carryover;
              const usage = total > 0 ? Math.min(100, Math.round((budget.used / total) * 100)) : 0;
              return (
                <article className="budget-card" key={budget.id}>
                  <div className="budget-card-head"><span className="budget-category-icon"><Icon size={20} /></span><span className="budget-owner">{budget.owner}</span></div>
                  <h2>{budget.name}</h2>
                  <p>{budget.description}</p>
                  <div className="budget-available"><span>現在使える金額</span><strong>{yen(available)}</strong></div>
                  <div className="budget-progress"><span style={{ width: `${usage}%` }} /></div>
                  <div className="budget-breakdown">
                    <span>今月 {yen(budget.monthly)}</span><span>繰越 {yen(budget.carryover)}</span><span>使用 {yen(budget.used)}</span>
                  </div>
                  <div className="budget-rule"><CircleAlert size={14} />1件 {yen(budget.approvalLimit)} までは園内承認で支出可</div>
                  <button className="budget-spend-button" onClick={() => openEntry(budget.id)}><Plus size={16} />この予算から支出を登録</button>
                </article>
              );
            })}
          </section>

          <section className="panel budget-policy-panel">
            <div className="panel-heading"><div><h2>予算ルール</h2><p>本部がルールを設定し、現場はその範囲内で判断できます。</p></div></div>
            <div className="budget-policy-list">
              <div><span>翌月繰越</span><strong>する</strong><small>未使用額は翌月へ</small></div>
              <div><span>年度末繰越</span><strong>本部確認</strong><small>年度をまたぐ場合は承認</small></div>
              <div><span>予算超過</span><strong>不可</strong><small>追加予算を申請</small></div>
              <div><span>証憑</span><strong>必須</strong><small>領収書・請求書を紐付け</small></div>
            </div>
          </section>
        </>
      )}

      {tab === "hq" && (
        <section className="budget-split-layout">
          <article className="panel">
            <div className="panel-heading"><div><h2>本部で管理する予算</h2><p>現場では変更・支出できない固定費や全社費用です。</p></div><span className="badge badge-neutral">現場は閲覧範囲のみ</span></div>
            <div className="hq-budget-list">
              {[
                ["人件費総額", "給与・法定福利費・本部配賦", "6,141万円 / 年"],
                ["賃借料・家賃", "建物・駐車場等", "960万円 / 年"],
                ["通信・システム", "通信費・本部契約サービス", "168万円 / 年"],
                ["保険・管理費", "保険・顧問・共通管理費", "244万円 / 年"],
              ].map(([name, detail, value]) => <div className="hq-budget-row" key={name}><span className="hq-budget-icon"><Coins size={18} /></span><div><strong>{name}</strong><small>{detail}</small></div><b>{value}</b><ChevronRight size={16} /></div>)}
            </div>
          </article>
          <article className="panel delegation-panel">
            <div className="panel-heading"><div><h2>予算を現場へ委譲</h2><p>金額・管理者・承認ライン・繰越ルールを本部で設定します。</p></div></div>
            <div className="delegation-example">
              <span>保育材料費</span><strong>月額 15万円</strong><small>園長・主任 / 3万円以下は園内承認 / 翌月繰越あり</small>
            </div>
            <button className="btn btn-primary btn-block">予算設定を編集</button>
          </article>
        </section>
      )}

      {tab === "reward" && (
        <>
          <section className="reward-summary-grid">
            <article><span>賞与総予算</span><strong>300万円</strong><small>本部設定</small></article>
            <article><span>園長評価配分枠</span><strong>50万円</strong><small>園長が配分可能</small></article>
            <article><span>処遇改善 未配分確認</span><strong>20万円</strong><small>配分確認が必要</small></article>
          </section>
          <section className="budget-split-layout reward-layout">
            <article className="panel">
              <div className="panel-heading"><div><h2>園長評価による賞与配分</h2><p>本部が設定した裁量枠の中だけ、現場評価を待遇へ反映できます。</p></div><span className="badge badge-blue">残り 27万円</span></div>
              <div className="reward-list">
                {[["田中先生", "丁寧な保育・保護者対応", "10万円"], ["鈴木先生", "後輩育成・クラス運営", "8万円"], ["佐藤先生", "行事・環境改善への貢献", "5万円"]].map(([name, note, value]) => <div key={name}><span className="reward-avatar">{name.slice(0, 1)}</span><div><strong>{name}</strong><small>{note}</small></div><b>{value}</b><ChevronRight size={16} /></div>)}
              </div>
            </article>
            <article className="panel treatment-panel">
              <div className="panel-heading"><div><h2>処遇改善予算</h2><p>職員のために受け入れた予算を、受入から配分まで見えるようにします。</p></div></div>
              <div className="treatment-number"><span>受入見込</span><strong>480万円</strong></div>
              <div className="treatment-bar"><span className="distributed" /><span className="social" /><span className="remaining" /></div>
              <div className="treatment-legend"><span>配分済 425万円</span><span>法定福利費等 35万円</span><span className="warning-text">未配分 20万円</span></div>
              <div className="budget-guidance compact"><CircleAlert size={17} /><div><strong>20万円分の配分確認が必要です。</strong><span>目的のある予算を、目的外のまま残さないための確認です。</span></div></div>
            </article>
          </section>
        </>
      )}

      {entryOpen && (
        <div className="modal-backdrop" onMouseDown={() => setEntryOpen(false)}>
          <div className="modal budget-entry-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><h2>予算から支出を登録</h2><p>{budgets.find((budget) => budget.id === selectedId)?.name}</p></div><button className="icon-button" onClick={() => setEntryOpen(false)}><X size={18} /></button></div>
            <div className="selected-budget-balance"><WalletCards size={18} /><div><span>登録前の利用可能額</span><strong>{yen((budgets.find((budget) => budget.id === selectedId)?.monthly ?? 0) + (budgets.find((budget) => budget.id === selectedId)?.carryover ?? 0) - (budgets.find((budget) => budget.id === selectedId)?.used ?? 0))}</strong></div></div>
            <div className="form-grid">
              <label className="field full"><span>内容</span><input value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="例：乳児室の絵本・玩具" /></label>
              <label className="field full"><span>金額</span><div className="amount-input"><span>¥</span><input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /></div></label>
              <label className="upload-drop full"><Receipt size={20} /><strong>領収書・請求書を添付</strong><span>支出後でも追加できます</span><input type="file" accept="image/*,.pdf" /></label>
            </div>
            <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setEntryOpen(false)}>キャンセル</button><button className="btn btn-primary" onClick={saveEntry}>予算から登録 <ArrowRight size={15} /></button></div>
          </div>
        </div>
      )}
    </>
  );
}
