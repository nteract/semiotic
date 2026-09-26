import "../../test-utils/registerBuiltInXYPlugins"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"

describe("empty temporal domains", () => {
  afterEach(() => vi.restoreAllMocks())

  it.each(["bounded", "streaming"] as const)(
    "%s domains depend on data and extents, not the wall clock",
    (runtimeMode) => {
      const now = vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2025, 0, 1))
      const config: PipelineConfig = {
        chartType: "scatter",
        runtimeMode,
        windowSize: 200,
        windowMode: "growing",
        arrowOfTime: "right",
        extentPadding: 0.1,
        xScaleType: "time",
        xAccessor: "time",
        timeAccessor: "time",
        yAccessor: "value",
        valueAccessor: "value"
      }
      const first = new PipelineStore(config)
      first.computeScene({ width: 500, height: 300 })
      now.mockReturnValue(Date.UTC(2026, 8, 25))
      const second = new PipelineStore(config)
      second.computeScene({ width: 500, height: 300 })
      const domain = (store: PipelineStore) =>
        store.scales!.x.domain().map(Number)
      expect(domain(first)).toEqual([0, 86400000])
      expect(domain(second)).toEqual(domain(first))

      const data = [
        { time: Date.UTC(2024, 0, 1), value: 1 },
        { time: Date.UTC(2024, 0, 2), value: 2 }
      ]
      second.ingest({ inserts: data, bounded: runtimeMode === "bounded" })
      second.computeScene({ width: 500, height: 300 })
      expect(domain(second)).toEqual(data.map((row) => row.time))
      expect(second.scene).toHaveLength(2)

      const pinned = new PipelineStore({
        ...config,
        xExtent: [data[0].time, data[1].time]
      })
      pinned.computeScene({ width: 500, height: 300 })
      expect(domain(pinned)).toEqual(data.map((row) => row.time))
    }
  )
})
