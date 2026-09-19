import React from "react"
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CategoryColorProvider } from "../../CategoryColors"
import { LinkedCharts } from "../../LinkedCharts"
import { LIGHT_THEME, ThemeProvider } from "../../ThemeProvider"
import { useNetworkChartSetup } from "./useNetworkChartSetup"
import type { NetworkChartSetupResult } from "./useNetworkChartSetup"
import { COLOR_SCHEMES } from "./colorUtils"

const baseInput = {
  nodes: undefined,
  edges: undefined,
  inferNodes: false,
  colorBy: "category",
  showLegend: true,
  marginDefaults: { top: 20, bottom: 20, left: 20, right: 20 },
  width: 400,
  height: 300,
  chartType: "ForceDirectedGraph"
}
const palette = ["#FF0000", "#0000FF"]
const objectMap = { beta: palette[1], alpha: palette[0] }
const themePalette = ["#112233", "#445566"]
const schemes: Array<{
  name: string
  colorScheme?: string | string[] | Record<string, string>
  expectedBeta: string
}> = [
  { name: "array", colorScheme: palette, expectedBeta: palette[1] },
  { name: "object map", colorScheme: objectMap, expectedBeta: palette[1] },
  {
    name: "named",
    colorScheme: "set3",
    expectedBeta: (COLOR_SCHEMES.set3 as readonly string[])[1]
  },
  { name: "theme", expectedBeta: themePalette[1] }
]

function discover(setup: NetworkChartSetupResult, categories: string[]) {
  const onCategoriesChange = setup.legendBehaviorProps.onCategoriesChange as (
    categories: string[]
  ) => void
  expect(onCategoriesChange).toEqual(expect.any(Function))
  act(() => onCategoriesChange(categories))
}

describe.each([false, true])(
  "network push color precedence (linked=%s)",
  (linked) => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider
        theme={{
          ...LIGHT_THEME,
          colors: { ...LIGHT_THEME.colors, categorical: themePalette }
        }}
      >
        <CategoryColorProvider colors={{ alpha: "#00FF00" }}>
          {linked ? <LinkedCharts>{children}</LinkedCharts> : children}
        </CategoryColorProvider>
      </ThemeProvider>
    )

    it.each(schemes)(
      "rebuilds the $name fallback from discovered categories",
      ({ colorScheme, expectedBeta }) => {
        const { result } = renderHook(
          () => useNetworkChartSetup({ ...baseInput, colorScheme }),
          { wrapper }
        )
        expect(result.current.colorScale?.("alpha")).toBe("#00FF00")
        discover(result.current, ["alpha", "beta"])
        expect(result.current.colorScale?.("alpha")).toBe("#00FF00")
        expect(result.current.colorScale?.("beta")).toBe(expectedBeta)
        expect(result.current.legend).toMatchObject({
          legendGroups: [
            {
              items: [
                { label: "alpha", color: "#00FF00" },
                { label: "beta", color: expectedBeta }
              ]
            }
          ]
        })
      }
    )

    it("applies a function accessor and palette updates to the discovered domain", () => {
      const { result, rerender } = renderHook(
        ({ colorScheme }) =>
          useNetworkChartSetup({
            ...baseInput,
            colorBy: (node) => String(node.category),
            colorScheme
          }),
        { wrapper, initialProps: { colorScheme: palette } }
      )
      discover(result.current, ["alpha", "beta"])
      expect(result.current.colorScale?.("beta")).toBe(palette[1])
      rerender({ colorScheme: ["#ABCDEF", "#FEDCBA"] })
      expect(result.current.colorScale?.("alpha")).toBe("#00FF00")
      expect(result.current.colorScale?.("beta")).toBe("#FEDCBA")
    })
  }
)

it("keeps exact map assignments independent of map insertion order without a provider", () => {
  const { result } = renderHook(() =>
    useNetworkChartSetup({
      ...baseInput,
      colorScheme: objectMap
    })
  )
  discover(result.current, ["alpha", "beta"])
  expect(result.current.colorScale?.("alpha")).toBe(palette[0])
  expect(result.current.colorScale?.("beta")).toBe(palette[1])
})
