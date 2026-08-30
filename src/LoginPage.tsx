import { useSignIn, useSignUp } from "@clerk/react";
import { type FormEvent, useState } from "react";
import { Link, useLocation } from "react-router";
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

function authErrorMessage(error: unknown, action: "login" | "signup" = "login"): string {
  const candidate = error as {
    code?: string;
    errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
  } | null;
  const code = candidate?.errors?.[0]?.code ?? candidate?.code ?? "";

  if (code.includes("identifier") || (action === "login" && code.includes("password"))) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (code.includes("form_password") || code.includes("password_pwned")) {
    return "このパスワードは使用できません。別のパスワードを設定してください。";
  }
  if (code.includes("form_identifier_exists") || code.includes("email_address_exists")) {
    return "このメールアドレスはすでに登録されています。";
  }
  if (code.includes("too_many") || code.includes("rate_limit")) {
    return "試行回数が多すぎます。少し時間をおいてからもう一度お試しください。";
  }
  if (code.includes("verification") || code.includes("code")) {
    return "確認コードを確認して、もう一度お試しください。";
  }
  return action === "signup"
    ? "登録を完了できませんでした。入力内容を確認して、もう一度お試しください。"
    : "ログインできませんでした。入力内容を確認して、もう一度お試しください。";
}

export default function LoginPage() {
  const location = useLocation();
  const signupMode = location.pathname === "/signup";
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [verificationCode, setVerificationCode] = useState("");
  const [verificationOpen, setVerificationOpen] = useState<"login" | "signup" | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = signInFetchStatus === "fetching" || signUpFetchStatus === "fetching" || finalizing;

  const finalizeSignIn = async () => {
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
      setError(authErrorMessage(err));
    }
  };

  const finalizeSignUp = async () => {
    setFinalizing(true);
    try {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            setFinalizing(false);
            setError("登録後に追加の設定が必要です。管理者にお問い合わせください。");
            return;
          }
          window.location.assign(decorateUrl("/"));
        },
      });
    } catch (err) {
      setFinalizing(false);
      setError(authErrorMessage(err, "signup"));
    }
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
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
        setError(authErrorMessage(passwordError));
        return;
      }

      if (signIn.status === "complete") {
        await finalizeSignIn();
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
        setVerificationOpen("login");
        return;
      }

      setError("ログインを完了できませんでした。もう一度お試しください。");
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  const submitSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);

    if (!email.trim() || !password || !passwordConfirm) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上で設定してください。");
      return;
    }
    if (password !== passwordConfirm) {
      setError("確認用パスワードが一致していません。");
      return;
    }
    if (!termsAccepted) {
      setError("利用規約とプライバシーポリシーへの同意が必要です。");
      return;
    }

    try {
      const { error: passwordError } = await signUp.password({
        emailAddress: email.trim(),
        password,
      });
      if (passwordError) {
        setError(authErrorMessage(passwordError, "signup"));
        return;
      }

      if (signUp.status === "complete") {
        await finalizeSignUp();
        return;
      }

      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        setError("確認コードを送信できませんでした。もう一度お試しください。");
        return;
      }

      setVerificationCode("");
      setVerificationOpen("signup");
    } catch (err) {
      setError(authErrorMessage(err, "signup"));
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !verificationCode.trim() || !verificationOpen) return;
    setError(null);

    try {
      if (verificationOpen === "login") {
        const { error: verifyError } = await signIn.mfa.verifyEmailCode({ code: verificationCode.trim() });
        if (verifyError) {
          setError("確認コードが正しくありません。もう一度確認してください。");
          return;
        }
        if (signIn.status === "complete") {
          setVerificationOpen(null);
          await finalizeSignIn();
          return;
        }
      } else {
        const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: verificationCode.trim() });
        if (verifyError) {
          setError("確認コードが正しくありません。もう一度確認してください。");
          return;
        }
        if (signUp.status === "complete") {
          setVerificationOpen(null);
          await finalizeSignUp();
          return;
        }
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
              <span className="hf-login-kicker">{signupMode ? "アカウント登録" : "管理者ログイン"}</span>
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

            <div className="hf-auth-tabs" aria-label="認証メニュー">
              <Link to="/login" className={!signupMode ? "active" : ""}>ログイン</Link>
              <Link to="/signup" className={signupMode ? "active" : ""}>新規登録</Link>
            </div>

            <div className="hf-login-form-head">
              <h2>{signupMode ? "Hoiku Financeを始める" : "Hoiku Financeにログイン"}</h2>
              <p>{signupMode ? "メールアドレスとパスワードでアカウントを作成します。" : "登録済みのアカウントをご利用ください。"}</p>
            </div>

            <form className="hf-login-form" onSubmit={signupMode ? submitSignup : submitLogin}>
              <label className="hf-login-field">
                <span>メールアドレス</span>
                <div className="hf-login-input-wrap">
                  <Mail size={17} aria-hidden="true" />
                  <input
                    type="email"
                    autoComplete="email"
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
                    autoComplete={signupMode ? "new-password" : "current-password"}
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

              {signupMode && (
                <>
                  <label className="hf-login-field">
                    <span>パスワード確認</span>
                    <div className="hf-login-input-wrap">
                      <LockKeyhole size={17} aria-hidden="true" />
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={passwordConfirm}
                        onChange={(event) => setPasswordConfirm(event.target.value)}
                        placeholder="もう一度入力"
                        aria-label="パスワード確認"
                        disabled={busy}
                      />
                    </div>
                  </label>

                  <label className="hf-signup-terms">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                      disabled={busy}
                    />
                    <span>利用規約とプライバシーポリシーに同意します</span>
                  </label>
                </>
              )}

              {error && <div className="hf-login-error" role="alert">{error}</div>}

              <button type="submit" className="hf-login-submit" disabled={busy}>
                <span>{busy ? (signupMode ? "登録中…" : "ログイン中…") : (signupMode ? "アカウントを作成" : "ログイン")}</span>
                {!busy && <ArrowRight size={17} />}
              </button>
            </form>

            <div className="hf-auth-switch-copy">
              {signupMode ? (
                <span>すでにアカウントをお持ちですか？ <Link to="/login">ログイン</Link></span>
              ) : (
                <span>初めてご利用ですか？ <Link to="/signup">新規登録</Link></span>
              )}
            </div>

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
            <h2 id="hf-verify-title">メール確認</h2>
            <p>メールに送信された確認コードを入力してください。</p>
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
                  if (verificationOpen === "login") signIn.reset();
                  if (verificationOpen === "signup") signUp.reset();
                  setVerificationOpen(null);
                  setVerificationCode("");
                  setError(null);
                }}
                disabled={busy}
              >
                キャンセル
              </button>
              <button type="submit" className="hf-auth-primary" disabled={busy || !verificationCode.trim()}>
                {busy ? "確認中…" : (verificationOpen === "signup" ? "確認して登録" : "確認してログイン")}
              </button>
            </div>
          </form>
        </div>
      )}

      {finalizing && (
        <div className="hf-login-loading" aria-live="polite" aria-label={signupMode ? "登録中" : "ログイン中"}>
          <div className="hf-login-loading-card">
            <img className="hf-login-spinner" src={financeMark} alt="" />
            <strong>Hoiku Finance</strong>
            <span>{signupMode ? "登録を完了しています" : "ログインしています"}</span>
          </div>
        </div>
      )}
    </>
  );
}
