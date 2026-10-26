import * as React from "react"
import { act, render } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import {
  ThemeProvider,
  useTheme,
  LIGHT_THEME,
  DARK_THEME
} from "../ThemeProvider"
import { resolveTheme } from "../server/themeResolver"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"
import { resolveThemePreset } from "./themePresets"
import { autoSVGTheme, resolveAutoPalette } from "./themeResolution"
import { resolveThemeUpdate } from "./themeCore"
import { contrastRatio } from "../charts/shared/colorContrast"
import type { SemioticTheme } from "./themeCore"

afterEach(() => vi.restoreAllMocks())

it("keeps automatic SVG palette references indexed and validates their fallback values", () => {
  const categorical = ["#123456", "#654321"]
  expect(autoSVGTheme({ colors: { categorical } }).colors.categorical).toEqual([
    "var(--semiotic-category-1, #123456)",
    "var(--semiotic-category-2, #654321)"
  ])
  expect(() =>
    autoSVGTheme({ colors: { categorical: ["url(https://evil.test/image)"] } })
  ).toThrow(TypeError)
})

it.each(["light", "dark"] as const)(
  "retains the %s automatic palette when its optional override is undefined",
  (mode) => {
    const theme = resolveAutoPalette(
      { colors: { categorical: undefined } },
      mode
    )
    const base = mode === "dark" ? DARK_THEME : LIGHT_THEME
    expect(theme.colors.categorical).toEqual(base.colors.categorical)
    expect(theme.colors.categorical).not.toBe(base.colors.categorical)
  }
)

it.each(["light", "dark"] as const)(
  "shares %s theme merging across store, automatic, and static paths without retaining caller objects",
  (mode) => {
    const update = {
      mode,
      colors: { categorical: ["#123456", "#654321"] },
      tooltip: { fontSize: "20px" },
      accessibility: { highContrast: true },
      aesthetics: { thresholds: { titleScaleRatio: 2 } }
    }
    const store = resolveThemeUpdate(LIGHT_THEME, update)
    const automatic = resolveAutoPalette(update, mode)
    const server = resolveTheme(update)
    expect(server).toEqual(store)
    expect(automatic).toEqual({ ...store, mode: "auto" })
    for (const theme of [store, automatic, server]) {
      theme.colors.categorical.reverse()
      theme.tooltip!.fontSize = "30px"
      theme.accessibility!.highContrast = false
      theme.aesthetics!.thresholds!.titleScaleRatio = 3
    }
    expect(update.colors.categorical).toEqual(["#123456", "#654321"])
    expect(update.tooltip.fontSize).toBe("20px")
    expect(update.accessibility.highContrast).toBe(true)
    expect(update.aesthetics.thresholds.titleScaleRatio).toBe(2)
  }
)

it("isolates nested preset colors between client and server resolutions", () => {
  for (const resolve of [resolveTheme, resolveThemePreset]) {
    const first = resolve("dark")!
    first.colors.categorical.reverse()
    first.colors.text = "red"
    first.typography.fontFamily = "changed"
    expect(resolve("dark")).toEqual(DARK_THEME)
  }
})

it("warns once and records UNKNOWN_THEME in render evidence", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  const props = {
    data: [{ category: "A", value: 1 }],
    categoryAccessor: "category",
    valueAccessor: "value",
    theme: "missing-preset-regression"
  }
  for (let i = 0; i < 2; i++)
    expect(
      renderChartWithEvidence("BarChart", props).evidence.warnings
    ).toContain("UNKNOWN_THEME")
  expect(warn).toHaveBeenCalledTimes(1)
})

it("renders an opaque default and adaptive SSR palette with authored overrides", () => {
  expect(
    contrastRatio(LIGHT_THEME.colors.text, LIGHT_THEME.colors.background)
  ).toBeGreaterThan(4.5)
  const result = renderChartWithEvidence("BarChart", {
    data: [{ category: "A", value: 1 }],
    theme: { mode: "auto", colors: { primary: "#123456" } }
  })
  expect(result.evidence.markCount).toBe(1)
  expect(result.svg).toContain("prefers-color-scheme:dark")
  expect(result.svg).toContain("--semiotic-bg:#1a1a2e")
  expect(result.svg).toContain("--semiotic-primary:#123456")
  expect(result.svg).toContain("var(--semiotic-text-secondary, #666)")
})

it("updates concrete client colors when the system palette changes", () => {
  let dark = true
  const listeners = new Set<() => void>()
  const previous = window.matchMedia
  window.matchMedia = vi.fn(() => ({
    get matches() {
      return dark
    },
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener)
  })) as unknown as typeof window.matchMedia
  let seen: SemioticTheme | undefined
  function Probe() {
    seen = useTheme()
    return null
  }
  try {
    const view = render(
      <ThemeProvider theme={{ mode: "auto", colors: { primary: "#123456" } }}>
        <Probe />
      </ThemeProvider>
    )
    expect(seen!.colors.text).toBe(DARK_THEME.colors.text)
    expect(seen!.colors.primary).toBe("#123456")
    act(() => {
      dark = false
      listeners.forEach((listener) => listener())
    })
    expect(seen!.colors.text).toBe(LIGHT_THEME.colors.text)
    expect(view.container.querySelector("style")?.textContent).toContain(
      "prefers-color-scheme:dark"
    )
    view.unmount()
    expect(listeners.size).toBe(0)
  } finally {
    window.matchMedia = previous
  }
})

it.each([
  ["Scatterplot", { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" }],
  [
    "ForceDirectedGraph",
    { edges: [{ source: "A", target: "B" }], iterations: 1 }
  ],
  [
    "ProportionalSymbolMap",
    {
      points: [
        { lon: 0, lat: 0, value: 1 },
        { lon: 10, lat: 10, value: 2 }
      ]
    }
  ],
  ["UnitPileChart", { data: [{ category: "A", value: 1 }] }],
  ["BigNumber", { value: 42 }]
] as const)(
  "%s static rendering includes scoped automatic palettes",
  (component, props) => {
    const { svg } = renderChartWithEvidence(component, {
      ...props,
      theme: { mode: "auto" },
      title: "Measurements"
    })
    expect(svg).toContain("prefers-color-scheme:dark")
    expect(svg).toContain("--semiotic-bg:#1a1a2e")
    expect(svg).toMatch(/(?:data-semiotic-auto|id)="[^"]+"/)
  }
)
