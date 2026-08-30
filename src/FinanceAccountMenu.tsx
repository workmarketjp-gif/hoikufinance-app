import { useClerk } from "@clerk/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut, MoreHorizontal, Settings } from "lucide-react";
import { useNavigate } from "react-router";

export default function FinanceAccountMenu() {
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!confirmOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !signingOut) setConfirmOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [confirmOpen, signingOut]);

  const confirmSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut({ redirectUrl: "/login" });
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <>
      <div className="hf-account-menu-root" ref={rootRef}>
        <button
          type="button"
          className={`hf-account-menu-trigger${open ? " active" : ""}`}
          onClick={() => setOpen((value) => !value)}
          aria-label="アカウントメニュー"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <MoreHorizontal size={18} />
        </button>

        {open && (
          <div className="hf-account-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate("/settings");
              }}
            >
              <Settings size={16} />
              <span>設定</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="danger"
              onClick={() => {
                setOpen(false);
                setConfirmOpen(true);
              }}
            >
              <LogOut size={16} />
              <span>ログアウト</span>
            </button>
          </div>
        )}
      </div>

      {confirmOpen && createPortal(
        <div className="hf-logout-confirm-backdrop" role="presentation">
          <section className="hf-logout-confirm" role="dialog" aria-modal="true" aria-labelledby="hf-logout-title">
            <div className="hf-logout-confirm-icon"><LogOut size={24} /></div>
            <h2 id="hf-logout-title">ログアウトしますか？</h2>
            <p>Hoiku Financeからログアウトします。</p>
            <div className="hf-logout-confirm-actions">
              <button type="button" className="hf-auth-secondary" onClick={() => setConfirmOpen(false)} disabled={signingOut}>
                キャンセル
              </button>
              <button type="button" className="hf-auth-primary" onClick={() => void confirmSignOut()} disabled={signingOut}>
                {signingOut ? "ログアウト中…" : "ログアウトする"}
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
