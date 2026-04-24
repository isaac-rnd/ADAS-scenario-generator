// Shared utility components — chips, metrics, icons, panels.
import React from "react";

export function Icon({ name, size = 14, stroke = 1.5 }) {
  const s = size;
  const common = {
    width: s, height: s, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: stroke,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  const paths = {
    play: <polygon points="6 4 20 12 6 20 6 4" />,
    pause: <g><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></g>,
    stop: <rect x="5" y="5" width="14" height="14" />,
    plus: <g><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></g>,
    chev: <polyline points="9 18 15 12 9 6" />,
    car: <g><path d="M3 13l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5" /><rect x="3" y="13" width="18" height="5" rx="1" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="16.5" cy="18" r="1.5" /></g>,
    library: <g><rect x="3" y="4" width="4" height="16" /><rect x="10" y="4" width="4" height="16" /><rect x="17" y="4" width="4" height="16" /></g>,
    map: <g><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></g>,
    gear: <g><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></g>,
    export: <g><path d="M12 3v12" /><polyline points="7 8 12 3 17 8" /><path d="M5 21h14" /></g>,
    reset: <g><polyline points="1 4 1 10 7 10" /><path d="M3.5 15a9 9 0 1 0 2-9.7L1 10" /></g>,
    target: <g><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></g>,
    camera: <g><path d="M3 8h4l2-3h6l2 3h4v11H3z" /><circle cx="12" cy="13" r="4" /></g>,
    grid3: <g><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></g>,
    chase: <g><circle cx="12" cy="12" r="4" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></g>,
    clock: <g><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></g>,
    ped: <g><circle cx="12" cy="4" r="2" /><path d="M12 6v7M9 13h6M9 13l-2 7M15 13l2 7" /></g>,
    cone: <g><polygon points="12 3 18 21 6 21" /><line x1="8" y1="14" x2="16" y2="14" /></g>,
    bldg: <g><rect x="4" y="3" width="16" height="18" /><line x1="8" y1="7" x2="10" y2="7" /><line x1="14" y1="7" x2="16" y2="7" /><line x1="8" y1="12" x2="10" y2="12" /><line x1="14" y1="12" x2="16" y2="12" /><line x1="8" y1="17" x2="10" y2="17" /><line x1="14" y1="17" x2="16" y2="17" /></g>,
    barrier: <g><rect x="3" y="10" width="18" height="5" /><line x1="6" y1="10" x2="9" y2="15" /><line x1="12" y1="10" x2="15" y2="15" /><line x1="18" y1="10" x2="21" y2="15" /></g>,
    download: <g><path d="M12 3v12" /><polyline points="7 11 12 16 17 11" /><path d="M5 21h14" /></g>,
    search: <g><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16" y2="16" /></g>,
    x: <g><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></g>,
    check: <polyline points="5 12 10 17 20 6" />,
    alert: <g><path d="M12 2l10 18H2z" /><line x1="12" y1="9" x2="12" y2="14" /><circle cx="12" cy="17" r="0.5" /></g>,
    sensor: <g><path d="M2 12a10 10 0 0 1 20 0" /><path d="M6 12a6 6 0 0 1 12 0" /><circle cx="12" cy="12" r="1.5" /></g>,
    route: <g><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h6a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h6" /></g>,
  };
  return <svg {...common}>{paths[name] || null}</svg>;
}

export function Chip({ variant = "default", children, dot = false, style }) {
  return (
    <span className={`chip ${variant !== "default" ? variant : ""}`} style={style}>
      {dot && <span className="dot" style={{ background: "currentColor" }}></span>}
      {children}
    </span>
  );
}

export function Panel({ title, right, children, style, bodyStyle, noPad = false }) {
  return (
    <div className="panel" style={style}>
      {title && (
        <div className="panel-header">
          <div className="panel-title">{title}</div>
          {right}
        </div>
      )}
      <div style={{ padding: noPad ? 0 : 10, ...(bodyStyle || {}) }}>{children}</div>
    </div>
  );
}

export function Metric({ label, value, unit, sub, tone = "default" }) {
  const toneColor = {
    default: "var(--fg-0)", good: "var(--pass)", warn: "var(--warn)", bad: "var(--fail)",
  }[tone];
  return (
    <div style={{
      padding: "10px 10px",
      borderRadius: 6,
      background: "var(--bg-2)",
      border: "1px solid var(--line)",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div className="label">{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="mono" style={{ fontSize: 18, fontWeight: 500, color: toneColor, letterSpacing: "-0.01em" }}>
          {value}
        </span>
        {unit && <span className="mono" style={{ fontSize: 11, color: "var(--fg-2)" }}>{unit}</span>}
      </div>
      {sub && <div className="mono" style={{ fontSize: 10, color: "var(--fg-2)" }}>{sub}</div>}
    </div>
  );
}

export function Bar({ value, max = 1, tone = "accent" }) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  const color = {
    accent: "var(--accent)", pass: "var(--pass)", warn: "var(--warn)", fail: "var(--fail)", mag: "var(--mag)",
  }[tone];
  return (
    <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ width: pct + "%", height: "100%", background: color, transition: "width 200ms" }} />
    </div>
  );
}

export function VerdictBadge({ verdict }) {
  const map = {
    PASS:       { label: "PASS", variant: "pass" },
    FAIL:       { label: "FAIL", variant: "fail" },
    MONITORING: { label: "MONITORING", variant: "accent" },
    READY:      { label: "READY", variant: "default" },
  };
  const m = map[verdict] || map.MONITORING;
  const pulse = verdict === "MONITORING";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "6px 12px",
      borderRadius: 4,
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      fontWeight: 600,
      color: m.variant === "pass" ? "var(--pass)" :
             m.variant === "fail" ? "var(--fail)" :
             m.variant === "accent" ? "var(--accent)" : "var(--fg-0)",
      background: m.variant === "pass" ? "var(--pass-soft)" :
                  m.variant === "fail" ? "var(--fail-soft)" :
                  m.variant === "accent" ? "var(--accent-soft)" : "var(--bg-2)",
      border: "1px solid " + (
        m.variant === "pass" ? "color-mix(in oklch, var(--pass), transparent 55%)" :
        m.variant === "fail" ? "color-mix(in oklch, var(--fail), transparent 55%)" :
        m.variant === "accent" ? "var(--accent-line)" : "var(--line-2)"),
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: "currentColor",
        animation: pulse ? "pulse 1.4s infinite" : "none",
        boxShadow: "0 0 10px currentColor",
      }} />
      {m.label}
    </div>
  );
}
