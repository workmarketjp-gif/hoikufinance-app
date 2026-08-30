import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider, SignedIn, SignedOut, useAuth } from "@clerk/react";
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
import "./auth-overrides.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();

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

function Root() {
  if (!clerkPublishableKey) {
    return (
      <main className="hf-config-error">
        <img src={financeMark} alt="" />
        <h1>認証設定が必要です</h1>
        <p><code>VITE_CLERK_PUBLISHABLE_KEY</code> を設定してください。Hoiku Officeと同じClerk環境を使用します。</p>
      </main>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <SignedOut><LoginPage /></SignedOut>
      <SignedIn><AuthenticatedFinance /></SignedIn>
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
