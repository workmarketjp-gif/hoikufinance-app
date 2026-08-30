import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/react";
import { BrowserRouter, Navigate } from "react-router";
import App from "./App";
import LoginPage from "./LoginPage";
import FinanceEnhancements from "./FinanceEnhancements";
import { FinanceSessionProvider } from "./FinanceSession";
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

const buildTimeAuthPublicKey = __HF_CLERK_PUBLIC_KEY__.trim();
const authConfigSupabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL?.trim() ||
  "https://kcmmpjyngcysdfbumchk.supabase.co"
).replace(/\/+$/, "");
const AUTH_LOAD_TIMEOUT_MS = 8_000;

function isClerkPublishableKey(value: unknown): value is string {
  return typeof value === "string" && /^pk_(test|live)_[A-Za-z0-9._-]+$/.test(value.trim());
}

async function loadAuthPublicKey(): Promise<string> {
  if (isClerkPublishableKey(buildTimeAuthPublicKey)) return buildTimeAuthPublicKey;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), AUTH_LOAD_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${authConfigSupabaseUrl}/functions/v1/get-hoiku-finance-clerk-public-key`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      },
    );

    if (!response.ok) throw new Error(`auth-config:${response.status}`);
    const payload = await response.json() as { publishableKey?: unknown };
    if (!isClerkPublishableKey(payload.publishableKey)) throw new Error("auth-config:invalid-key");
    return payload.publishableKey.trim();
  } finally {
    window.clearTimeout(timer);
  }
}

function AppLoader({
  label = "データを読み込んでいます",
  detail,
}: {
  label?: string;
  detail?: string;
}) {
  return (
    <main className="hf-loading-screen" aria-live="polite" aria-busy="true" role="status">
      <section className="hf-loading-card">
        <div className="hf-loading-logo is-animated">
          <img className="hf-auth-loading-mark" src={financeMark} alt="Hoiku Finance" />
        </div>
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
      <button type="button" className="hf-auth-primary" onClick={() => window.location.reload()}>
        もう一度試す
      </button>
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

  if (!isLoaded || !tokenReady) {
    return <AppLoader label="アカウントを確認しています" />;
  }
  if (window.location.pathname === "/login" || window.location.pathname === "/signup") {
    return <Navigate to="/" replace />;
  }

  return (
    <FinanceSessionProvider>
      <App />
      <FinanceEnhancements />
    </FinanceSessionProvider>
  );
}

function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), AUTH_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [isLoaded]);

  if (!isLoaded) {
    return timedOut
      ? <AuthConnectionError />
      : <AppLoader label="認証状態を確認しています" detail="通常は数秒で完了します" />;
  }
  return isSignedIn ? <AuthenticatedFinance /> : <LoginPage />;
}

function Root() {
  const [authPublicKey, setAuthPublicKey] = useState<string | null>(null);
  const [loadingAuthConfig, setLoadingAuthConfig] = useState(true);
  const [authConfigError, setAuthConfigError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingAuthConfig(true);
    setAuthConfigError(false);

    void loadAuthPublicKey()
      .then((key) => {
        if (!cancelled) setAuthPublicKey(key);
      })
      .catch((error) => {
        console.error("[hf-auth-config]", error);
        if (!cancelled) {
          setAuthPublicKey(null);
          setAuthConfigError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAuthConfig(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  if (loadingAuthConfig) {
    return <AppLoader label="ログインを準備しています" detail="認証情報を安全に読み込んでいます" />;
  }

  if (!authPublicKey || authConfigError) {
    return (
      <main className="hf-config-error">
        <img src={financeMark} alt="" />
        <h1>ログインの準備に失敗しました</h1>
        <p>通信状況を確認して、もう一度お試しください。</p>
        <button type="button" className="hf-auth-primary" onClick={() => setRetryKey((value) => value + 1)}>
          再読み込み
        </button>
      </main>
    );
  }

  return (
    <ClerkProvider
      publishableKey={authPublicKey}
      signInUrl="/login"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <AuthGate />
    </ClerkProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>
);
