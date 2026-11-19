/**
 * `showCategoryTicks: false` hides the category axis's ticks and labels in
 * static SVG, as it does in the browser, for every ordinal chart with a
 * category axis.
 */
import { describe, expect, it } from "vitest"
import * as server from "../semiotic-server"
import * as edge from "../semiotic-server-edge"

const CATEGORIES = ["Alpha", "Bravo", "Charlie"]
const rows = CATEGORIES.flatMap((category, c) =>
  [0, 1, 2, 3, 4, 5].map((i) => ({ category, value: 5 + c * 3 + i, stack: i % 2 ? "s1" : "s2", lane: `l${i % 2}` }))
)
const base = { data: rows, categoryAccessor: "category", valueAccessor: "value", width: 420, height: 240 }
const likert = CATEGORIES.flatMap((question) => [1, 2, 3, 4, 5, 3, 4].map((score) => ({ question, score })))

const charts: Array<[string, Record<string, unknown>]> = [
  ["BarChart", {}],
  ["BarChart", { orientation: "horizontal" }],
  ["StackedBarChart", { stackBy: "stack" }],
  ["GroupedBarChart", { groupBy: "stack" }],
  ["SwarmPlot", {}],
  ["BoxPlot", {}],
  ["ViolinPlot", {}],
  ["RidgelinePlot", {}],
  ["DotPlot", {}],
  ["SwimlaneChart", { subcategoryAccessor: "lane" }],
  ["LikertChart", { data: likert, categoryAccessor: "question", valueAccessor: "score" }],
]

const textNodes = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((match) => match[1])
/** Short tick marks on either ordinal axis: `y2="5"` below a vertical chart, `x2="-5"` left of a horizontal one. */
const tickMarks = (svg: string) => (svg.match(/<line[^>]*(?:y2="5"|x2="-5")[^>]*>/g) ?? []).length

for (const [entry, renderer] of [
  ["semiotic/server", server],
  ["semiotic/server/edge", edge],
] as const) {
  describe(`${entry} showCategoryTicks`, () => {
    it("drops the Histogram's category tick and its label (the reported case)", () => {
      const data = [12, 18, 22, 25, 25, 31, 34, 40].map((value) => ({ value }))
      const props = { data, valueAccessor: "value", bins: 4, width: 400, height: 200 }
      const shown = renderer.renderChart("Histogram", { ...props, showCategoryTicks: true })
      const hidden = renderer.renderChart("Histogram", { ...props, showCategoryTicks: false })
      expect(textNodes(shown)).toContain("All")
      expect(textNodes(hidden)).not.toContain("All")
      expect(tickMarks(shown) - tickMarks(hidden)).toBe(1)
    })

    it.each(charts)("%s %j hides its category ticks and labels", (component, extra) => {
      const shown = renderer.renderChart(component, { ...base, ...extra, showCategoryTicks: true })
      const hidden = renderer.renderChart(component, { ...base, ...extra, showCategoryTicks: false })
      for (const category of CATEGORIES) {
        expect(textNodes(shown), `${component} shows ${category}`).toContain(category)
        expect(textNodes(hidden), `${component} hides ${category}`).not.toContain(category)
      }
      expect(tickMarks(shown) - tickMarks(hidden)).toBeGreaterThanOrEqual(CATEGORIES.length)
    })

    it("keeps a vertical FunnelChart's step labels, as the browser does", () => {
      const steps = CATEGORIES.map((step, i) => ({ step, value: 100 - i * 30 }))
      const svg = renderer.renderChart("FunnelChart", {
        data: steps, stepAccessor: "step", valueAccessor: "value", orientation: "vertical",
        width: 420, height: 240, showCategoryTicks: false,
      })
      expect(textNodes(svg)).toEqual(expect.arrayContaining(CATEGORIES))
    })
  })
}
