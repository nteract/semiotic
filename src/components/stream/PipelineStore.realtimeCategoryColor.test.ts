import "../../test-utils/registerBuiltInXYPlugins"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"

const palette = ["#112233", "#445566"]

function stableResolver() {
  const indexes = new Map<string, number>()
  return (category: string) => {
    let index = indexes.get(category)
    if (index === undefined) {
      index = indexes.size
      indexes.set(category, index)
    }
    return palette[index % palette.length]
  }
}

function config(chartType: "bar" | "swarm"): PipelineConfig {
  const resolveColor = stableResolver()
  return {
    chartType,
    runtimeMode: "streaming",
    windowSize: 3,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.1,
    timeAccessor: "time",
    valueAccessor: "value",
    categoryAccessor: "category",
    ...(chartType === "bar"
      ? {
          binSize: 10,
          areaStyle: (datum) => ({
            fill: resolveColor(String(datum.category))
          })
        }
      : {
          pointStyle: (datum) => ({
            fill: resolveColor(String(datum.category))
          })
        })
  }
}

function categoryFills(store: PipelineStore): Record<string, string> {
  return Object.fromEntries(
    store.scene
      .filter((node) => node.type === "point" || node.type === "rect")
      .map((node) => [String(node.datum?.category), node.style.fill])
  ) as Record<string, string>
}

describe.each(["bar", "swarm"] as const)(
  "PipelineStore realtime %s category colors",
  (chartType) => {
    it("uses the lazy resolver on the first scene and keeps assignments after eviction", () => {
      const store = new PipelineStore(config(chartType))
      store.ingest({
        inserts: [
          { time: 1, value: 2, category: "alpha" },
          { time: 2, value: 3, category: "beta" },
          { time: 3, value: 4, category: "alpha" }
        ],
        bounded: false
      })
      store.computeScene({ width: 400, height: 300 })
      const first = categoryFills(store)
      expect(first).toMatchObject({ alpha: palette[0], beta: palette[1] })

      store.ingest({
        inserts: [{ time: 4, value: 5, category: "beta" }],
        bounded: false
      })
      store.computeScene({ width: 400, height: 300 })
      expect(categoryFills(store)).toMatchObject(first)
    })
  }
)
