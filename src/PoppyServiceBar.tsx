import type { CSSProperties } from "react";

const services = [
  { code: "office", label: "Office", detail: "園務・労務", href: "/office/", color: "#ff9f1c" },
  { code: "market", label: "Market", detail: "Web・集客", href: "/market/", color: "#34b96f" },
  { code: "color", label: "Color", detail: "求人・採用", href: "/color/", color: "#ff4d73" },
  { code: "finance", label: "Finance", detail: "会計・経営", href: "/finance/", color: "#2f80ed" },
] as const;

export function PoppyServiceBar() {
  return (
    <nav className="hf-poppy-service-bar" aria-label="Hoiku Poppy サービス切替">
      <a className="hf-poppy-home" href="/" aria-label="Hoiku Poppy ホーム">
        <span className="hf-poppy-mark" aria-hidden="true"><i /><i /><i /><i /></span>
        <span>Hoiku Poppy</span>
      </a>
      <div className="hf-poppy-services">
        {services.map((service) => (
          <a
            key={service.code}
            href={service.href}
            className={`hf-poppy-service${service.code === "finance" ? " is-current" : ""}`}
            style={{ "--poppy-service-color": service.color } as CSSProperties}
            aria-current={service.code === "finance" ? "page" : undefined}
          >
            <span className="hf-poppy-service-dot" />
            <span className="hf-poppy-service-label">Hoiku {service.label}</span>
            <small>{service.detail}</small>
          </a>
        ))}
      </div>
    </nav>
  );
}
