import { describe, expect, it } from "vitest"

import { contrastRatio } from "./charts/shared/colorContrast"
import { THEME_PRESETS } from "./semiotic-themes"

/**
 * Theme contrast conformance gate.
 *
 * Every shipped preset must satisfy WCAG-derived contrast floors for the
 * roles that render as text or focus indicators. Mark roles (categorical
 * palette + status fills) are *reported* against the WCAG 1.4.11 3:1
 * graphical-object bar through an exact-match known-exceptions map: a new
 * preset (or a palette edit) that introduces a low-contrast mark fails this
 * test, and improving a palette forces the map to shrink. The map is a
 * burn-down ledger, not a waiver.
 *
 * Thresholds:
 * - text / textSecondary / tooltip text / annotation → 4.5:1 (WCAG AA,
 *   normal-size text — ticks render at 12px, annotations paint editorial
 *   text in `layer` cohesion mode).
 * - focus → 3:1 (WCAG 1.4.11 non-text indicator).
 * - categorical + status fills → 3:1 reported via KNOWN_LOW_CONTRAST_MARKS.
 * - grid/border are exempt: gridlines are deliberately de-emphasized
 *   chrome, not information-bearing objects.
 *
 * The integration-test axe scan (integration-tests/accessibility.spec.ts)
 * re-enables the `color-contrast` rule on the strength of this gate.
 */

const TEXT_MIN = 4.5
const INDICATOR_MIN = 3
const MARK_MIN = 3

/**
 * Effective background for contrast purposes. The default `light` preset
 * declares `background: "transparent"` (charts composite onto the host
 * page), so contrast is measured against `surface` — the documented
 * compositing target and the color tooltips/cards actually paint.
 */
function effectiveBackground(colors: {
  background: string
  surface?: string
}): string {
  if (contrastRatio("#000", colors.background) !== null) {
    return colors.background
  }
  return colors.surface ?? "#ffffff"
}

/**
 * Mark-role colors known to sit below the 3:1 graphical-object bar, keyed
 * by preset. Status entries are prefixed `role:`; bare entries are
 * categorical palette members. Each block documents *why* the exception is
 * accepted rather than fixed:
 *
 * - `light` — d3 category10, the ecosystem-default palette. Kept for
 *   continuity with two decades of d3 practice; orange/pink/olive/cyan trade
 *   background contrast for hue spread. `warning`/`info` are the classic
 *   bootstrap-era status hues.
 * - `high-contrast` — the Okabe-Ito colorblind-safe palette
 *   (COLOR_BLIND_SAFE_CATEGORICAL, a public export). Its contract is
 *   category-vs-category distinguishability under CVD, and its yellow/orange/
 *   sky members deliberately trade mark-on-white contrast for that. Replacing
 *   them would break the palette's published CVD guarantees; pair with
 *   strokes/patterns where mark-on-background contrast is required.
 * - `pastels` — a decorative, low-saturation palette by design; its text
 *   and annotation roles ARE gated at full AA above. Use a stronger preset
 *   for data-dense or compliance-bound contexts.
 * - `carbon` — #f1c21b is IBM Carbon's own `support-warning` token, which
 *   Carbon pairs with an icon/border rather than relying on fill contrast.
 *   Mirroring the upstream design system is the point of the preset.
 * - the remaining single-color entries (bi-tool/italian/journalist/playful/
 *   tufte-dark status hues, gold/lime/cyan categorical members) are brand
 *   hues whose adjacent-category separation is gated separately by
 *   diagnoseConfig's LOW_ADJACENT_CONTRAST check.
 */
const KNOWN_LOW_CONTRAST_MARKS: Record<string, string[]> = {
  light: [
    "#ff7f0e",
    "#e377c2",
    "#bcbd22",
    "#17becf",
    "warning:#f0ad4e",
    "info:#00a2ce",
  ],
  "high-contrast": ["#E69F00", "#56B4E9", "#F0E442"],
  pastels: [
    "#f0a0c0",
    "#88d4ab",
    "#b0a0e8",
    "#f0c888",
    "success:#9ad4a3",
    "danger:#e8869a",
    "warning:#f0c888",
    "info:#9cb8e0",
  ],
  "bi-tool": ["success:#10b981", "warning:#f59e0b"],
  italian: ["#c8a415", "warning:#c8a415"],
  "tufte-dark": ["error:#a04040"],
  journalist: ["#d4a843", "warning:#d4a843"],
  playful: [
    "#06b6d4",
    "#84cc16",
    "success:#10d870",
    "warning:#ffaa33",
    "info:#06b6d4",
  ],
  carbon: ["warning:#f1c21b"],
}

const STATUS_ROLES = ["success", "danger", "warning", "error", "info"] as const

describe("theme contrast conformance", () => {
  const presets = Object.entries(THEME_PRESETS)

  it("covers every registered preset", () => {
    // If a preset is added, this suite automatically covers it; this
    // assertion just documents the breadth for the reader.
    expect(presets.length).toBeGreaterThanOrEqual(17)
  })

  describe.each(presets)("%s", (name, theme) => {
    const colors = theme.colors
    const bg = effectiveBackground(colors)

    it("has a measurable background", () => {
      expect(contrastRatio("#000", bg)).not.toBeNull()
    })

    it(`text meets ${TEXT_MIN}:1 against the background`, () => {
      const ratio = contrastRatio(colors.text, bg)
      expect(ratio, `${name} text ${colors.text} on ${bg}`).not.toBeNull()
      expect(ratio!).toBeGreaterThanOrEqual(TEXT_MIN)
    })

    it(`textSecondary meets ${TEXT_MIN}:1 against the background`, () => {
      const ratio = contrastRatio(colors.textSecondary, bg)
      expect(
        ratio,
        `${name} textSecondary ${colors.textSecondary} on ${bg}`
      ).not.toBeNull()
      expect(ratio!).toBeGreaterThanOrEqual(TEXT_MIN)
    })

    it(`tooltip text meets ${TEXT_MIN}:1 against the tooltip background`, () => {
      const tooltipText = theme.tooltip?.text ?? colors.text
      const tooltipBg = theme.tooltip?.background ?? bg
      const ratio = contrastRatio(tooltipText, tooltipBg)
      expect(
        ratio,
        `${name} tooltip ${tooltipText} on ${tooltipBg}`
      ).not.toBeNull()
      expect(ratio!).toBeGreaterThanOrEqual(TEXT_MIN)
    })

    it(`annotation color meets ${TEXT_MIN}:1 when declared`, () => {
      if (!colors.annotation) return
      const ratio = contrastRatio(colors.annotation, bg)
      expect(
        ratio,
        `${name} annotation ${colors.annotation} on ${bg}`
      ).not.toBeNull()
      expect(ratio!).toBeGreaterThanOrEqual(TEXT_MIN)
    })

    it(`focus indicator meets ${INDICATOR_MIN}:1 when declared`, () => {
      if (!colors.focus) return
      const ratio = contrastRatio(colors.focus, bg)
      expect(ratio, `${name} focus ${colors.focus} on ${bg}`).not.toBeNull()
      expect(ratio!).toBeGreaterThanOrEqual(INDICATOR_MIN)
    })
  })

  it("mark roles below 3:1 exactly match the known-exceptions ledger", () => {
    const actual: Record<string, string[]> = {}
    for (const [name, theme] of presets) {
      const colors = theme.colors
      const bg = effectiveBackground(colors)
      const low: string[] = []
      for (const cat of colors.categorical ?? []) {
        const ratio = contrastRatio(cat, bg)
        if (ratio === null || ratio < MARK_MIN) low.push(cat)
      }
      for (const role of STATUS_ROLES) {
        const value = colors[role]
        if (!value) continue
        const ratio = contrastRatio(value, bg)
        if (ratio === null || ratio < MARK_MIN) low.push(`${role}:${value}`)
      }
      if (low.length > 0) actual[name] = low
    }
    // Exact match in both directions: a regression (new low-contrast mark)
    // fails, and an improvement (entry no longer low-contrast) fails until
    // the ledger above is shrunk to match — keeping the ledger honest.
    expect(actual).toEqual(KNOWN_LOW_CONTRAST_MARKS)
  })
})
