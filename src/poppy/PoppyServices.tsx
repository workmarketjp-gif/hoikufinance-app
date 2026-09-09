import type { CSSProperties } from "react";
import "./poppy-ui.css";

export type PoppyService = "office" | "market" | "finance" | "color";
export const POPPY_ORIGIN = "https://app.hoikupoppy.ai";
export const POPPY_SERVICES = [
  { id: "office", name: "Office", detail: "園務・労務・シフト・配置", color: "#ff7a00" },
  { id: "market", name: "Market", detail: "ホームページ・発信・集客", color: "#25834b" },
  { id: "finance", name: "Finance", detail: "会計・予算・経営管理", color: "#1769aa" },
  { id: "color", name: "Color", detail: "求人・応募・採用", color: "#d8244b" },
] as const;

/** Cross-app links must reload the document, even on the same origin.
 * Client routers have distinct basenames and must never handle another service. */
export function PoppyServices({ current, variant = "sidebar", onNavigate }: {
  current: PoppyService; variant?: "sidebar" | "dashboard"; onNavigate?: () => void;
}) {
  return <nav className={`poppy-services poppy-services--${variant}`} aria-label="Hoiku Poppy AI サービス切替" data-poppy-services={variant}>
    <div className="poppy-services-heading">Hoiku Poppy AI</div>
    <div className="poppy-services-grid">
      {POPPY_SERVICES.map(service => <a key={service.id}
        href={`${POPPY_ORIGIN}/${service.id}`} onClick={onNavigate}
        data-testid={variant === "dashboard" ? `ho-service-card-${service.id}` : undefined}
        className={`poppy-service${current === service.id ? " is-current" : ""}`}
        style={{ "--service-color": service.color } as CSSProperties}
        aria-current={current === service.id ? "page" : undefined}>
        <img src={`${import.meta.env.BASE_URL}logo/logom_hoiku${service.id}.png`} alt="" width="32" height="32" />
        <span className="poppy-service-copy"><strong>Hoiku {service.name}</strong><small>{service.detail}</small></span>
        <span className="poppy-service-state">{current === service.id ? "利用中" : "→"}</span>
      </a>)}
    </div>
  </nav>;
}
