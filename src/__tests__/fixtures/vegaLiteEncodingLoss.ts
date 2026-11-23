const quantity = { field: "orders", type: "quantitative" }
const category = { field: "team", type: "nominal" }
const values = [{ team: 1, cohort: "A", state: "open", orders: 3 }, { team: "1", cohort: "A", state: "closed", orders: 2 }]

export const encodingLossExamples = [
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
