import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useNavigate } from "react-router";
import financeLogo from "./logo/logo_hoikufinance.png";
import financeMark from "./logo/logom_hoikufinance.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    window.setTimeout(() => navigate("/"), 650);
  };

  return (
    <main className="hf-login-page">
      {submitting && (
        <div className="hf-login-loading" aria-live="polite" aria-label="ログイン中">
          <div className="hf-login-loading-card">
            <img src={financeMark} alt="" className="hf-login-spinner" />
            <strong>Hoiku Finance</strong>
            <span>ログインしています</span>
          </div>
        </div>
      )}

      <section className="hf-login-shell">
        <div className="hf-login-brand-panel">
          <img src={financeLogo} alt="Hoiku Finance" className="hf-login-logo" />
          <div className="hf-login-brand-copy">
            <span className="hf-login-kicker">保育園会計を、もっとわかりやすく。</span>
            <h1>毎日の出納から、決算・経営情報報告まで。</h1>
            <p>
              現金出納、収入簿、支出簿、公定価格・加算、決算書作成まで、
              保育園の会計業務をひとつにつなぎます。
            </p>
          </div>
          <div className="hf-login-feature-list" aria-label="主な機能">
            <span>日々の出納管理</span>
            <span>社会福祉法人会計・企業会計</span>
            <span>ここdeサーチ報告支援</span>
          </div>
        </div>

        <div className="hf-login-form-panel">
          <div className="hf-login-mobile-logo-wrap">
            <img src={financeLogo} alt="Hoiku Finance" className="hf-login-mobile-logo" />
          </div>
          <div className="hf-login-form-head">
            <h2>管理画面にログイン</h2>
            <p>登録済みのメールアドレスとパスワードを入力してください。</p>
          </div>

          <form className="hf-login-form" onSubmit={onSubmit}>
            <label className="hf-login-field">
              <span>メールアドレス</span>
              <div className="hf-login-input-wrap">
                <Mail size={17} />
                <input type="email" placeholder="name@example.jp" autoComplete="email" required />
              </div>
            </label>

            <label className="hf-login-field">
              <span>パスワード</span>
              <div className="hf-login-input-wrap">
                <LockKeyhole size={17} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="パスワード"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="hf-password-toggle"
                  aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <div className="hf-login-options">
              <label><input type="checkbox" /> ログイン状態を保持</label>
              <button type="button">パスワードを忘れた方</button>
            </div>

            <button type="submit" className="hf-login-submit" disabled={submitting}>
              ログイン
            </button>
          </form>

          <p className="hf-login-note">
            この画面は認証UIです。実際の認証処理は今後Clerk / Supabase等の認証基盤へ接続できます。
          </p>
        </div>
      </section>
    </main>
  );
}
