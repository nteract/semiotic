import * as React from "react"
import { describe, expect, it } from "vitest"
import type { Style as RealtimeStyle } from "../../semiotic-realtime"
import type { Datum } from "../shared/datumTypes"
import { RealtimeHeatmap } from "./RealtimeHeatmap"
import { RealtimeHistogram, TemporalHistogram } from "./RealtimeHistogram"
import { RealtimeLineChart } from "./RealtimeLineChart"
import type { RealtimeLineChartHandle } from "./RealtimeLineChart"
import { RealtimeSwarmChart } from "./RealtimeSwarmChart"
import { RealtimeWaterfallChart } from "./RealtimeWaterfallChart"
import type { RealtimePointIdAccessor } from "./realtimeChartTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"

interface TypedRow {
  id: string
  time: number
  value: number
}

const legacyData: Datum[] = [{ legacyId: "old", time: 1, value: 2 }]
const typedData: TypedRow[] = [{ id: "typed", time: 1, value: 2 }]
const legacyIdAccessor = (datum: Datum) => String(datum.legacyId)
type TypedPointIdAccessor = RealtimePointIdAccessor<TypedRow>
const typedIdAccessor: TypedPointIdAccessor = (datum) => datum.id
const realtimeStyle: RealtimeStyle = { cursor: "pointer" }
const legacyLineRef = React.createRef<RealtimeFrameHandle>()
const inferredLineHandleSupportsFlush: React.ElementRef<
  typeof RealtimeLineChart
> extends RealtimeLineChartHandle
  ? true
  : false = true

// @ts-expect-error — the typed callback branch must still catch misspelled fields.
const misspelledIdAccessor: TypedPointIdAccessor = (datum) => datum.identifer

const charts = [
  <RealtimeLineChart<TypedRow>
    key="line"
    ref={legacyLineRef}
    data={legacyData}
    margin={12}
    pointIdAccessor={legacyIdAccessor}
    cursor="pointer"
  />,
  <RealtimeHistogram<TypedRow>
    key="histogram"
    data={legacyData}
    binSize={10}
    pointIdAccessor="legacy-id-field"
    cursor="pointer"
  />,
  <TemporalHistogram<TypedRow>
    key="temporal-histogram"
    data={typedData}
    binSize={10}
    cursor="pointer"
  />,
  <RealtimeHeatmap<TypedRow>
    key="heatmap"
    data={legacyData}
    margin={12}
    pointIdAccessor={legacyIdAccessor}
    cursor="pointer"
  />,
  <RealtimeSwarmChart<TypedRow>
    key="swarm"
    data={legacyData}
    margin={12}
    pointIdAccessor="legacy-id-field"
    cursor="pointer"
  />,
  <RealtimeWaterfallChart<TypedRow>
    key="waterfall"
    data={legacyData}
    margin={12}
    pointIdAccessor={legacyIdAccessor}
    cursor="pointer"
  />
]

describe("realtime type compatibility", () => {
  it("retains published loose inputs alongside typed accessor authoring", () => {
    expect(charts).toHaveLength(6)
    expect(typedIdAccessor({ id: "typed", time: 1, value: 2 })).toBe("typed")
    expect(realtimeStyle.cursor).toBe("pointer")
    expect(inferredLineHandleSupportsFlush).toBe(true)
    expect(misspelledIdAccessor).toBeTypeOf("function")
  })
})
