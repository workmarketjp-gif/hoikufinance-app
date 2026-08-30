import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BarChart3, BookOpen, Home, Menu, WalletCards } from "lucide-react";
import { NavLink, useLocation } from "react-router";
import BudgetPage from "./BudgetPage";
import OperationsPage from "./OperationsPage";

export default function FinanceEnhancements() {
  const location = useLocation();
  const [sidebarSlot, setSidebarSlot] = useState<HTMLElement | null>(null);
  const [pageTarget, setPageTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const sidebar = document.querySelector<HTMLElement>(".sidebar-nav");
    const page = document.querySelector<HTMLElement>(".page-content");
    setPageTarget(page);

    if (!sidebar) return;
    const slot = document.createElement("div");
    slot.className = "finance-enhancement-slot";
    const groups = sidebar.querySelectorAll(":scope > .nav-group");
    sidebar.insertBefore(slot, groups[1] ?? null);
    setSidebarSlot(slot);

    return () => {
      slot.remove();
      setSidebarSlot(null);
    };
  }, []);

  useEffect(() => {
    const title = document.querySelector<HTMLElement>(".mobile-page-title");
    if (!title) return;
    if (location.pathname === "/budget") title.textContent = "予算管理";
    if (location.pathname === "/operations") title.textContent = "運営状況";
  }, [location.pathname]);

  const page = location.pathname === "/budget"
    ? <BudgetPage />
    : location.pathname === "/operations"
      ? <OperationsPage />
      : null;

  const openMenu = () => {
    document.querySelector<HTMLButtonElement>(".mobile-menu-button")?.click();
  };

  return (
    <>
      {sidebarSlot && createPortal(
        <div className="nav-group finance-special-nav">
          <div className="nav-group-label">予算・運営</div>
          <NavLink to="/budget" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <WalletCards size={18} strokeWidth={1.9} /><span>予算管理</span><span className="nav-pill budget-pill">48.9万</span>
          </NavLink>
          <NavLink to="/operations" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <BarChart3 size={18} strokeWidth={1.9} /><span>運営状況</span><span className="nav-pill operations-pill">86.7%</span>
          </NavLink>
        </div>,
        sidebarSlot,
      )}

      {pageTarget && page && createPortal(page, pageTarget)}

      <nav className="finance-mobile-bottom-nav" aria-label="Hoiku Finance主要メニュー">
        <NavLink to="/" end className={({ isActive }) => `finance-mobile-tab${isActive ? " active" : ""}`}><Home size={22} /><span>ホーム</span></NavLink>
        <NavLink to="/budget" className={({ isActive }) => `finance-mobile-tab${isActive ? " active" : ""}`}><WalletCards size={22} /><span>予算</span></NavLink>
        <NavLink to="/books" className={({ isActive }) => `finance-mobile-tab${isActive ? " active" : ""}`}><BookOpen size={22} /><span>出納</span></NavLink>
        <NavLink to="/operations" className={({ isActive }) => `finance-mobile-tab${isActive ? " active" : ""}`}><BarChart3 size={22} /><span>運営</span></NavLink>
        <button className="finance-mobile-tab" onClick={openMenu}><Menu size={22} /><span>メニュー</span></button>
      </nav>
    </>
  );
}
