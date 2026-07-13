import { describe, expect, it, vi } from "vitest"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import { GeoPipelineStore } from "./GeoPipelineStore"
import { PhysicsPipelineStore } from "./physics/PhysicsPipelineStore"
import type { OrdinalPipelineConfig } from "./ordinalTypes"
import type { NetworkPipelineConfig } from "./networkTypes"
import type { GeoPipelineConfig } from "./geoTypes"
import type { UpdateResult } from "./pipelineUpdateContract"
import { assertUnconsumedSceneRevisionSurvivesLaterUpdate } from "./test-utils/revisionConsumption"

function expectSceneRevisionToSurviveLaterUpdate(
  initial: UpdateResult,
  later: UpdateResult,
) {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
  try {
    const probe = assertUnconsumedSceneRevisionSurvivesLaterUpdate(initial, later)
    probe.diagnostics.afterCompute(probe.later, false, false)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(
      "observed scene-affecting revisions without a scene rebuild",
    ))
  } finally {
    warn.mockRestore()
  }
}

function xyConfig(): PipelineConfig {
  return {
    chartType: "line",
    runtimeMode: "bounded",
    windowSize: 10,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.1,
    xAccessor: "x",
    yAccessor: "y",
  }
}

function ordinalConfig(): OrdinalPipelineConfig {
  return {
    chartType: "bar",
    runtimeMode: "bounded",
    windowSize: 10,
    windowMode: "sliding",
    extentPadding: 0.1,
    projection: "vertical",
    categoryAccessor: "category",
    valueAccessor: "value",
    dataIdAccessor: "id",
  }
}

function networkConfig(): NetworkPipelineConfig {
  return {
    chartType: "sankey",
    nodeIDAccessor: "id",
    sourceAccessor: "source",
    targetAccessor: "target",
    valueAccessor: "value",
  }
}

function geoConfig(): GeoPipelineConfig {
  return {
    projection: "mercator",
    xAccessor: "lon",
    yAccessor: "lat",
  }
}

describe("scene revision consumption contract", () => {
  it("retains XY geometry/domain revisions across a later restyle", () => {
    const store = new PipelineStore(xyConfig())
    const initial = store.ingestWithResult({
      inserts: [{ x: 1, y: 2 }],
      bounded: true,
    })
    store.restyleScene(null)
    expectSceneRevisionToSurviveLaterUpdate(initial, store.getLastUpdateResult())
  })

  it("retains ordinal geometry/domain revisions across a later restyle", () => {
    const store = new OrdinalPipelineStore(ordinalConfig())
    const initial = store.ingestWithResult({
      inserts: [{ id: "a", category: "A", value: 2 }],
      bounded: true,
    })
    store.restyleScene(null)
    expectSceneRevisionToSurviveLaterUpdate(initial, store.getLastUpdateResult())
  })

  it("retains network geometry/domain revisions across a later restyle", () => {
    const store = new NetworkPipelineStore(networkConfig())
    const initial = store.ingestBoundedWithResult(
      [{ id: "a" }, { id: "b" }],
      [{ source: "a", target: "b", value: 1 }],
      [600, 400],
    )
    store.restyleScene(null)
    expectSceneRevisionToSurviveLaterUpdate(initial, store.getLastUpdateResult())
  })

  it("retains geo geometry/domain revisions across a later restyle", () => {
    const store = new GeoPipelineStore(geoConfig())
    const initial = store.setPointsWithResult([{ lon: -122.4, lat: 37.8 }])
    store.restyleScene(null)
    expectSceneRevisionToSurviveLaterUpdate(initial, store.getLastUpdateResult())
  })

  it("retains physics geometry revisions across a later state update", () => {
    const store = new PhysicsPipelineStore({ fixedDt: 0.1 })
    const initial = store.enqueueWithResult({
      id: "body",
      x: 20,
      y: 20,
      mass: 1,
      shape: { type: "circle", radius: 4 },
    })
    store.setPaused(true)
    expectSceneRevisionToSurviveLaterUpdate(initial, store.getLastUpdateResult())
  })
})
