import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calculator,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDollarSign,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  FolderOpen,
  Home,
  Landmark,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router";

type LedgerKind = "cash" | "bank" | "income" | "expense";
type AccountingMode = "social" | "corporate";

type LedgerRow = {
  id: number;
  date: string;
  kind: LedgerKind;
  account: string;
  category: string;
  description: string;
  amount: number;
  direction: "in" | "out";
  evidence: "ok" | "missing";
};

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  keywords?: string[];
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "日常会計",
    items: [
      { to: "/", label: "ホーム", icon: LayoutDashboard },
      { to: "/books", label: "帳簿・出納", icon: BookOpen, keywords: ["現金出納帳", "預金出納帳", "収入簿", "支出簿"] },
      { to: "/billing", label: "請求・入金", icon: Receipt, keywords: ["未収金", "保護者徴収", "入金消込"] },
      { to: "/public-price", label: "公定価格・加算", icon: CircleDollarSign, keywords: ["処遇改善", "誰でも通園", "加算"] },
    ],
  },
  {
    label: "月次・年度",
    items: [
      { to: "/closing", label: "月次・決算", icon: Calculator, keywords: ["決算書", "社会福祉法人会計", "企業会計"] },
      { to: "/reporting", label: "経営情報報告", icon: FileCheck2, keywords: ["ここdeサーチ", "人件費率", "経営情報の見える化"] },
      { to: "/documents", label: "証憑・監査", icon: FolderOpen, keywords: ["領収書", "請求書", "監査"] },
    ],
  },
  {
    label: "管理",
    items: [
      { to: "/settings", label: "設定", icon: Settings },
    ],
  },
];

const sampleRows: LedgerRow[] = [
  { id: 1, date: "2026-08-28", kind: "income", account: "普通預金", category: "施設型給付費", description: "8月分 給付費", amount: 6_820_000, direction: "in", evidence: "ok" },
  { id: 2, date: "2026-08-27", kind: "expense", account: "普通預金", category: "給食材料費", description: "給食食材 8月締め", amount: 486_200, direction: "out", evidence: "ok" },
  { id: 3, date: "2026-08-26", kind: "cash", account: "現金", category: "消耗品費", description: "保育用品・文具", amount: 18_640, direction: "out", evidence: "ok" },
  { id: 4, date: "2026-08-25", kind: "income", account: "普通預金", category: "延長保育料", description: "保護者負担分", amount: 76_500, direction: "in", evidence: "ok" },
  { id: 5, date: "2026-08-22", kind: "expense", account: "普通預金", category: "水道光熱費", description: "電気料金", amount: 193_480, direction: "out", evidence: "missing" },
  { id: 6, date: "2026-08-20", kind: "bank", account: "普通預金", category: "処遇改善等加算", description: "処遇改善加算入金", amount: 1_240_000, direction: "in", evidence: "ok" },
];

const money = (value: number) => `¥${Math.round(value).toLocaleString("ja-JP")}`;
const shortMoney = (value: number) => `${Math.round(value / 10_000).toLocaleString("ja-JP")}万円`;

function FinanceMark({ className = "" }: { className?: string }) {
  return (
    <span className={`finance-mark ${className}`} aria-hidden="true">
      <span className="finance-leaf finance-leaf-a" />
      <span className="finance-leaf finance-leaf-b" />
      <span className="finance-dot" />
    </span>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-lockup${compact ? " compact" : ""}`}>
      <FinanceMark />
      {!compact && (
        <div className="brand-copy">
          <strong>Hoiku Finance</strong>
          <span>保育園会計</span>
        </div>
      )}
    </div>
  );
}

function LoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="loading-overlay" aria-live="polite" aria-label="読み込み中">
      <div className="loading-card">
        <FinanceMark className="loading-mark" />
        <strong>Hoiku Finance</strong>
        <span>データを読み込んでいます</span>
      </div>
    </div>
  );
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "blue" | "green" | "amber" | "red" | "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [yearMonth, setYearMonth] = useState("2026-08");

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 650);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 240);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  const allItems = useMemo(() => navGroups.flatMap((group) => group.items), []);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allItems.filter((item) => [item.label, ...(item.keywords ?? [])].some((value) => value.toLowerCase().includes(q))).slice(0, 6);
  }, [allItems, query]);

  const current = allItems.find((item) => item.to === location.pathname) ?? allItems[0];

  return (
    <div className="app-shell">
      <LoadingOverlay visible={loading} />

      <aside className={`sidebar${mobileOpen ? " mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <button className="brand-button" onClick={() => navigate("/")} aria-label="Hoiku Finance ホーム">
            <Brand />
          </button>
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="メニューを閉じる"><X size={19} /></button>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                    <Icon size={18} strokeWidth={1.9} />
                    <span>{item.label}</span>
                    {item.to === "/reporting" && <span className="nav-pill">82%</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="service-switcher">
          <div className="nav-group-label">Hoiku Grove</div>
          <div className="service-grid">
            <a href="https://hoikuoffice.jp" target="_blank" rel="noreferrer" className="service-chip service-office"><span>HO</span><small>Office</small></a>
            <a href="https://hoiku-market.jp" target="_blank" rel="noreferrer" className="service-chip service-market"><span>HM</span><small>Market</small></a>
            <button type="button" className="service-chip service-color"><span>HC</span><small>Color</small></button>
            <button type="button" className="service-chip service-finance active"><span>HF</span><small>Finance</small></button>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="avatar">管</div>
          <div className="sidebar-user-copy">
            <strong>管理者</strong>
            <span>ひかり保育園</span>
          </div>
          <button className="icon-button" aria-label="アカウントメニュー"><MoreHorizontal size={18} /></button>
        </div>
      </aside>

      <button className={`mobile-backdrop${mobileOpen ? " show" : ""}`} onClick={() => setMobileOpen(false)} aria-label="メニューを閉じる" />

      <div className="main-area">
        <header className="topbar">
          <div className="mobile-brand-row">
            <button className="icon-button mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="メニューを開く"><Menu size={21} /></button>
            <Brand compact />
            <strong className="mobile-page-title">{current.label}</strong>
          </div>

          <button className="facility-switcher">
            <span className="facility-icon"><Building2 size={18} /></span>
            <span className="facility-copy">
              <small>施設</small>
              <strong>ひかり保育園</strong>
            </span>
            <ChevronDown size={15} />
          </button>

          <div className="topbar-search">
            <Search size={17} />
            <input
              value={query}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results[0]) {
                  navigate(results[0].to);
                  setQuery("");
                  setSearchOpen(false);
                }
                if (event.key === "Escape") setSearchOpen(false);
              }}
              placeholder="帳簿・決算・報告を検索"
              aria-label="機能を検索"
            />
            {searchOpen && query.trim() && (
              <div className="search-results">
                {results.length ? results.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.to} onClick={() => { navigate(item.to); setQuery(""); setSearchOpen(false); }}>
                      <Icon size={16} /><span>{item.label}</span><ChevronRight size={15} />
                    </button>
                  );
                }) : <div className="search-empty">該当する機能がありません</div>}
              </div>
            )}
          </div>

          <div className="topbar-actions">
            <label className="month-control">
              <CalendarDays size={16} />
              <input type="month" value={yearMonth} onChange={(event) => setYearMonth(event.target.value)} />
            </label>
            <button className="icon-button notification-button" aria-label="通知"><Bell size={19} /><span /></button>
          </div>
        </header>

        <main className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard yearMonth={yearMonth} />} />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/public-price" element={<PublicPricePage />} />
            <Route path="/closing" element={<ClosingPage />} />
            <Route path="/reporting" element={<ReportingPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="主要メニュー">
        <MobileTab to="/" label="ホーム" icon={Home} end />
        <MobileTab to="/books" label="出納" icon={Wallet} />
        <MobileTab to="/billing" label="収支" icon={Receipt} />
        <MobileTab to="/closing" label="決算" icon={Calculator} />
        <button className={`mobile-tab${mobileOpen ? " active" : ""}`} onClick={() => setMobileOpen(true)}><Menu size={22} /><span>メニュー</span></button>
      </nav>
    </div>
  );
}

function MobileTab({ to, label, icon: Icon, end = false }: { to: string; label: string; icon: LucideIcon; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `mobile-tab${isActive ? " active" : ""}`}>
      <Icon size={22} /><span>{label}</span>
    </NavLink>
  );
}

function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

function Dashboard({ yearMonth }: { yearMonth: string }) {
  const navigate = useNavigate();
  const income = 9_842_300;
  const expense = 8_112_450;
  const balance = income - expense;
  const cards = [
    { label: "収入", value: shortMoney(income), sub: "給付費・加算・利用料", icon: ArrowUpRight, tone: "green" },
    { label: "支出", value: shortMoney(expense), sub: "人件費・給食・運営費", icon: ArrowDownRight, tone: "blue" },
    { label: "収支差額", value: shortMoney(balance), sub: "当月見込", icon: BarChart3, tone: "purple" },
    { label: "人件費率", value: "62.4%", sub: "経営情報報告に連携", icon: Users, tone: "amber" },
  ];
  return (
    <>
      <PageHeader
        title="会計ダッシュボード"
        description="毎日の出納から、月次・決算・経営情報報告までを一つにつなぎます。"
        actions={<><Badge tone="blue">{yearMonth.replace("-", "年")}月</Badge><Badge tone="neutral">サンプルデータ</Badge></>}
      />

      <section className="metric-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="metric-card" key={card.label}>
              <div className={`metric-icon metric-${card.tone}`}><Icon size={20} /></div>
              <div className="metric-label">{card.label}</div>
              <strong className="metric-value">{card.value}</strong>
              <span className="metric-sub">{card.sub}</span>
            </article>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <div className="panel panel-main">
          <div className="panel-heading">
            <div><h2>今日の会計業務</h2><p>未処理のものから進めてください。</p></div>
            <button className="text-button" onClick={() => navigate("/books")}>すべて見る <ChevronRight size={15} /></button>
          </div>
          <div className="task-list">
            <TaskRow icon={Receipt} title="未確認の領収書" detail="証憑が未登録の支出があります" count="3件" tone="amber" onClick={() => navigate("/documents")} />
            <TaskRow icon={Wallet} title="現金残高の確認" detail="月末の実査残高を入力してください" count="未完了" tone="blue" onClick={() => navigate("/books")} />
            <TaskRow icon={CircleDollarSign} title="処遇改善加算の配分確認" detail="加算受入額と賃金改善額を確認" count="差額 20万円" tone="amber" onClick={() => navigate("/public-price")} />
            <TaskRow icon={FileCheck2} title="経営情報報告" detail="ここdeサーチ入力項目を自動集計中" count="82%" tone="green" onClick={() => navigate("/reporting")} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading"><div><h2>月次締め</h2><p>8月の進捗</p></div><Badge tone="amber">確認中</Badge></div>
          <div className="closing-progress">
            <ProgressItem label="帳簿入力" value={100} />
            <ProgressItem label="証憑確認" value={88} />
            <ProgressItem label="未収・未払" value={76} />
            <ProgressItem label="仕訳・残高" value={92} />
          </div>
          <button className="btn btn-primary btn-block" onClick={() => navigate("/closing")}>月次締めを確認</button>
        </div>
      </section>

      <section className="panel quick-panel">
        <div className="panel-heading"><div><h2>すぐに入力</h2><p>園で毎日使う金銭管理</p></div></div>
        <div className="quick-actions">
          <QuickAction icon={Wallet} title="現金出納" desc="小口・現金の入出金" onClick={() => navigate("/books?tab=cash")} />
          <QuickAction icon={Landmark} title="預金出納" desc="口座の入出金" onClick={() => navigate("/books?tab=bank")} />
          <QuickAction icon={ArrowUpRight} title="収入簿" desc="給付費・利用料・補助金" onClick={() => navigate("/books?tab=income")} />
          <QuickAction icon={ArrowDownRight} title="支出簿" desc="経費・仕入・運営費" onClick={() => navigate("/books?tab=expense")} />
        </div>
      </section>
    </>
  );
}

function TaskRow({ icon: Icon, title, detail, count, tone, onClick }: { icon: LucideIcon; title: string; detail: string; count: string; tone: "blue" | "amber" | "green"; onClick: () => void }) {
  return (
    <button className="task-row" onClick={onClick}>
      <span className={`task-icon task-${tone}`}><Icon size={18} /></span>
      <span className="task-copy"><strong>{title}</strong><small>{detail}</small></span>
      <span className="task-count">{count}</span>
      <ChevronRight size={16} />
    </button>
  );
}

function ProgressItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="progress-item">
      <div><span>{label}</span><strong>{value}%</strong></div>
      <div className="progress-track"><span style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, desc, onClick }: { icon: LucideIcon; title: string; desc: string; onClick: () => void }) {
  return (
    <button className="quick-action" onClick={onClick}>
      <span className="quick-icon"><Icon size={21} /></span>
      <span><strong>{title}</strong><small>{desc}</small></span>
      <ChevronRight size={16} />
    </button>
  );
}

function BooksPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const paramTab = params.get("tab") as LedgerKind | null;
  const [tab, setTab] = useState<LedgerKind>(paramTab && ["cash", "bank", "income", "expense"].includes(paramTab) ? paramTab : "cash");
  const [rows, setRows] = useState(sampleRows);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ date: "2026-08-30", category: "", description: "", amount: "", direction: "out" as "in" | "out" });

  useEffect(() => {
    if (paramTab && ["cash", "bank", "income", "expense"].includes(paramTab)) setTab(paramTab);
  }, [paramTab]);

  const tabMeta: Record<LedgerKind, { label: string; icon: LucideIcon; description: string }> = {
    cash: { label: "現金出納帳", icon: Wallet, description: "現金・小口現金の日々の入出金を記録します。" },
    bank: { label: "預金出納帳", icon: Landmark, description: "銀行口座ごとの入出金と残高を管理します。" },
    income: { label: "収入簿", icon: ArrowUpRight, description: "給付費、加算、利用料、補助金などの収入を記録します。" },
    expense: { label: "支出簿", icon: ArrowDownRight, description: "人件費、給食費、運営費などの支出を記録します。" },
  };
  const visible = rows.filter((row) => row.kind === tab || (tab === "bank" && row.account !== "現金"));
  const inflow = visible.filter((row) => row.direction === "in").reduce((sum, row) => sum + row.amount, 0);
  const outflow = visible.filter((row) => row.direction === "out").reduce((sum, row) => sum + row.amount, 0);

  const save = () => {
    const amount = Number(draft.amount.replace(/,/g, ""));
    if (!draft.category.trim() || !draft.description.trim() || !Number.isFinite(amount) || amount <= 0) return;
    setRows((prev) => [{
      id: Date.now(),
      date: draft.date,
      kind: tab,
      account: tab === "cash" ? "現金" : "普通預金",
      category: draft.category,
      description: draft.description,
      amount,
      direction: tab === "income" ? "in" : tab === "expense" ? "out" : draft.direction,
      evidence: "missing",
    }, ...prev]);
    setDraft({ date: draft.date, category: "", description: "", amount: "", direction: "out" });
    setShowForm(false);
  };

  return (
    <>
      <PageHeader
        title="帳簿・出納"
        description="園で発生するお金の動きを、帳簿ごとにシンプルに記録します。"
        actions={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> 入出金を登録</button>}
      />

      <div className="segmented ledger-tabs">
        {(Object.keys(tabMeta) as LedgerKind[]).map((key) => {
          const Icon = tabMeta[key].icon;
          return <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}><Icon size={16} />{tabMeta[key].label}</button>;
        })}
      </div>

      <div className="book-summary-grid">
        <div className="mini-summary"><span>入金</span><strong className="positive">{money(inflow)}</strong></div>
        <div className="mini-summary"><span>出金</span><strong>{money(outflow)}</strong></div>
        <div className="mini-summary"><span>差引</span><strong>{money(inflow - outflow)}</strong></div>
        <div className="mini-summary"><span>証憑未確認</span><strong className="warning">{visible.filter((row) => row.evidence === "missing").length}件</strong></div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div><h2>{tabMeta[tab].label}</h2><p>{tabMeta[tab].description}</p></div>
          <div className="inline-actions"><button className="btn btn-secondary"><Upload size={15} /> CSV取込</button><button className="btn btn-secondary"><Download size={15} /> 出力</button></div>
        </div>
        <div className="table-scroll desktop-ledger">
          <table className="data-table">
            <thead><tr><th>日付</th><th>口座</th><th>科目</th><th>内容</th><th>証憑</th><th className="num">入金</th><th className="num">出金</th><th /></tr></thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}><td>{row.date.slice(5).replace("-", "/")}</td><td>{row.account}</td><td><span className="category-chip">{row.category}</span></td><td>{row.description}</td><td>{row.evidence === "ok" ? <Badge tone="green"><Check size={12} />確認済</Badge> : <Badge tone="amber"><CircleAlert size={12} />未確認</Badge>}</td><td className="num positive">{row.direction === "in" ? money(row.amount) : "—"}</td><td className="num">{row.direction === "out" ? money(row.amount) : "—"}</td><td><button className="icon-button"><MoreHorizontal size={16} /></button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-ledger-list">
          {visible.map((row) => (
            <article className="mobile-ledger-card" key={row.id}>
              <div className="mobile-ledger-top"><span>{row.date.slice(5).replace("-", "/")}</span>{row.evidence === "ok" ? <Badge tone="green">確認済</Badge> : <Badge tone="amber">証憑なし</Badge>}</div>
              <strong>{row.description}</strong><span className="mobile-ledger-category">{row.category} · {row.account}</span>
              <div className={`mobile-ledger-amount${row.direction === "in" ? " positive" : ""}`}>{row.direction === "in" ? "+" : "−"}{money(row.amount)}</div>
            </article>
          ))}
        </div>
      </section>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}>
          <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><h2>{tabMeta[tab].label}に登録</h2><p>必要な項目だけを入力します。</p></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></div>
            <div className="form-grid">
              <label className="field"><span>日付</span><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label>
              {(tab === "cash" || tab === "bank") && <label className="field"><span>入出金</span><select value={draft.direction} onChange={(e) => setDraft({ ...draft, direction: e.target.value as "in" | "out" })}><option value="out">出金</option><option value="in">入金</option></select></label>}
              <label className="field full"><span>科目</span><input placeholder="例：消耗品費" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></label>
              <label className="field full"><span>内容</span><input placeholder="例：保育用品・文具" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
              <label className="field full"><span>金額</span><div className="amount-input"><span>¥</span><input inputMode="numeric" placeholder="0" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></div></label>
              <label className="upload-drop full"><Upload size={20} /><strong>領収書・請求書を添付</strong><span>画像またはPDFをここに追加</span><input type="file" accept="image/*,.pdf" /></label>
            </div>
            <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowForm(false)}>キャンセル</button><button className="btn btn-primary" onClick={save}>登録する</button></div>
          </div>
        </div>
      )}
    </>
  );
}

function BillingPage() {
  const items = [
    { label: "施設型給付費", partner: "自治体", due: "8/31", amount: 6_820_000, status: "入金済", tone: "green" as const },
    { label: "延長保育料", partner: "保護者徴収", due: "8/31", amount: 76_500, status: "一部未収", tone: "amber" as const },
    { label: "誰でも通園 利用料", partner: "保護者・自治体", due: "9/10", amount: 42_600, status: "請求準備", tone: "blue" as const },
    { label: "給食費", partner: "保護者徴収", due: "8/31", amount: 128_000, status: "入金済", tone: "green" as const },
  ];
  return (
    <>
      <PageHeader title="請求・入金" description="給付費、保護者徴収、未収金の請求から入金確認までを管理します。" actions={<button className="btn btn-primary"><Plus size={16} /> 請求を作成</button>} />
      <section className="metric-grid metric-grid-3">
        <article className="metric-card"><div className="metric-label">今月請求</div><strong className="metric-value">708.7万円</strong><span className="metric-sub">4件</span></article>
        <article className="metric-card"><div className="metric-label">入金済</div><strong className="metric-value positive">694.8万円</strong><span className="metric-sub">98.0%</span></article>
        <article className="metric-card"><div className="metric-label">未収・確認中</div><strong className="metric-value warning">13.9万円</strong><span className="metric-sub">2件</span></article>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>請求・入金一覧</h2><p>入金後は帳簿へ自動反映する前提の設計です。</p></div><button className="btn btn-secondary"><SlidersHorizontal size={15} /> 絞り込み</button></div>
        <div className="billing-list">
          {items.map((item) => (
            <div className="billing-row" key={item.label}><div className="billing-icon"><Receipt size={18} /></div><div className="billing-copy"><strong>{item.label}</strong><span>{item.partner} · 期日 {item.due}</span></div><Badge tone={item.tone}>{item.status}</Badge><strong className="billing-amount">{money(item.amount)}</strong><ChevronRight size={16} /></div>
          ))}
        </div>
      </section>
    </>
  );
}

function PublicPricePage() {
  return (
    <>
      <PageHeader title="公定価格・加算" description="制度上の算定根拠と、実際の収入・人件費を金額でつなぎます。" actions={<Badge tone="blue">制度・公定価格エンジン連携予定</Badge>} />
      <section className="public-price-grid">
        <PolicyCard title="処遇改善等加算" income="480万円" cost="460万円" diff="+20万円" status="要確認" tone="amber" desc="加算受入額と賃金改善額・法定福利費を突合します。" />
        <PolicyCard title="1歳児配置改善" income="96万円" cost="84万円" diff="+12万円" status="算定可" tone="green" desc="配置条件と人件費増を比較し、取得効果を見える化します。" />
        <PolicyCard title="こども誰でも通園" income="18.6万円" cost="12.4万円" diff="+6.2万円" status="利用実績連携" tone="blue" desc="利用時間、利用料、自治体給付、未収をまとめて管理します。" />
        <PolicyCard title="ICT・療育等の加算" income="42万円" cost="31万円" diff="+11万円" status="確認中" tone="blue" desc="要件と支出を紐づけ、加算の採算を確認できる設計です。" />
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>加算収入の確認</h2><p>受入額 → 配分・費用 → 残額まで追跡します。</p></div></div>
        <div className="allocation-bar"><span className="allocation-used" style={{ width: "78%" }} /><span className="allocation-social" style={{ width: "18%" }} /><span className="allocation-remain" style={{ width: "4%" }} /></div>
        <div className="allocation-legend"><span><i className="legend-used" />賃金改善 78%</span><span><i className="legend-social" />法定福利費等 18%</span><span><i className="legend-remain" />要確認 4%</span></div>
      </section>
    </>
  );
}

function PolicyCard({ title, income, cost, diff, status, tone, desc }: { title: string; income: string; cost: string; diff: string; status: string; tone: "green" | "amber" | "blue"; desc: string }) {
  return (
    <article className="policy-card"><div className="policy-card-head"><span className="policy-icon"><CircleDollarSign size={20} /></span><Badge tone={tone}>{status}</Badge></div><h2>{title}</h2><p>{desc}</p><div className="policy-numbers"><div><span>収入</span><strong>{income}</strong></div><div><span>関連費用</span><strong>{cost}</strong></div><div><span>差額</span><strong className="positive">{diff}</strong></div></div></article>
  );
}

function ClosingPage() {
  const [mode, setMode] = useState<AccountingMode>("social");
  const statements = mode === "social"
    ? ["資金収支計算書", "事業活動計算書", "貸借対照表", "附属明細書"]
    : ["損益計算書", "貸借対照表", "勘定科目内訳", "決算整理仕訳"];
  return (
    <>
      <PageHeader title="月次・決算" description="月次締めから年度決算まで、法人形態に合わせて決算書を作成します。" actions={<button className="btn btn-primary"><FileText size={16} /> 決算書を作成</button>} />
      <div className="mode-switch-card">
        <div><strong>会計基準</strong><span>施設・法人に合わせて切り替えます。</span></div>
        <div className="segmented mode-segmented"><button className={mode === "social" ? "active" : ""} onClick={() => setMode("social")}>社会福祉法人会計</button><button className={mode === "corporate" ? "active" : ""} onClick={() => setMode("corporate")}>企業会計</button></div>
      </div>
      <section className="closing-layout">
        <div className="panel">
          <div className="panel-heading"><div><h2>2026年度 決算準備</h2><p>{mode === "social" ? "社会福祉法人会計基準" : "企業会計"}</p></div><Badge tone="amber">作成中</Badge></div>
          <div className="statement-list">
            {statements.map((statement, index) => <div className="statement-row" key={statement}><span className={`statement-status${index < 2 ? " done" : ""}`}>{index < 2 ? <Check size={14} /> : <Clock3 size={14} />}</span><strong>{statement}</strong><span>{index < 2 ? "自動集計済" : "確認待ち"}</span><ChevronRight size={16} /></div>)}
          </div>
        </div>
        <div className="panel statement-preview">
          <div className="panel-heading"><div><h2>{mode === "social" ? "資金収支計算書" : "損益計算書"}</h2><p>プレビュー</p></div><button className="icon-button"><Download size={17} /></button></div>
          <div className="statement-sheet">
            <div className="statement-sheet-title">{mode === "social" ? "資金収支計算書" : "損益計算書"}<span>自 2026年4月1日　至 2027年3月31日</span></div>
            <StatementLine label={mode === "social" ? "保育事業収入" : "売上高"} value="98,420,000" />
            <StatementLine label={mode === "social" ? "人件費支出" : "人件費"} value="61,412,000" />
            <StatementLine label={mode === "social" ? "事業費支出" : "売上原価・事業費"} value="12,680,000" />
            <StatementLine label={mode === "social" ? "事務費支出" : "販売費及び一般管理費"} value="15,216,000" />
            <StatementLine label={mode === "social" ? "当期資金収支差額" : "営業利益"} value="9,112,000" strong />
          </div>
          <div className="preview-note"><ShieldCheck size={15} /><span>決算確定前の作成補助です。最終確定は税理士・会計専門家等の確認を前提とします。</span></div>
        </div>
      </section>
    </>
  );
}

function StatementLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`statement-line${strong ? " total" : ""}`}><span>{label}</span><strong>¥{value}</strong></div>;
}

function ReportingPage() {
  const [downloaded, setDownloaded] = useState(false);
  const reportItems = [
    { title: "施設・法人情報", source: "設定", status: "完了", progress: 100 },
    { title: "職員数・配置", source: "Hoiku Office", status: "完了", progress: 100 },
    { title: "給与・モデル賃金", source: "Hoiku Office", status: "確認", progress: 85 },
    { title: "施設別収入", source: "Hoiku Finance", status: "完了", progress: 100 },
    { title: "施設別支出", source: "Hoiku Finance", status: "確認", progress: 90 },
    { title: "人件費・人件費率", source: "Office + Finance", status: "完了", progress: 100 },
    { title: "加算・給付費", source: "制度エンジン", status: "確認", progress: 72 },
  ];
  const download = () => {
    const csv = ["項目,値,状態", "施設名,ひかり保育園,確認済", "収入,98423000,自動集計", "支出,81124500,自動集計", "人件費率,62.4%,自動計算"].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hoiku-finance_keiei-jouhou_2026.csv";
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2500);
  };
  return (
    <>
      <PageHeader title="経営情報報告" description="普段の会計・職員データから、ここdeサーチの経営情報報告に必要な項目をまとめます。" actions={<button className="btn btn-primary" onClick={download}><Download size={16} /> ここdeサーチ用に出力</button>} />
      {downloaded && <div className="notice notice-success"><CircleCheck size={17} /> サンプルCSVを出力しました。公式画面への自動送信ではなく、確認・転記用の出力です。</div>}
      <section className="report-hero">
        <div className="report-score"><div className="score-ring"><strong>82</strong><span>%</span></div><div><Badge tone="blue">2026年度</Badge><h2>経営情報報告の準備状況</h2><p>あと3項目を確認すると、報告用データがそろいます。</p></div></div>
        <div className="report-deadline"><CalendarDays size={19} /><div><span>報告期限</span><strong>期限を施設設定から管理</strong></div></div>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>報告項目</h2><p>入力元を明確にし、二重入力を減らします。</p></div></div>
        <div className="report-list">
          {reportItems.map((item) => <div className="report-row" key={item.title}><span className={`report-check${item.progress === 100 ? " done" : ""}`}>{item.progress === 100 ? <Check size={15} /> : item.progress}</span><div className="report-row-copy"><strong>{item.title}</strong><span>入力元: {item.source}</span></div><div className="report-row-progress"><div><span style={{ width: `${item.progress}%` }} /></div><small>{item.progress}%</small></div><Badge tone={item.status === "完了" ? "green" : "amber"}>{item.status}</Badge><ChevronRight size={16} /></div>)}
        </div>
      </section>
      <div className="notice notice-info"><CircleAlert size={17} /><span><strong>出力方針:</strong> 現段階では公式システムへの無許可API送信を前提にせず、ここdeサーチの入力項目順に確認・転記しやすいデータを生成します。</span></div>
    </>
  );
}

function DocumentsPage() {
  const docs = [
    { name: "電気料金_2026-08.pdf", type: "請求書", date: "8/22", link: "水道光熱費 193,480円", status: "未確認", tone: "amber" as const },
    { name: "給食食材_8月.pdf", type: "請求書", date: "8/27", link: "給食材料費 486,200円", status: "仕訳済", tone: "green" as const },
    { name: "保育用品_0826.jpg", type: "領収書", date: "8/26", link: "消耗品費 18,640円", status: "仕訳済", tone: "green" as const },
  ];
  return (
    <>
      <PageHeader title="証憑・監査" description="領収書・請求書を帳簿と紐づけ、あとから確認できる状態に保ちます。" actions={<button className="btn btn-primary"><Upload size={16} /> 証憑を追加</button>} />
      <label className="document-drop"><Upload size={24} /><strong>領収書・請求書を追加</strong><span>撮影した画像やPDFをドラッグ＆ドロップ</span><button type="button" className="btn btn-secondary">ファイルを選ぶ</button><input type="file" multiple accept="image/*,.pdf" /></label>
      <section className="panel">
        <div className="panel-heading"><div><h2>最近の証憑</h2><p>帳簿との紐づけ状態を確認できます。</p></div></div>
        <div className="document-list">{docs.map((doc) => <div className="document-row" key={doc.name}><span className="document-icon"><FileText size={19} /></span><div className="document-copy"><strong>{doc.name}</strong><span>{doc.type} · {doc.date}</span></div><span className="document-link">{doc.link}</span><Badge tone={doc.tone}>{doc.status}</Badge><ChevronRight size={16} /></div>)}</div>
      </section>
    </>
  );
}

function SettingsPage() {
  return (
    <>
      <PageHeader title="設定" description="施設、会計基準、口座、科目、権限、他サービス連携を管理します。" />
      <section className="settings-grid">
        <SettingCard icon={Building2} title="施設・法人情報" desc="法人種別、施設情報、会計年度" />
        <SettingCard icon={Calculator} title="会計基準" desc="社会福祉法人会計 / 企業会計" />
        <SettingCard icon={Landmark} title="口座・現金" desc="銀行口座、小口現金、開始残高" />
        <SettingCard icon={BookOpen} title="勘定科目" desc="収入・支出・仕訳科目を管理" />
        <SettingCard icon={Users} title="権限" desc="経理担当、園長、本部、閲覧者" />
        <SettingCard icon={ExternalLink} title="Hoiku Office連携" desc="給与、職員、配置データを受け取る" />
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Hoiku Grove連携</h2><p>同じ施設・法人基盤で各サービスをつなぎます。</p></div></div>
        <div className="integration-list"><Integration name="Hoiku Office" detail="給与・職員・配置・処遇改善" status="接続予定" /><Integration name="Hoiku Market" detail="園情報・公開情報" status="接続予定" /><Integration name="Hoiku Color" detail="採用・求人情報" status="任意" /></div>
      </section>
    </>
  );
}

function SettingCard({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return <button className="setting-card"><span><Icon size={20} /></span><div><strong>{title}</strong><small>{desc}</small></div><ChevronRight size={16} /></button>;
}

function Integration({ name, detail, status }: { name: string; detail: string; status: string }) {
  return <div className="integration-row"><div className="integration-logo">{name.split(" ")[1]?.slice(0, 1) ?? "H"}</div><div><strong>{name}</strong><span>{detail}</span></div><Badge tone="blue">{status}</Badge><button className="btn btn-secondary btn-sm">設定</button></div>;
}

export default function App() {
  return <AppShell />;
}
