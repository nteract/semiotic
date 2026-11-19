/**
 * `showCategoryTicks: false` hides the category axis's tick labels on every
 * ordinal chart with a category axis, as its margin already assumes.
 */
import React from "react"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import * as ordinal from "../../semiotic-ordinal"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

const CATEGORIES = ["Alpha", "Bravo", "Charlie"]
const rows = CATEGORIES.flatMap((category, c) =>
  [0, 1, 2, 3, 4, 5].map((i) => ({ category, value: 5 + c * 3 + i, stack: i % 2 ? "s1" : "s2", lane: `l${i % 2}` }))
)
const likert = CATEGORIES.flatMap((question) => [1, 2, 3, 4, 5, 3, 4].map((score) => ({ question, score })))

const charts: Array<[string, Record<string, unknown>]> = [
  ["BarChart", {}],
  ["StackedBarChart", { stackBy: "stack" }],
  ["GroupedBarChart", { groupBy: "stack" }],
  ["Histogram", {}],
  ["SwarmPlot", {}],
  ["BoxPlot", {}],
  ["ViolinPlot", {}],
  ["RidgelinePlot", {}],
  ["DotPlot", {}],
  ["SwimlaneChart", { subcategoryAccessor: "lane" }],
  ["LikertChart", { data: likert, categoryAccessor: "question", valueAccessor: "score" }],
]

describe("showCategoryTicks in the browser", () => {
  let restore: () => void
  beforeEach(() => { restore = setupCanvasMock() })
  afterEach(() => restore())

  it.each(charts)("%s hides its category labels", async (name, extra) => {
    const Chart = (ordinal as unknown as Record<string, React.ComponentType<Record<string, unknown>>>)[name]
    const labelsShown = async (showCategoryTicks: boolean) => {
      const view = render(
        <TooltipProvider>
          <Chart data={rows} categoryAccessor="category" valueAccessor="value" width={420} height={240}
            showCategoryTicks={showCategoryTicks} {...extra} />
        </TooltipProvider>
      )
      await act(async () => { await Promise.resolve() })
      const texts = [...view.container.querySelectorAll("text, foreignObject")].map((node) => node.textContent)
      view.unmount()
      return CATEGORIES.filter((category) => texts.includes(category))
    }
    expect(await labelsShown(true)).toEqual(CATEGORIES)
    expect(await labelsShown(false)).toEqual([])
  })
})
