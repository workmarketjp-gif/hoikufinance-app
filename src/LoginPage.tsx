import { SignIn } from "@clerk/react";
import { BarChart3, CheckCircle2, ShieldCheck, WalletCards } from "lucide-react";
import financeLogo from "./logo/logo_hoikufinance.png";
import financeMark from "./logo/logom_hoikufinance.png";

export default function LoginPage() {
  return (
    <main className="hf-login-page">
      <section className="hf-login-brand-panel">
        <div className="hf-login-brand-inner">
          <img className="hf-login-full-logo" src={financeLogo} alt="Hoiku Finance" />
          <div className="hf-login-message">
            <span className="hf-login-eyebrow">Hoiku Grove</span>
            <h1>保育に使えるお金を、<br />もっと見えるように。</h1>
            <p>本部の会計と、園長・主任が動かせる予算を分けながら、同じ数字でつなぎます。</p>
          </div>
          <div className="hf-login-feature-list">
            <div><WalletCards size={19} /><span><strong>園予算</strong><small>利用可能額・繰越・承認を明確に</small></span></div>
            <div><BarChart3 size={19} /><span><strong>運営状況</strong><small>現場にも必要な範囲で経営を見える化</small></span></div>
            <div><ShieldCheck size={19} /><span><strong>権限管理</strong><small>給与・本部費などは閲覧範囲を分離</small></span></div>
          </div>
          <div className="hf-login-security"><CheckCircle2 size={16} /><span>Hoiku Officeと共通の認証・施設権限を使用します</span></div>
        </div>
      </section>

      <section className="hf-login-auth-panel">
        <div className="hf-login-mobile-brand">
          <img src={financeMark} alt="" />
          <img src={financeLogo} alt="Hoiku Finance" />
        </div>
        <div className="hf-clerk-shell">
          <SignIn routing="hash" />
        </div>
        <p className="hf-login-footnote">アカウントは本部または施設管理者から付与されたものをご利用ください。</p>
      </section>
    </main>
  );
}
