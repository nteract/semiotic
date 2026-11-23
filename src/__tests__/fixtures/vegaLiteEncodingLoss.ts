const quantity = { field: "orders", type: "quantitative" }
const category = { field: "team", type: "nominal" }
const values = [{ team: 1, cohort: "A", state: "open", orders: 3 }, { team: "1", cohort: "A", state: "closed", orders: 2 }]

export const encodingLossExamples = [
  { spec: { mark: "bar", data: { values: [{ x: 1, y: 2 }, { x: 100, y: 3 }] }, encoding: {
    x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" }
  } }, path: "/encoding/x/type" },
  ...["arc", { type: "arc", innerRadius: 60 }].map(mark => ({
    spec: { mark, data: { values }, encoding: { theta: quantity } }, path: "/encoding/color"
  })),
  { spec: { mark: "arc", data: { values }, encoding: { color: category } }, path: "/encoding/theta" },
  { spec: { mark: "rect", data: { values }, encoding: { x: category, y: category } }, path: "/encoding/color" },
  ...["x", "y"].map(axis => ({
    spec: { mark: "bar", data: { values: Array.from({ length: 11 }, (_, i) => ({
      orders: 3, team: i ? "East" : "West"
    })) }, encoding: { [axis]: { ...quantity, bin: true }, [axis === "x" ? "y" : "x"]: { aggregate: "count", type: "quantitative" }, color: category } },
    path: "/encoding/color"
  })),
  ...["point", "line", "area"].map(mark => ({
    spec: { mark, data: { values: [{ x: 1, y: 2, date: "2025-01-01" }] }, encoding: {
      x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" }, color: { field: "date", type: "temporal" }
    } }, path: "/encoding/color/type"
  })),
  ...["point", "circle", "square", "bar", "tick"].flatMap(mark =>
    ["x", "y"].map(axis => ({
      spec: { mark, data: { values }, encoding: { [axis === "x" ? "y" : "x"]: quantity } },
      path: `/encoding/${axis}`
    }))
  ),
  { spec: { mark: "bar", data: { values: [{ x: 7, y: 2 }, { x: 7, y: 3 }] }, encoding: {
    x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" }
  } }, path: "/encoding/y" },
  ...["nominal", "ordinal"].map(type => ({
    spec: { mark: "rect", data: { values }, encoding: {
      x: category, y: category, color: { field: "state", type }
    } },
    path: "/encoding/color/type"
  })),
  { spec: { mark: "bar", data: { values }, encoding: { x: category, y: quantity } }, path: "/encoding/y" },
  { spec: { mark: "bar", data: { values }, encoding: {
    y: { field: "cohort", type: "nominal" }, x: { ...quantity, aggregate: "sum" }, color: category
  } }, path: "/encoding/x" }
]

export const translucentBubbles = {
  mark: "point" as const,
  data: { values },
  encoding: { x: quantity, y: quantity, size: quantity, opacity: { value: 0.25 } }
}
