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

function isClerkPublishableKey(value: unknown): value is string {
  return typeof value === "string" && /^pk_(test|live)_[A-Za-z0-9._-]+$/.test(value.trim());
}

async function loadAuthPublicKey(): Promise<string> {
  if (isClerkPublishableKey(buildTimeAuthPublicKey)) return buildTimeAuthPublicKey;

  const response = await fetch(
    `${authConfigSupabaseUrl}/functions/v1/get-hoiku-finance-clerk-public-key`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );

  if (!response.ok) throw new Error(`auth-config:${response.status}`);
  const payload = await response.json() as { publishableKey?: unknown };
  if (!isClerkPublishableKey(payload.publishableKey)) throw new Error("auth-config:invalid-key");
  return payload.publishableKey.trim();
}

function AppLoader({ label = "データを読み込んでいます" }: { label?: string }) {
  return (
    <div className="loading-overlay" aria-live="polite" aria-label="読み込み中">
      <div className="loading-card">
        <img className="hf-auth-loading-mark" src={financeMark} alt="" />
        <strong>Hoiku Finance</strong>
        <span>{label}</span>
      </div>
    </div>
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
  if (!isLoaded) return <AppLoader label="認証状態を確認しています" />;
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

  if (loadingAuthConfig) return <AppLoader label="ログインを準備しています" />;

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
