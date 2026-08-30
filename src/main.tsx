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

const authPublicKey = __HF_CLERK_PUBLIC_KEY__.trim();

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
  if (window.location.pathname === "/login") return <Navigate to="/" replace />;

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
  if (!authPublicKey) {
    return (
      <main className="hf-config-error">
        <img src={financeMark} alt="" />
        <h1>ログイン設定を確認できませんでした</h1>
        <p>現在ログイン機能を利用できません。管理者にお問い合わせください。</p>
      </main>
    );
  }

  return (
    <ClerkProvider publishableKey={authPublicKey}>
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
