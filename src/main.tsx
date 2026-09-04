import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/react";
import { BrowserRouter, Navigate } from "react-router";
import App from "./App";
import LoginPage from "./LoginPage";
import FinanceEnhancements from "./FinanceEnhancements";
import KokodeSearchReportingEnhancement from "./KokodeSearchReportingEnhancement";
import { FinanceSessionProvider } from "./FinanceSession";
import { PoppyServiceBar } from "./PoppyServiceBar";
import { setSupabaseAccessTokenGetter } from "./lib/supabase";
import financeMark from "./logo/logom_hoikufinance.png";
import "./styles.css";
import "./brand-overrides.css";
import "./login.css";
import "./budget-operations.css";
import "./finance-enhancements.css";
import "./budget-live.css";
import "./operations-live.css";
import "./home-live.css";
import "./auth-overrides.css";
import "./kokode-reporting.css";
import "./kokode-reporting-status.css";
import "./poppy-service-bar.css";

const DEFAULT_SUPABASE_URL = "https://kcmmpjyngcysdfbumchk.supabase.co";
const embeddedAuthPublicKey = __HF_CLERK_PUBLIC_KEY__.trim();
const configuredBasePath = __HF_BASE_PATH__ === "/" ? "" : __HF_BASE_PATH__.replace(/\/$/, "");
const appPath = (path: string) => `${configuredBasePath}${path.startsWith("/") ? path : `/${path}`}` || "/";
const relativePathname = () => {
  const pathname = window.location.pathname;
  if (!configuredBasePath) return pathname;
  const stripped = pathname.startsWith(configuredBasePath) ? pathname.slice(configuredBasePath.length) : pathname;
  return stripped || "/";
};
const AUTH_LOAD_TIMEOUT_MS = 8_000;

function isClerkPublishableKey(value: unknown): value is string {
  return typeof value === "string" && /^pk_(test|live)_[A-Za-z0-9._-]+$/.test(value.trim());
}

async function resolveClerkPublishableKey(): Promise<string | null> {
  if (isClerkPublishableKey(embeddedAuthPublicKey)) return embeddedAuthPublicKey;
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/get-hoiku-poppy-clerk-public-key`, { cache: "no-store" });
    if (!response.ok) return null;
    const body = (await response.json()) as { publishableKey?: unknown };
    return isClerkPublishableKey(body.publishableKey) ? body.publishableKey.trim() : null;
  } catch {
    return null;
  }
}

function AppLoader({ label = "データを読み込んでいます", detail }: { label?: string; detail?: string }) {
  return (
    <main className="hf-loading-screen" aria-live="polite" aria-busy="true" role="status">
      <section className="hf-loading-card">
        <div className="hf-loading-logo is-animated"><img className="hf-auth-loading-mark" src={financeMark} alt="Hoiku Finance" /></div>
        <h1>Hoiku Finance</h1>
        <p>{label}</p>
        {detail ? <small>{detail}</small> : null}
        <div className="hf-loading-track" aria-hidden="true"><span /></div>
      </section>
    </main>
  );
}

function AuthConnectionError() {
  return (
    <main className="hf-config-error">
      <img src={financeMark} alt="" />
      <h1>ログインの準備に時間がかかっています</h1>
      <p>認証サーバーへ接続できませんでした。通信状況を確認して、もう一度お試しください。</p>
      <button type="button" className="hf-auth-primary" onClick={() => window.location.reload()}>もう一度試す</button>
    </main>
  );
}

function AuthenticatedFinance() {
  const { isLoaded, getToken } = useAuth();
  const [tokenReady, setTokenReady] = useState(false);
  useEffect(() => {
    if (!isLoaded) return;
    setSupabaseAccessTokenGetter(async () => getToken());
    setTokenReady(true);
    return () => setSupabaseAccessTokenGetter(null);
  }, [getToken, isLoaded]);
  if (!isLoaded || !tokenReady) return <AppLoader label="アカウントを確認しています" />;
  if (["/login", "/signup"].includes(relativePathname())) return <Navigate to="/" replace />;
  return (
    <FinanceSessionProvider>
      <PoppyServiceBar />
      <App />
      <FinanceEnhancements />
      <KokodeSearchReportingEnhancement />
    </FinanceSessionProvider>
  );
}

function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (isLoaded) { setTimedOut(false); return; }
    const timer = window.setTimeout(() => setTimedOut(true), AUTH_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [isLoaded]);
  if (!isLoaded) return timedOut ? <AuthConnectionError /> : <AppLoader label="認証状態を確認しています" detail="通常は数秒で完了します" />;
  return isSignedIn ? <AuthenticatedFinance /> : <LoginPage />;
}

function FinanceRoot({ publishableKey }: { publishableKey: string }) {
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl={appPath("/login")}
      signUpUrl={appPath("/signup")}
      signInFallbackRedirectUrl={appPath("/")}
      signUpFallbackRedirectUrl={appPath("/")}
      afterSignOutUrl={appPath("/login")}
    >
      <AuthGate />
    </ClerkProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<AppLoader label="ログイン設定を読み込んでいます" />);

void resolveClerkPublishableKey().then((publishableKey) => {
  root.render(
    <React.StrictMode>
      <BrowserRouter basename={configuredBasePath || undefined}>
        {publishableKey ? <FinanceRoot publishableKey={publishableKey} /> : (
          <main className="hf-config-error">
            <img src={financeMark} alt="" />
            <h1>認証設定を確認してください</h1>
            <p>Hoiku Poppy共通のClerk Publishable Keyを読み込めませんでした。</p>
          </main>
        )}
      </BrowserRouter>
    </React.StrictMode>
  );
});
