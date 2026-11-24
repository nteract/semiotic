const quantity = { field: "orders", type: "quantitative" } as const
const category = { field: "team", type: "nominal" } as const
const values = [{ team: 1, cohort: "A", state: "open", orders: 3 }, { team: "1", cohort: "A", state: "closed", orders: 2 }]

export const encodingLossExamples = [
  { spec: { mark: "point", data: { values }, encoding: {
    x: quantity, y: quantity, opacity: { value: 0.5, type: "quantitative" }
  } }, path: "/encoding/opacity/type" },
  ...["line", "point", "area"].map(mark => ({
    spec: { mark, data: { values }, encoding: { x: { field: "team" }, y: quantity } }, path: "/encoding/x/type"
  })),
  { spec: { mark: "rect", data: { values }, encoding: { x: category, y: category, color: { field: "orders" } } }, path: "/encoding/color/type" },
  { spec: { mark: "arc", data: { values }, encoding: { theta: { field: "orders" }, color: category } }, path: "/encoding/theta/type" },
  { spec: { mark: "point", data: { values }, encoding: { x: quantity, y: quantity, size: { field: "orders" } } }, path: "/encoding/size/type" },
  { spec: { mark: "area", data: { values }, encoding: { x: { ...quantity, aggregate: "sum" }, y: { ...quantity, stack: null }, color: category } }, path: "/encoding/x/stack" },
  { spec: { mark: "area", data: { values: [{ t: 1, v: 3 }, { t: 1, v: 5 }] },
    encoding: { x: { field: "t", type: "quantitative" }, y: { field: "v", type: "quantitative" } } }, path: "/encoding/y/stack" },
  {
    spec: { mark: "tick", data: { values: [1, 2, 100].map(x => ({ x, y: 4 })) },
      encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" } } },
    path: "/encoding/x/type"
  },
  {
    spec: { mark: "tick", data: { values }, encoding: { x: category, y: { ...category, field: "state", type: "ordinal" } } },
    path: "/encoding/y/type"
  },
  ...["arc", { type: "arc", innerRadius: 45 }].flatMap(mark =>
    [quantity, { ...quantity, aggregate: "sum" }].map(theta => ({
      spec: { mark, data: { values }, encoding: { theta, color: category } },
      path: "/encoding/color/field"
    }))
  ),
  { spec: { mark: "arc", data: { values: [{ team: "A", orders: 2 }, { team: "A", orders: 5 }] },
    encoding: { theta: quantity, color: category } }, path: "/encoding/color/field" },
  ...["x", "y"].map(axis => ({
    spec: { mark: "rect", data: { values: [1, 2, 100].map(value => ({ value, category: "A", price: 4 })) },
      encoding: { [axis]: { field: "value", type: "quantitative" }, [axis === "x" ? "y" : "x"]: { field: "category", type: "nominal" }, color: { field: "price", type: "quantitative" } } },
    path: `/encoding/${axis}/type`
  })),
  ...[true, { maxbins: 7 }].map(bin => ({
    spec: { mark: "bar", data: { values: Array.from({ length: 101 }, (_, value) => ({ value })) },
      encoding: { x: { field: "value", type: "quantitative", bin }, y: { aggregate: "count", type: "quantitative" } } },
    path: "/encoding/x/bin"
  })),
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

export const tickOrientations = (["vertical", "horizontal"] as const).map(orientation => ({
  orientation,
  spec: { mark: "tick", data: { values }, encoding: orientation === "vertical"
    ? { x: category, y: quantity } : { x: quantity, y: category } }
}))


export const normalizedArea = {
  mark: "area",
  data: { values: [1, 2].flatMap(x => [{ x, y: 3, team: "A" }, { x, y: 7, team: "B" }]) },
  encoding: {
    x: { field: "x", type: "quantitative" as const, stack: null },
    y: { field: "y", type: "quantitative" as const, stack: "normalize" },
    color: { field: "team", type: "nominal" as const }
  }
}

export const impliedAggregateAxes = {
  data: { values: [{ team: "01", count: "002" }, { team: "01", count: "003" }, { team: "1", count: 4 }] },
  encoding: {
    x: { field: "count", aggregate: "sum", axis: { title: "Orders" } },
    y: { field: "team", axis: { title: "Team" } }
  }
}

export const flatSeriesCases = [
  { mark: "line", component: "LineChart", grouped: false },
  { mark: "area", component: "AreaChart", grouped: false },
  { mark: "area", component: "StackedAreaChart", grouped: true }
].map(({ mark, component, grouped }) => ({
  component,
  spec: {
    mark,
    data: {
      values: [
        { t: 1, v: 3, group: "A", coordinates: [], coordinates_: [] },
        { t: 2, v: 5, group: "A", coordinates: [{ t: 100, v: 90 }] },
        { t: 3, v: 4, group: "A" }
      ]
    },
    encoding: {
      x: { field: "t", type: "quantitative" as const },
      y: { field: "v", type: "quantitative" as const },
      ...(grouped && { color: { field: "group", type: "nominal" as const } })
    }
  }
}))

export const malformedAggregateFields = [
  { mark: "arc", encoding: { theta: { ...quantity, aggregate: "sum" }, color: { ...category, field: "" } }, path: "/encoding/color/field" },
  { mark: "bar", encoding: { x: { ...category, field: 2 }, y: { ...quantity, aggregate: "sum" } }, path: "/encoding/x/field" },
  { mark: "area", encoding: { x: quantity, y: { ...quantity, field: null, aggregate: "mean" } }, path: "/encoding/y/field" }
].map(({ mark, encoding, path }) => ({ spec: { mark, encoding, data: { values } }, path }))

export const malformedChannelTypes = [
  { channel: "x", type: null },
  { channel: "y", type: false },
  { channel: "color", type: "" },
  { channel: "size", type: 0 },
  { channel: "opacity", type: [] },
  { channel: "theta", type: {} },
  { channel: "x", type: "category" }
].map(({ channel, type }) => ({
  spec: {
    mark: channel === "theta" ? "arc" : "point",
    data: { values: [{ team: "A", orders: 3 }] },
    encoding: {
      ...(channel === "theta" ? { color: category } : { x: quantity, y: quantity }),
      [channel]: channel === "opacity" ? { value: 0.5, type } : {
        ...(channel === "color" ? category : quantity),
        scale: { type: "linear" },
        type
      }
    }
  },
  path: `/encoding/${channel}/type`
}))

export const temporalLossCases = [
  { dates: ["2024", "2025"], index: 0 },
  { dates: [Date.UTC(2024, 0, 1), "2024-01-02"], index: 1 },
  { dates: ["2024-01-01", "invalid"], index: 1 },
  { dates: ["2024-01-01", null], index: 1 }
].map(({ dates, index }) => ({
  spec: {
    mark: "point",
    data: { values: dates.map((date, v) => ({ date, v })) },
    encoding: { x: { field: "date", type: "temporal" }, y: { field: "v", type: "quantitative" } }
  },
  path: `/data/values/${index}/date`
}))

export const areaLabelCases = [null, "zero"].map(stack => ({
  component: stack ? "StackedAreaChart" : "AreaChart",
  spec: {
    mark: "area",
    data: { values: ["__proto__", "constructor", "toString"].flatMap((group, i) => [
      { t: 1, v: 1 + i, group }, { t: 2, v: 4 - i, group }
    ]) },
    encoding: {
      x: { field: "t", type: "quantitative" as const },
      y: { field: "v", type: "quantitative" as const, stack },
      color: { field: "group", type: "nominal" as const }
    }
  }
}))
