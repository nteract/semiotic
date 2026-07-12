import React from "react"

const GLYPH_LABELS = {
  burst: "anomaly",
  crate: "segment",
  route: "path",
  abacus: "denominator",
  calendar: "context",
  scales: "comparison",
  sieve: "filter",
  "unlit-lantern": "hypothesis",
  shield: "counterevidence",
  "lit-lantern": "insight",
  decoy: "false positive",
  scroll: "saved view",
  codex: "knowledge view",
  bell: "watcher",
}

export function ForgeGlyph({ name, size = 34, label, decorative = false, className = "" }) {
  const title = label ?? GLYPH_LABELS[name] ?? "analytical artifact"
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 48 48",
    className: `insight-forge-glyph ${className}`.trim(),
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": title }),
  }

  return (
    <svg {...common}>
      {!decorative && <title>{title}</title>}
      <GlyphShape name={name} />
    </svg>
  )
}

function GlyphShape({ name }) {
  switch (name) {
    case "burst":
      return (
        <>
          <path d="m24 4 4.2 8.4 8.8-3.3-2.7 9 8.3 4.4-8.3 4.4 2.7 9-8.8-3.3L24 41l-4.2-8.4-8.8 3.3 2.7-9-8.3-4.4 8.3-4.4-2.7-9 8.8 3.3Z" />
          <path d="m26 12-6 10h6l-5 13" />
        </>
      )
    case "crate":
      return (
        <>
          <path d="M7 13h34v27H7zM7 21h34M15 13v27M33 13v27" />
          <path d="m18 25 12 11M30 25 18 36M12 8h24l5 5H7z" />
        </>
      )
    case "route":
      return (
        <>
          <circle cx="9" cy="33" r="4" />
          <circle cx="24" cy="15" r="4" />
          <circle cx="39" cy="30" r="4" />
          <path d="M12 30 21 18M27 17l9 10M14 35h19" />
          <path d="m30 31 4 4-4 4" />
        </>
      )
    case "abacus":
      return (
        <>
          <path d="M8 7h32v34H8zM12 15h24M12 24h24M12 33h24" />
          <circle cx="18" cy="15" r="3" fill="currentColor" stroke="none" />
          <circle cx="29" cy="24" r="3" fill="currentColor" stroke="none" />
          <circle cx="22" cy="33" r="3" fill="currentColor" stroke="none" />
        </>
      )
    case "calendar":
      return (
        <>
          <path d="M8 11h32v30H8zM8 19h32M16 7v8M32 7v8" />
          <path d="M17 25h5v5h-5zM27 25h5v5h-5zM17 34h5v4h-5z" />
          <circle cx="36" cy="35" r="5" fill="currentColor" stroke="none" />
        </>
      )
    case "scales":
      return (
        <>
          <path d="M24 7v33M14 41h20M13 12h22M24 9l-12 4M24 9l12 4" />
          <path d="m12 13-7 14h14ZM36 13l-7 14h14Z" />
        </>
      )
    case "sieve":
      return (
        <>
          <path d="M6 8h36L28 25v12l-8 4V25Z" />
          <circle cx="15" cy="13" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="23" cy="13" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="31" cy="13" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="20" cy="19" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="28" cy="19" r="1.8" fill="currentColor" stroke="none" />
        </>
      )
    case "unlit-lantern":
      return (
        <>
          <path d="M16 15h16l5 8-3 18H14l-3-18ZM18 15V9h12v6M18 22h12v13H18z" />
          <path d="M21 25c0-3 6-3 6 .5 0 2-3 2-3 5M24 33v.5" />
        </>
      )
    case "lit-lantern":
      return (
        <>
          <path d="M16 15h16l5 8-3 18H14l-3-18ZM18 15V9h12v6M18 22h12v13H18z" />
          <path d="M24 33c-4-3-3-7 0-10 4 4 4 7 0 10ZM24 4V1M39 10l3-3M9 10 6-3M42 25h4M2 25h4" />
        </>
      )
    case "shield":
      return (
        <>
          <path d="M24 5 39 11v11c0 10-6 16-15 21C15 38 9 32 9 22V11Z" />
          <path d="M4 25h20M10 19l-6 6 6 6M20 15v20" />
        </>
      )
    case "decoy":
      return (
        <>
          <path d="M16 34h16M18 34V22c0-5 2-9 6-9s6 4 6 9v12M15 38h18M21 9h6M24 9V5" />
          <path d="m9 10 30 30M39 10 9 40" />
        </>
      )
    case "scroll":
      return (
        <>
          <path d="M13 8h24c-3 3-3 7 0 10v19H13c3-3 3-7 0-10V8Z" />
          <path d="M13 8c-8 0-8 10 0 10h24M13 27h24M13 37c-8 0-8-10 0-10M19 22h12M19 32h12" />
        </>
      )
    case "codex":
      return (
        <>
          <path d="M5 10c8-2 14 0 19 5 5-5 11-7 19-5v29c-8-2-14 0-19 5-5-5-11-7-19-5ZM24 15v29" />
          <path d="M10 31h4v5h-4zM16 25h4v11h-4zM28 29h4v7h-4zM34 21h4v15h-4z" />
        </>
      )
    case "bell":
      return (
        <>
          <path d="M14 34h20M17 34V22c0-6 3-10 7-10s7 4 7 10v12M20 39c1 4 7 4 8 0M21 8h6" />
          <path d="M34 15c4 2 6 5 6 9M14 15c-4 2-6 5-6 9" />
          <circle cx="24" cy="24" r="3" />
        </>
      )
    default:
      return <path d="M8 8h32v32H8zM14 16h20M14 24h20M14 32h12" />
  }
}

export function EvidencePips({ count = 1, max = 5 }) {
  const shown = Math.min(max, Math.max(1, count))
  const overflow = Math.max(0, count - max)
  return (
    <span
      className="insight-forge-pips"
      aria-label={`${count} evidence link${count === 1 ? "" : "s"}`}
    >
      {Array.from({ length: shown }, (_, index) => (
        <span key={index} className="insight-forge-pip" aria-hidden="true" />
      ))}
      {overflow > 0 && <span className="insight-forge-pip-more">+{overflow}</span>}
    </span>
  )
}
