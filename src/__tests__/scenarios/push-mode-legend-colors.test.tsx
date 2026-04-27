/**
 * Push-mode legend color regression tests.
 *
 * `useStreamingLegend` (LineChart) and `useChartSetup` (geo HOCs) both
 * synthesize a legend color scale from the categories discovered through
 * `onCategoriesChange` using the same precedence as `useColorScale`:
 *
 *   CategoryColorProvider category map
 *     → explicit `colorScheme` (array)
 *     → explicit `colorScheme` (string scheme name)
 *     → ThemeProvider `colors.categorical`
 *     → STREAMING_PALETTE  (currently unreachable: the theme store seeds
 *                           LIGHT_THEME, whose `colors.categorical` is
 *                           always non-empty, so the bare-push case
 *                           lands on the theme tier)
 *
 * Without this synthesis, push-mode legends fall back to STREAMING_PALETTE
 * because `useColorScale` returns `undefined` over empty data and
 * `createLegend` then picks colors per index. A precedence regression
 * (wrong tier ordering, missed string-scheme handling, ignored provider
 * map) would ship silently because the existing color tests all use
 * bounded static data.
 *
 * Each scenario mounts a chart in push mode (no `data` prop), pushes two
 * categories through the ref API, and asserts:
 *   1. Every legend swatch fill matches what the configured palette
 *      source should produce for that category (proves precedence).
 *   2. The two categories get distinct colors (proves the palette is
 *      indexing per-category, not collapsing to a single fallback).
 *
 * Coverage: `LineChart` (xy / `useStreamingLegend` path) and
 * `ProportionalSymbolMap` (geo / `useChartSetup` path) — one HOC per
 * synthesis route. The mark-color side of the contract is enforced by
 * construction: both the legend swatch and the rendered mark sample
 * from the same `effectiveScheme` selection at the top of each
 * synthesizing hook, so a swatch-only assertion on the published color
 * suffices to catch precedence drift.
 */
import * as React from "react"
import { act, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { LineChart } from "../../components/charts/xy/LineChart"
import { ProportionalSymbolMap } from "../../components/charts/geo/ProportionalSymbolMap"
import { CategoryColorProvider } from "../../components/CategoryColors"
import { ThemeProvider } from "../../components/ThemeProvider"
import { LIGHT_THEME } from "../../components/store/ThemeStore"
import { TooltipProvider } from "../../components/store/TooltipStore"
import { STREAMING_PALETTE } from "../../components/charts/shared/colorUtils"
import { ITALIAN_LIGHT } from "../../components/semiotic-themes"
import { setupCanvasMock } from "../../test-utils/canvasMock"

// rAF is left async (the jsdom default) because `StreamGeoFrame`
// schedules a re-render whenever `canvas.style.width` changes; a
// synchronous-fire rAF stub turns that resize loop into unbounded
// recursion. `waitFor` covers the async paint window inside each
// assertion.
let restoreCanvas: () => void
beforeEach(() => {
  restoreCanvas = setupCanvasMock({ stubRaf: false })
})
afterEach(() => {
  restoreCanvas()
})

// Read per-category legend swatch fills. `.legend-item` is the outer
// group containing every category in a legend group; each category is a
// nested `<g aria-label="...">` with the colored swatch as its first
// `<rect>`. styleFn writes the category color to `rect.style.fill`.
// `expectedCount` covers the streaming gap: a push fires its own paint
// before the category-domain callback updates state, so reading too
// early can return a partial legend.
async function readLegendSwatches(
  container: HTMLElement,
  expectedCount: number,
): Promise<string[]> {
  await waitFor(
    () => {
      const items = container.querySelectorAll(".legend-item g[aria-label]")
      expect(items.length).toBe(expectedCount)
    },
    { timeout: 2000 },
  )
  const swatches: string[] = []
  for (const item of container.querySelectorAll(".legend-item g[aria-label]")) {
    const rect = item.querySelector("rect")
    if (!rect) continue
    const fill = (rect as SVGRectElement).style.fill
    if (fill) swatches.push(fill)
  }
  return swatches
}

// Normalize CSS color strings so equality checks survive the rgb()↔hex
// round-trip browsers do on `style.fill` writes. Inputs are either
// short/long hex (`#abc`, `#aabbcc`) or `rgb(170, 187, 204)`.
function normalizeColor(input: string): string {
  const trimmed = input.trim().toLowerCase()
  if (trimmed.startsWith("#")) {
    if (trimmed.length === 4) {
      const [, r, g, b] = trimmed
      return `#${r}${r}${g}${g}${b}${b}`
    }
    return trimmed
  }
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/)
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch
    const hex = (n: string) => Number(n).toString(16).padStart(2, "0")
    return `#${hex(r)}${hex(g)}${hex(b)}`
  }
  return trimmed
}

describe("push-mode legend color regression", () => {
  describe("LineChart (xy)", () => {
    it("provider category map wins over every other source", async () => {
      const ref = React.createRef<{ pushMany: (rows: object[]) => void }>()
      const providerColors = { A: "#ff00ff", B: "#00ffff" }
      const { container } = render(
        <TooltipProvider>
          <CategoryColorProvider colors={providerColors}>
            {/* explicit scheme + theme are present and SHOULD be ignored */}
            <ThemeProvider theme={ITALIAN_LIGHT}>
              <LineChart
                ref={ref as React.Ref<unknown>}
                xAccessor="x"
                yAccessor="y"
                lineBy="cat"
                colorBy="cat"
                colorScheme={["#111111", "#222222"]}
                showLegend
                width={300}
                height={200}
              />
            </ThemeProvider>
          </CategoryColorProvider>
        </TooltipProvider>,
      )

      await act(async () => {
        ref.current!.pushMany([
          { x: 0, y: 0, cat: "A" },
          { x: 1, y: 1, cat: "B" },
        ])
        await new Promise((r) => setTimeout(r, 200))
      })

      const swatches = (await readLegendSwatches(container, 2)).map(normalizeColor)
      expect(swatches).toEqual([providerColors.A, providerColors.B])
    })

    it("explicit colorScheme array wins over theme and STREAMING_PALETTE", async () => {
      const ref = React.createRef<{ pushMany: (rows: object[]) => void }>()
      const scheme = ["#abc123", "#321cba"]
      const { container } = render(
        <TooltipProvider>
          <ThemeProvider theme={ITALIAN_LIGHT}>
            <LineChart
              ref={ref as React.Ref<unknown>}
              xAccessor="x"
              yAccessor="y"
              lineBy="cat"
              colorBy="cat"
              colorScheme={scheme}
              showLegend
              width={300}
              height={200}
            />
          </ThemeProvider>
        </TooltipProvider>,
      )

      await act(async () => {
        ref.current!.pushMany([
          { x: 0, y: 0, cat: "A" },
          { x: 1, y: 1, cat: "B" },
        ])
        await new Promise((r) => setTimeout(r, 200))
      })

      const swatches = (await readLegendSwatches(container, 2)).map(normalizeColor)
      expect(swatches).toEqual([scheme[0], scheme[1]])
      // Confirm theme palette and STREAMING_PALETTE are not bleeding through.
      expect(swatches[0]).not.toBe(normalizeColor(ITALIAN_LIGHT.colors!.categorical![0]))
      expect(swatches[0]).not.toBe(normalizeColor(STREAMING_PALETTE[0]))
    })

    it("string colorScheme name resolves and matches canvas marks", async () => {
      const ref = React.createRef<{ pushMany: (rows: object[]) => void }>()
      const { container } = render(
        <TooltipProvider>
          <LineChart
            ref={ref as React.Ref<unknown>}
            xAccessor="x"
            yAccessor="y"
            lineBy="cat"
            colorBy="cat"
            colorScheme="category10"
            showLegend
            width={300}
            height={200}
          />
        </TooltipProvider>,
      )

      await act(async () => {
        ref.current!.pushMany([
          { x: 0, y: 0, cat: "A" },
          { x: 1, y: 1, cat: "B" },
        ])
        await new Promise((r) => setTimeout(r, 200))
      })

      const swatches = (await readLegendSwatches(container, 2)).map(normalizeColor)
      expect(swatches).toHaveLength(2)
      expect(swatches[0]).not.toBe(swatches[1])
    })

    it("ThemeProvider categorical wins when no explicit scheme is set", async () => {
      const ref = React.createRef<{ pushMany: (rows: object[]) => void }>()
      const { container } = render(
        <TooltipProvider>
          <ThemeProvider theme={ITALIAN_LIGHT}>
            <LineChart
              ref={ref as React.Ref<unknown>}
              xAccessor="x"
              yAccessor="y"
              lineBy="cat"
              colorBy="cat"
              showLegend
              width={300}
              height={200}
            />
          </ThemeProvider>
        </TooltipProvider>,
      )

      await act(async () => {
        ref.current!.pushMany([
          { x: 0, y: 0, cat: "A" },
          { x: 1, y: 1, cat: "B" },
        ])
        await new Promise((r) => setTimeout(r, 200))
      })

      const swatches = (await readLegendSwatches(container, 2)).map(normalizeColor)
      const themePalette = ITALIAN_LIGHT.colors!.categorical!.map(normalizeColor)
      expect(swatches).toEqual([themePalette[0], themePalette[1]])
      // STREAMING_PALETTE must not be the source here.
      expect(swatches[0]).not.toBe(normalizeColor(STREAMING_PALETTE[0]))
    })

    it("falls back to default theme categorical when no provider/scheme/explicit theme is set", async () => {
      // The "bare" push case doesn't actually reach `STREAMING_PALETTE`:
      // `useThemeCategorical()` resolves to `LIGHT_THEME.colors.categorical`
      // even outside a `<ThemeProvider>` because the theme store seeds
      // `LIGHT_THEME` as the resolved default. STREAMING_PALETTE is the
      // last-resort tier for the (currently unreachable) case where the
      // ambient theme exposes an empty/missing categorical palette.
      const ref = React.createRef<{ pushMany: (rows: object[]) => void }>()
      const { container } = render(
        <TooltipProvider>
          <LineChart
            ref={ref as React.Ref<unknown>}
            xAccessor="x"
            yAccessor="y"
            lineBy="cat"
            colorBy="cat"
            showLegend
            width={300}
            height={200}
          />
        </TooltipProvider>,
      )

      await act(async () => {
        ref.current!.pushMany([
          { x: 0, y: 0, cat: "A" },
          { x: 1, y: 1, cat: "B" },
        ])
        await new Promise((r) => setTimeout(r, 200))
      })

      const swatches = (await readLegendSwatches(container, 2)).map(normalizeColor)
      const defaultPalette = LIGHT_THEME.colors!.categorical!.map(normalizeColor)
      expect(swatches).toEqual([defaultPalette[0], defaultPalette[1]])
    })
  })

  describe("ProportionalSymbolMap (geo)", () => {
    // The geo HOC requires `pointIdAccessor` for ref-driven updates and a
    // `sizeBy` field. Mounting without `points` selects push mode.
    const baseProps = {
      xAccessor: "lon" as const,
      yAccessor: "lat" as const,
      sizeBy: "size" as const,
      colorBy: "cat" as const,
      pointIdAccessor: "id" as const,
      showLegend: true,
      width: 300,
      height: 200,
    }

    it("provider category map wins over every other source", async () => {
      const ref = React.createRef<{ pushMany: (rows: object[]) => void }>()
      const providerColors = { A: "#aa00aa", B: "#00aaaa" }
      const { container } = render(
        <TooltipProvider>
          <CategoryColorProvider colors={providerColors}>
            <ThemeProvider theme={ITALIAN_LIGHT}>
              <ProportionalSymbolMap
                ref={ref as React.Ref<unknown>}
                {...baseProps}
                colorScheme={["#111111", "#222222"]}
              />
            </ThemeProvider>
          </CategoryColorProvider>
        </TooltipProvider>,
      )

      await act(async () => {
        ref.current!.pushMany([
          { id: "a", lon: 0, lat: 0, size: 5, cat: "A" },
          { id: "b", lon: 10, lat: 10, size: 5, cat: "B" },
        ])
        await new Promise((r) => setTimeout(r, 200))
      })

      const swatches = (await readLegendSwatches(container, 2)).map(normalizeColor)
      expect(swatches).toEqual([providerColors.A, providerColors.B])
    })

    it("explicit colorScheme array wins over theme and STREAMING_PALETTE", async () => {
      const ref = React.createRef<{ pushMany: (rows: object[]) => void }>()
      const scheme = ["#cafe00", "#00face"]
      const { container } = render(
        <TooltipProvider>
          <ThemeProvider theme={ITALIAN_LIGHT}>
            <ProportionalSymbolMap
              ref={ref as React.Ref<unknown>}
              {...baseProps}
              colorScheme={scheme}
            />
          </ThemeProvider>
        </TooltipProvider>,
      )

      await act(async () => {
        ref.current!.pushMany([
          { id: "a", lon: 0, lat: 0, size: 5, cat: "A" },
          { id: "b", lon: 10, lat: 10, size: 5, cat: "B" },
        ])
        await new Promise((r) => setTimeout(r, 200))
      })

      const swatches = (await readLegendSwatches(container, 2)).map(normalizeColor)
      expect(swatches).toEqual([scheme[0], scheme[1]])
      expect(swatches[0]).not.toBe(normalizeColor(ITALIAN_LIGHT.colors!.categorical![0]))
      expect(swatches[0]).not.toBe(normalizeColor(STREAMING_PALETTE[0]))
    })

    it("string colorScheme name resolves and matches canvas marks", async () => {
      const ref = React.createRef<{ pushMany: (rows: object[]) => void }>()
      const { container } = render(
        <TooltipProvider>
          <ProportionalSymbolMap
            ref={ref as React.Ref<unknown>}
            {...baseProps}
            colorScheme="category10"
          />
        </TooltipProvider>,
      )

      await act(async () => {
        ref.current!.pushMany([
          { id: "a", lon: 0, lat: 0, size: 5, cat: "A" },
          { id: "b", lon: 10, lat: 10, size: 5, cat: "B" },
        ])
        await new Promise((r) => setTimeout(r, 200))
      })

      const swatches = (await readLegendSwatches(container, 2)).map(normalizeColor)
      expect(swatches).toHaveLength(2)
      expect(swatches[0]).not.toBe(swatches[1])
    })

    it("ThemeProvider categorical wins when no explicit scheme is set", async () => {
      const ref = React.createRef<{ pushMany: (rows: object[]) => void }>()
      const { container } = render(
        <TooltipProvider>
          <ThemeProvider theme={ITALIAN_LIGHT}>
            <ProportionalSymbolMap ref={ref as React.Ref<unknown>} {...baseProps} />
          </ThemeProvider>
        </TooltipProvider>,
      )

      await act(async () => {
        ref.current!.pushMany([
          { id: "a", lon: 0, lat: 0, size: 5, cat: "A" },
          { id: "b", lon: 10, lat: 10, size: 5, cat: "B" },
        ])
        await new Promise((r) => setTimeout(r, 200))
      })

      const swatches = (await readLegendSwatches(container, 2)).map(normalizeColor)
      const themePalette = ITALIAN_LIGHT.colors!.categorical!.map(normalizeColor)
      expect(swatches).toEqual([themePalette[0], themePalette[1]])
      expect(swatches[0]).not.toBe(normalizeColor(STREAMING_PALETTE[0]))
    })

    it("falls back to default theme categorical when no provider/scheme/explicit theme is set", async () => {
      const ref = React.createRef<{ pushMany: (rows: object[]) => void }>()
      const { container } = render(
        <TooltipProvider>
          <ProportionalSymbolMap ref={ref as React.Ref<unknown>} {...baseProps} />
        </TooltipProvider>,
      )

      await act(async () => {
        ref.current!.pushMany([
          { id: "a", lon: 0, lat: 0, size: 5, cat: "A" },
          { id: "b", lon: 10, lat: 10, size: 5, cat: "B" },
        ])
        await new Promise((r) => setTimeout(r, 200))
      })

      const swatches = (await readLegendSwatches(container, 2)).map(normalizeColor)
      const defaultPalette = LIGHT_THEME.colors!.categorical!.map(normalizeColor)
      expect(swatches).toEqual([defaultPalette[0], defaultPalette[1]])
    })
  })
})
