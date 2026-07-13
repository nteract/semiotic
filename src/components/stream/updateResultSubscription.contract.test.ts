import { describe, expect, it } from "vitest"
import { GeoPipelineStore } from "./GeoPipelineStore"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { PipelineStore } from "./PipelineStore"
import type { UpdateResult, UpdateResultStore } from "./pipelineUpdateContract"
import { PhysicsPipelineStore } from "./physics/PhysicsPipelineStore"

function expectUpdateSubscription(
  store: UpdateResultStore,
  update: () => UpdateResult
): void {
  const observed: UpdateResult[] = []
  const unsubscribe = store.subscribeUpdateResult(() => {
    observed.push(store.getUpdateSnapshot())
  })

  const first = update()
  expect(observed[observed.length - 1]).toBe(first)
  expect(store.getUpdateSnapshot()).toBe(first)

  const observedCount = observed.length
  unsubscribe()
  update()
  expect(observed).toHaveLength(observedCount)
}

describe("UpdateResultStore subscription contract", () => {
  it("publishes updates from every pipeline family", () => {
    const xy = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 10,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0.1,
      xAccessor: "x",
      yAccessor: "y"
    })
    expectUpdateSubscription(xy, () =>
      xy.ingestWithResult({
        bounded: true,
        inserts: [{ id: "xy-1", x: 1, y: 2 }]
      })
    )

    const ordinal = new OrdinalPipelineStore({
      chartType: "bar",
      runtimeMode: "bounded",
      windowSize: 10,
      windowMode: "sliding",
      extentPadding: 0.1,
      projection: "vertical",
      categoryAccessor: "category",
      valueAccessor: "value",
      dataIdAccessor: "id"
    })
    expectUpdateSubscription(ordinal, () =>
      ordinal.ingestWithResult({
        bounded: true,
        inserts: [{ id: "ordinal-1", category: "A", value: 2 }]
      })
    )

    const network = new NetworkPipelineStore({
      chartType: "sankey",
      nodeIDAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      valueAccessor: "value"
    })
    expectUpdateSubscription(network, () =>
      network.ingestBoundedWithResult(
        [{ id: "source" }, { id: "target" }],
        [{ id: "edge", source: "source", target: "target", value: 1 }],
        [320, 240]
      )
    )

    const geo = new GeoPipelineStore({
      projection: "mercator",
      xAccessor: "lon",
      yAccessor: "lat"
    })
    expectUpdateSubscription(geo, () =>
      geo.setPointsWithResult([{ id: "place", lon: -122.4, lat: 37.8 }])
    )

    const physics = new PhysicsPipelineStore({ fixedDt: 0.1 })
    expectUpdateSubscription(physics, () =>
      physics.updateConfigWithResult({ bodyLimit: 12 })
    )
  })
})
