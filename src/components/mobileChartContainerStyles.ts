"use client"
import type { RefObject } from "react"
import { useSharedContainerStyles } from "./chartContainerStyles"

const sharedCSS = `.semiotic-mobile-chart-shell {
  display: grid;
  gap: 10px;
  width: 100%;
}
.semiotic-mobile-summary-card {
  display: grid;
  gap: 10px;
}
.semiotic-mobile-summary-copy {
  font-size: 13px;
  line-height: 1.45;
}
.semiotic-mobile-chip-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  -webkit-overflow-scrolling: touch;
}
.semiotic-mobile-chip {
  display: inline-flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  border: 1px solid var(--semiotic-border, #d8d8d8);
  border-radius: 999px;
  padding: 7px 12px;
  background: var(--semiotic-bg, #fff);
  color: var(--semiotic-text, #222);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.semiotic-mobile-chip[aria-pressed="true"] {
  border-color: var(--semiotic-primary, #1f7a6d);
  background: color-mix(in srgb, var(--semiotic-primary, #1f7a6d) 14%, transparent);
}
.semiotic-mobile-chip:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.semiotic-mobile-chip-description {
  display: block;
  max-width: 160px;
  margin-top: 2px;
  color: var(--semiotic-text-secondary, #666);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.2;
}
.semiotic-mobile-control-stack {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.semiotic-mobile-detail-toggle {
  min-height: 44px;
  min-width: 44px;
  border: 1px solid var(--semiotic-border, #d8d8d8);
  border-radius: 999px;
  padding: 5px 10px;
  background: transparent;
  color: var(--semiotic-text, #222);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.semiotic-mobile-detail-panel {
  border: 1px solid var(--semiotic-border, #d8d8d8);
  border-radius: 16px;
  background: var(--semiotic-bg, #fff);
  color: var(--semiotic-text, #222);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.16);
  overflow: hidden;
}
.semiotic-mobile-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--semiotic-border, #d8d8d8);
  font-size: 13px;
  font-weight: 800;
}
.semiotic-mobile-detail-body {
  padding: 12px;
  font-size: 13px;
  line-height: 1.5;
}`

export function useMobileChartContainerStyles(
  ref: RefObject<HTMLDivElement | null>,
  breakpoint: number
) {
  return useSharedContainerStyles(
    ref,
    "mobile",
    sharedCSS,
    breakpoint,
    `@media (max-width: ${breakpoint}px) {
  .semiotic-mobile-chart-shell[data-semiotic-mobile-breakpoint="${breakpoint}"] > .semiotic-mobile-detail-panel[data-mode="sheet"] {
    position: sticky;
    bottom: 8px;
    z-index: 2;
    max-height: min(55vh, 420px);
    overflow: auto;
  }
}`
  )
}
