/**
 * Theme-token vocabulary gate.
 *
 * `var(--semiotic-foo, #hex)` looks like theming and silently isn't when
 * `--semiotic-foo` is a name the library never emits: the fallback hex always
 * wins, so the mark can't track `ThemeProvider` or a dark-mode override. That
 * failed quietly across the physics chrome for a long time — a shadow
 * vocabulary (`accent`, `negative`, `positive`, `background`, `text-primary`)
 * that shadowed real tokens (`primary`, `danger`, `success`, `bg`, `text`).
 *
 * This test diffs every `--semiotic-*` name referenced in source against the
 * set `themeToCSS` actually emits. Component-level knobs that are deliberately
 * consumer-set (never theme-derived) live in the allowlist below, with a reason.
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { themeToCSS, themeToCSSVariables } from "./themeSerialization"
import { HIGH_CONTRAST_THEME, LIGHT_THEME } from "./ThemeStore"

/**
 * Names intentionally *not* theme-emitted: opt-in overrides a consumer sets to
 * restyle one component, each already carrying a real fallback. Add here only
 * with a reason — if a name belongs to the theme, emit it instead.
 */
const CONSUMER_KNOBS: Record<string, string> = {
  "--semiotic-adjacency-flow-arrow-fill": "Adjacency Flow direction-marker fill override",
  "--semiotic-data-table-bg": "accessible data-table surface override",
  "--semiotic-data-table-border": "accessible data-table border override",
  "--semiotic-data-table-text": "accessible data-table text override",
  "--semiotic-data-table-muted-text": "accessible data-table muted text override",
  "--semiotic-data-table-z-index": "accessible data-table stacking override",
  "--semiotic-overlay-z-index": "overlay stacking override",
  "--semiotic-small-multiple-columns": "ChartGrid small-multiple column count",
  "--semiotic-small-multiple-gap": "ChartGrid small-multiple gap",
  "--semiotic-gauge-label-font-size": "GaugeChart label sizing override",
  "--semiotic-process-border": "processChrome kit (documented --semiotic-process-*)",
  "--semiotic-process-floor": "processChrome kit (documented --semiotic-process-*)",
  "--semiotic-process-lane": "processChrome kit (documented --semiotic-process-*)",
  "--semiotic-process-muted": "processChrome kit (documented --semiotic-process-*)",
  "--semiotic-process-text": "processChrome kit (documented --semiotic-process-*)"
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out)
      continue
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue
    if (/\.test\.(ts|tsx)$/.test(entry)) continue
    out.push(full)
  }
  return out
}

/**
 * The authoritative vocabulary is the canonical variable projection itself.
 * Populate every optional role plus ample categorical slots so the gate also
 * validates names used by palettes larger than the built-in defaults.
 */
function emittedTokens(): Set<string> {
  const exhaustiveTheme = {
    ...HIGH_CONTRAST_THEME,
    colors: {
      ...HIGH_CONTRAST_THEME.colors,
      annotation: "#000000",
      cellBorder: "#000000",
      categorical: Array.from({ length: 64 }, () => "#000000"),
      diverging: "RdBu",
    },
    typography: {
      ...HIGH_CONTRAST_THEME.typography,
      legendSize: 12,
      legendFontFamily: "sans-serif",
      legendFontWeight: 500,
      tickFontFamily: "sans-serif",
      titleFontSize: 16,
      titleFontFamily: "sans-serif",
      titleFontWeight: 600,
    },
  }
  return new Set(Object.keys(themeToCSSVariables(exhaustiveTheme)))
}

function referencedTokens(): Map<string, string[]> {
  const found = new Map<string, string[]>()
  for (const file of sourceFiles(join(process.cwd(), "src", "components"))) {
    const text = readFileSync(file, "utf8")
    for (const match of text.matchAll(/var\(\s*(--semiotic-[a-z0-9-]+)/g)) {
      const token = match[1]
      const files = found.get(token) ?? []
      if (!files.includes(file)) files.push(file)
      found.set(token, files)
    }
  }
  return found
}

describe("theme token vocabulary", () => {
  it("projects title and legend fallback typography", () => {
    const variables = themeToCSSVariables({
      ...LIGHT_THEME,
      typography: {
        ...LIGHT_THEME.typography,
        titleSize: 22,
        labelSize: 19,
      },
    })

    expect(variables["--semiotic-title-font-size"]).toBe("22px")
    expect(variables["--semiotic-legend-font-size"]).toBe("19px")
  })

  it("emits the core color roles", () => {
    const emitted = emittedTokens()
    for (const token of [
      "--semiotic-bg",
      "--semiotic-text",
      "--semiotic-text-secondary",
      "--semiotic-primary",
      "--semiotic-danger",
      "--semiotic-success",
      "--semiotic-warning",
      "--semiotic-border"
    ]) {
      expect(emitted, `${token} must be a real emitted token`).toContain(token)
    }
  })

  it("a serialized theme only produces names from that vocabulary", () => {
    const emitted = emittedTokens()
    const css = themeToCSS(LIGHT_THEME, ":root")
    const produced = new Set(css.match(/--semiotic-[a-z0-9-]+/g) ?? [])
    expect([...produced].filter((token) => !emitted.has(token))).toEqual([])
    expect(css).toContain("--semiotic-cell-border:")
    expect(css).toContain("--semiotic-category-1:")
  })

  it("never references a --semiotic-* name the theme does not emit", () => {
    const emitted = emittedTokens()
    const referenced = referencedTokens()

    const phantom = [...referenced.entries()]
      .filter(([token]) => !emitted.has(token) && !(token in CONSUMER_KNOBS))
      .map(([token, files]) => {
        const shown = files
          .map((file) => file.replace(`${process.cwd()}/`, ""))
          .slice(0, 4)
        return `${token} — referenced in ${shown.join(", ")}${files.length > 4 ? ` (+${files.length - 4} more)` : ""}`
      })
      .sort()

    expect(
      phantom,
      "These CSS vars are referenced but never emitted, so their fallback always wins and the mark cannot be themed. Point them at a real role, or add a CONSUMER_KNOBS entry explaining why they are consumer-set."
    ).toEqual([])
  })

  it("keeps the allowlist honest — no knob that is actually a real token", () => {
    const emitted = emittedTokens()
    const shadowed = Object.keys(CONSUMER_KNOBS).filter((token) =>
      emitted.has(token)
    )
    expect(
      shadowed,
      "These are emitted by the theme, so they are not consumer-only knobs; drop them from CONSUMER_KNOBS."
    ).toEqual([])
  })

  it("keeps the allowlist pruned — no knob nobody references", () => {
    const referenced = referencedTokens()
    const unused = Object.keys(CONSUMER_KNOBS).filter(
      (token) => !referenced.has(token)
    )
    expect(unused, "Unreferenced CONSUMER_KNOBS entries should be removed.").toEqual([])
  })
})
