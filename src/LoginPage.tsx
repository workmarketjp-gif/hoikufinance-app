import { useSignIn } from "@clerk/react";
import { type FormEvent, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import financeLogo from "./logo/logo_hoikufinance.png";
import financeMark from "./logo/logom_hoikufinance.png";

function signInErrorMessage(error: unknown): string {
  const candidate = error as {
    code?: string;
    errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
  } | null;
  const code = candidate?.errors?.[0]?.code ?? candidate?.code ?? "";

  if (code.includes("identifier") || code.includes("password")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (code.includes("too_many") || code.includes("rate_limit")) {
    return "ログイン試行が多すぎます。少し時間をおいてからもう一度お試しください。";
  }
  if (code.includes("verification") || code.includes("code")) {
    return "確認コードを確認して、もう一度お試しください。";
  }
  return "ログインできませんでした。入力内容を確認して、もう一度お試しください。";
}

export default function LoginPage() {
  const { signIn, fetchStatus } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = fetchStatus === "fetching" || finalizing;

  const finalize = async () => {
    setFinalizing(true);
    try {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            setFinalizing(false);
            setError("ログイン後に追加の設定が必要です。管理者にお問い合わせください。");
            return;
          }
          window.location.assign(decorateUrl("/"));
        },
      });
    } catch (err) {
      setFinalizing(false);
      setError(signInErrorMessage(err));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);

    if (!email.trim() || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }

    try {
      const { error: passwordError } = await signIn.password({
        emailAddress: email.trim(),
        password,
      });
      if (passwordError) {
        setError(signInErrorMessage(passwordError));
        return;
      }

      if (signIn.status === "complete") {
        await finalize();
        return;
      }

      if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
        const emailCodeAvailable = signIn.supportedSecondFactors.some((factor) => factor.strategy === "email_code");
        if (!emailCodeAvailable) {
          setError("このアカウントでは追加認証が必要です。管理者にお問い合わせください。");
          return;
        }
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) {
          setError("確認コードを送信できませんでした。もう一度お試しください。");
          return;
        }
        setVerificationCode("");
        setVerificationOpen(true);
        return;
      }

      setError("ログインを完了できませんでした。もう一度お試しください。");
    } catch (err) {
      setError(signInErrorMessage(err));
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !verificationCode.trim()) return;
    setError(null);

    try {
      const { error: verifyError } = await signIn.mfa.verifyEmailCode({ code: verificationCode.trim() });
      if (verifyError) {
        setError("確認コードが正しくありません。もう一度確認してください。");
        return;
      }
      if (signIn.status === "complete") {
        setVerificationOpen(false);
        await finalize();
        return;
      }
      setError("本人確認を完了できませんでした。もう一度お試しください。");
    } catch {
      setError("本人確認を完了できませんでした。もう一度お試しください。");
    }
  };

  return (
    <>
      <main className="hf-login-page">
        <div className="hf-login-shell">
          <section className="hf-login-brand-panel">
            <img className="hf-login-logo" src={financeLogo} alt="Hoiku Finance" />
            <div className="hf-login-brand-copy">
              <span className="hf-login-kicker">管理者ログイン</span>
              <h1>保育に使えるお金を、<br />もっと見えるように。</h1>
              <p>本部の会計と、園長・主任が管理できる予算を同じ数字でつなぎ、保育園のお金をわかりやすく管理します。</p>
            </div>
            <div className="hf-login-feature-list" aria-label="Hoiku Financeの主な機能">
              <span><WalletCards size={14} /> 園予算</span>
              <span><BarChart3 size={14} /> 運営状況</span>
              <span><ShieldCheck size={14} /> 権限管理</span>
            </div>
          </section>

          <section className="hf-login-form-panel">
            <div className="hf-login-mobile-logo-wrap">
              <img className="hf-login-mobile-logo" src={financeLogo} alt="Hoiku Finance" />
            </div>
            <div className="hf-login-form-head">
              <h2>Hoiku Financeにログイン</h2>
              <p>本部または施設管理者から付与されたアカウントをご利用ください。</p>
            </div>

            <form className="hf-login-form" onSubmit={submit}>
              <label className="hf-login-field">
                <span>メールアドレス</span>
                <div className="hf-login-input-wrap">
                  <Mail size={17} aria-hidden="true" />
                  <input
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.jp"
                    aria-label="メールアドレス"
                    disabled={busy}
                  />
                </div>
              </label>

              <label className="hf-login-field">
                <span>パスワード</span>
                <div className="hf-login-input-wrap">
                  <LockKeyhole size={17} aria-hidden="true" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="パスワードを入力"
                    aria-label="パスワード"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="hf-password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                    disabled={busy}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              {error && <div className="hf-login-error" role="alert">{error}</div>}

              <button type="submit" className="hf-login-submit" disabled={busy}>
                <span>{busy ? "ログイン中…" : "ログイン"}</span>
                {!busy && <ArrowRight size={17} />}
              </button>
            </form>

            <div className="hf-login-note">
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>認証情報や個人の給与情報を、権限のない利用者に表示することはありません。</span>
            </div>
          </section>
        </div>
      </main>

      {verificationOpen && (
        <div className="hf-auth-confirm-backdrop" role="presentation">
          <form className="hf-auth-confirm" role="dialog" aria-modal="true" aria-labelledby="hf-verify-title" onSubmit={verifyCode}>
            <div className="hf-auth-confirm-icon"><ShieldCheck size={24} /></div>
            <h2 id="hf-verify-title">本人確認</h2>
            <p>安全のため、メールに送信された確認コードを入力してください。</p>
            <label className="hf-login-field">
              <span>確認コード</span>
              <div className="hf-login-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  placeholder="確認コードを入力"
                  aria-label="確認コード"
                  disabled={busy}
                />
              </div>
            </label>
            {error && <div className="hf-login-error" role="alert">{error}</div>}
            <div className="hf-auth-confirm-actions">
              <button
                type="button"
                className="hf-auth-secondary"
                onClick={() => {
                  signIn.reset();
                  setVerificationOpen(false);
                  setVerificationCode("");
                  setError(null);
                }}
                disabled={busy}
              >
                キャンセル
              </button>
              <button type="submit" className="hf-auth-primary" disabled={busy || !verificationCode.trim()}>
                {busy ? "確認中…" : "確認してログイン"}
              </button>
            </div>
          </form>
        </div>
      )}

      {finalizing && (
        <div className="hf-login-loading" aria-live="polite" aria-label="ログイン中">
          <div className="hf-login-loading-card">
            <img className="hf-login-spinner" src={financeMark} alt="" />
            <strong>Hoiku Finance</strong>
            <span>ログインしています</span>
          </div>
        </div>
      )}
    </>
  );
}
