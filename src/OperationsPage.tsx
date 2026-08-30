import {
  ArrowDownRight,
  ArrowRight,
  Baby,
  BarChart3,
  ChevronRight,
  CircleAlert,
  HeartHandshake,
  MessageCircleMore,
  Megaphone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

export default function OperationsPage() {
  return (
    <>
      <div className="page-header operations-page-header">
        <div>
          <h1>運営状況</h1>
          <p>園の経営状況を、現場でも理解できる言葉で共有します。節約を求めるためではなく、保育と運営を一緒に良くするための情報です。</p>
        </div>
        <div className="page-actions"><span className="badge badge-blue">2026年8月</span><span className="badge badge-neutral">サンプルデータ</span></div>
      </div>

      <div className="operations-principle">
        <ShieldCheck size={20} />
        <div>
          <strong>経営責任を現場へ押しつける画面ではありません。</strong>
          <span>本部が経営責任を持ちながら、園児数・保護者の声・予算余力など、保育の現場と関係する情報は閉じずに共有します。</span>
        </div>
      </div>

      <section className="operations-score-grid">
        <article className="operations-score-card">
          <span className="operations-score-icon"><Baby size={20} /></span>
          <div><small>園児数 / 定員</small><strong>78 / 90名</strong><span>稼働率 86.7%</span></div>
        </article>
        <article className="operations-score-card">
          <span className="operations-score-icon"><BarChart3 size={20} /></span>
          <div><small>今月収入 / 計画</small><strong>984万円</strong><span className="warning-text">計画比 95.3%</span></div>
        </article>
        <article className="operations-score-card">
          <span className="operations-score-icon"><Users size={20} /></span>
          <div><small>見学・入園問い合わせ</small><strong>12件</strong><span className="positive-text">前月 +3件</span></div>
        </article>
        <article className="operations-score-card">
          <span className="operations-score-icon"><HeartHandshake size={20} /></span>
          <div><small>保護者アンケート</small><strong>4.6 / 5</strong><span>回答 42世帯</span></div>
        </article>
      </section>

      <section className="operations-main-grid">
        <article className="panel operations-health-panel">
          <div className="panel-heading"><div><h2>園の運営状況</h2><p>会計数字を、保育現場が判断しやすい指標へ置き換えて表示します。</p></div><span className="badge badge-amber">少し注意</span></div>
          <div className="operations-health-row">
            <div className="health-label"><span>園児数</span><small>定員に対する在籍状況</small></div>
            <div className="health-meter"><span style={{ width: "86.7%" }} /></div><strong>86.7%</strong>
          </div>
          <div className="operations-health-row">
            <div className="health-label"><span>収入計画</span><small>今月計画に対する進捗</small></div>
            <div className="health-meter"><span style={{ width: "95.3%" }} /></div><strong>95.3%</strong>
          </div>
          <div className="operations-health-row">
            <div className="health-label"><span>現場予算余力</span><small>保育・給食・環境改善で使える残額</small></div>
            <div className="health-meter healthy"><span style={{ width: "74%" }} /></div><strong>48.9万円</strong>
          </div>
          <div className="operations-health-row">
            <div className="health-label"><span>保護者満足</span><small>直近アンケート評価</small></div>
            <div className="health-meter healthy"><span style={{ width: "92%" }} /></div><strong>92%</strong>
          </div>
        </article>

        <article className="panel operations-message-panel">
          <div className="panel-heading"><div><h2>今月の共有メッセージ</h2><p>数字だけではなく、状況の意味を短く共有します。</p></div></div>
          <div className="operations-message-status"><CircleAlert size={19} /><div><strong>園児数が計画を3名下回っています。</strong><span>すぐに大きな削減が必要な状態ではありませんが、来月以降の入園につながる動きを増やしたい状況です。</span></div></div>
          <div className="operations-message-note">
            <span>本部から</span>
            <p>保育の質を落として支出を減らすのではなく、今ある予算は必要な保育環境改善に使ってください。そのうえで、日々の保育の良さを保護者へ伝える機会を少し増やしていきましょう。</p>
          </div>
        </article>
      </section>

      <section className="panel operations-actions-panel">
        <div className="panel-heading"><div><h2>現場で変えられること</h2><p>経営数字と、先生たちの日々の行動を直接結びつけすぎず、改善のヒントとして表示します。</p></div></div>
        <div className="operations-action-grid">
          <button>
            <span className="action-idea-icon"><Megaphone size={20} /></span>
            <strong>保育の良さを伝える</strong>
            <small>園だより・写真・見学時の説明など、日々の保育を保護者へ伝える。</small>
            <span className="action-link">見学・問い合わせを見る <ArrowRight size={14} /></span>
          </button>
          <button>
            <span className="action-idea-icon"><MessageCircleMore size={20} /></span>
            <strong>保護者との関わりを確認</strong>
            <small>アンケートや相談内容から、安心感につながっている点・改善点を確認する。</small>
            <span className="action-link">保護者の声を見る <ArrowRight size={14} /></span>
          </button>
          <button>
            <span className="action-idea-icon"><Sparkles size={20} /></span>
            <strong>保育環境に予算を使う</strong>
            <small>必要な絵本・玩具・環境改善を我慢せず、残予算の範囲で実行する。</small>
            <span className="action-link">園予算を見る <ArrowRight size={14} /></span>
          </button>
        </div>
      </section>

      <section className="operations-signal-grid">
        <article className="panel">
          <div className="panel-heading"><div><h2>園児数・見学の流れ</h2><p>入園につながる動きを月ごとに確認します。</p></div></div>
          <div className="funnel-list">
            <div><span>問い合わせ</span><strong>12件</strong><small className="positive-text"><TrendingUp size={13} /> 前月比 +3</small></div>
            <ChevronRight size={16} />
            <div><span>見学予約</span><strong>8件</strong><small>予約率 66.7%</small></div>
            <ChevronRight size={16} />
            <div><span>入園希望</span><strong>5件</strong><small>見学後 62.5%</small></div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><h2>保護者の声</h2><p>良い声も改善の声も、運営の大切な情報として共有します。</p></div></div>
          <div className="parent-voice-list">
            <div><span className="voice-score positive-text">4.8</span><p>先生が毎日の様子を細かく話してくれるので安心できます。</p></div>
            <div><span className="voice-score positive-text">4.7</span><p>子どもの興味に合わせて遊びを考えてくれているのが伝わります。</p></div>
            <div><span className="voice-score warning-text">3.8</span><p>園でどんな活動をしているのか、もう少し写真で見られるとうれしいです。</p></div>
          </div>
        </article>
      </section>

      <section className="panel operations-visibility-panel">
        <div className="panel-heading"><div><h2>見せる範囲も管理</h2><p>透明性は、個人給与や機密情報まで無制限に公開することではありません。</p></div></div>
        <div className="visibility-table">
          <div className="visibility-row head"><span>情報</span><span>一般職員</span><span>主任・園長</span><span>本部</span></div>
          <div className="visibility-row"><strong>園児数・運営状況</strong><span>概要</span><span>詳細</span><span>全施設</span></div>
          <div className="visibility-row"><strong>園で使える予算</strong><span>必要範囲</span><span>管理</span><span>設定・管理</span></div>
          <div className="visibility-row"><strong>個人給与</strong><span>本人のみ</span><span>権限なし</span><span>権限者のみ</span></div>
          <div className="visibility-row"><strong>処遇改善の総額・配分状況</strong><span>概要</span><span>詳細</span><span>設定・確認</span></div>
        </div>
      </section>
    </>
  );
}
