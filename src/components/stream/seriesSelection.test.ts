import "../../test-utils/registerBuiltInXYPlugins"
import { expect, it } from "vitest"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"
import { buildPredicate } from "../store/SelectionStore"
import { wrapStyleWithSelection } from "../charts/shared/selectionUtils"

const rows = [
  { x: 1, y: 4, group: "A", low: 3, high: 5 },
  { x: 2, y: 6, group: "A", low: 5, high: 7 },
  { x: 1, y: 7, group: "B", low: 6, high: 8 },
  { x: 2, y: 3, group: "B", low: 2, high: 4 }
]
const predicate = buildPredicate({
  name: "bin",
  resolution: "intersect",
  clauses: new Map([
    [
      "source",
      {
        clientId: "source",
        type: "point",
        fields: {
          x: { type: "point", values: new Set([2]) },
          group: { type: "point", values: new Set(["A"]) }
        }
      }
    ]
  ])
})
const style = wrapStyleWithSelection(
  () => ({ stroke: "blue", fill: "blue" }),
  { isActive: true, predicate },
  { unselectedOpacity: 0.1 }
)

it.each([
  "line",
  "area",
  "stackedarea",
  "mixed"
] as PipelineConfig["chartType"][])(
  "%s selects a whole series through a matching non-first observation",
  (chartType) => {
    const store = new PipelineStore({
      chartType,
      runtimeMode: "bounded",
      windowSize: 20,
      windowMode: "growing",
      arrowOfTime: "right",
      extentPadding: 0,
      groupAccessor: "group",
      xAccessor: "x",
      yAccessor: "y",
      lineStyle: style,
      areaStyle: style,
      areaGroups: new Set(["A"]),
      pointStyle: style,
      ...(chartType === "line" && {
        band: { y0Accessor: "low", y1Accessor: "high" }
      })
    })
    store.ingest({ inserts: rows, bounded: true })
    store.computeScene({ width: 300, height: 200 })
    const series = store.scene.filter((node) =>
      chartType === "line"
        ? node.type === "line"
        : node.type === "line" || node.type === "area"
    )
    expect(series).toHaveLength(2)
    expect(
      series.find((node) => "group" in node && node.group === "A")!.style
        ?.opacity
    ).toBeUndefined()
    expect(
      series.find((node) => "group" in node && node.group === "B")!.style
        ?.opacity
    ).toBe(0.1)
    const points = store.scene.filter((node) => node.type === "point")
    expect(points.filter((node) => node.style.opacity !== 0.1)).toHaveLength(1)
  }
)
