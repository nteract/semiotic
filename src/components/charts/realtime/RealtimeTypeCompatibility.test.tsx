import * as React from "react"
import { describe, expect, it } from "vitest"
import type {
  RealtimeFrameHandle,
  Style as RealtimeStyle
} from "../../semiotic-realtime"
import type { Datum } from "../shared/datumTypes"
import { RealtimeHeatmap } from "./RealtimeHeatmap"
import { RealtimeHistogram, TemporalHistogram } from "./RealtimeHistogram"
import { RealtimeLineChart } from "./RealtimeLineChart"
import type { RealtimeLineChartHandle } from "./RealtimeLineChart"
import { RealtimeSwarmChart } from "./RealtimeSwarmChart"
import { RealtimeWaterfallChart } from "./RealtimeWaterfallChart"
import type { RealtimePointIdAccessor } from "./realtimeChartTypes"
import type { AggregatedRealtimeDatum } from "./aggregate"

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
const typedLineRef = React.createRef<RealtimeLineChartHandle<TypedRow>>()
const aggregateLineRef = React.createRef<
  RealtimeLineChartHandle<TypedRow, AggregatedRealtimeDatum>
>()
const typedHistogramRef = React.createRef<RealtimeFrameHandle<TypedRow>>()
const typedHeatmapRef = React.createRef<RealtimeFrameHandle<TypedRow>>()
const typedSwarmRef = React.createRef<RealtimeFrameHandle<TypedRow>>()
const typedWaterfallRef = React.createRef<RealtimeFrameHandle<TypedRow>>()
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

const typedHandleCharts = [
  <RealtimeLineChart<TypedRow> key="typed-line" ref={typedLineRef} />,
  <RealtimeLineChart<TypedRow>
    key="aggregate-line"
    ref={aggregateLineRef}
    aggregate={{ size: 10, stat: "mean" }}
  />,
  <RealtimeHistogram<TypedRow>
    key="typed-histogram"
    ref={typedHistogramRef}
    binSize={10}
  />,
  <RealtimeHeatmap<TypedRow> key="typed-heatmap" ref={typedHeatmapRef} />,
  <RealtimeSwarmChart<TypedRow> key="typed-swarm" ref={typedSwarmRef} />,
  <RealtimeWaterfallChart<TypedRow>
    key="typed-waterfall"
    ref={typedWaterfallRef}
  />
]

function assertTypedHandle(handle: RealtimeFrameHandle<TypedRow>) {
  handle.push({ id: "one", time: 1, value: 2 })
  handle.pushMany([{ id: "two", time: 2, value: 3 }])
  const rows: TypedRow[] = handle.getData()
  const removed: TypedRow[] = handle.remove("one")
  const updated: TypedRow[] = handle.update("two", (row) => ({
    ...row,
    value: row.value + 1
  }))
  // @ts-expect-error — typed handles reject rows missing the authored id field.
  handle.push({ time: 3, value: 4 })
  return { rows, removed, updated }
}

function assertAggregateHandle(
  handle: RealtimeLineChartHandle<TypedRow, AggregatedRealtimeDatum>
) {
  handle.push({ id: "source", time: 1, value: 2 })
  const rows: AggregatedRealtimeDatum[] = handle.getData()
  return rows[0]?.__aggStart
}

describe("realtime type compatibility", () => {
  it("retains published loose inputs alongside typed accessor authoring", () => {
    expect(charts).toHaveLength(6)
    expect(typedHandleCharts).toHaveLength(6)
    expect(typedIdAccessor({ id: "typed", time: 1, value: 2 })).toBe("typed")
    expect(realtimeStyle.cursor).toBe("pointer")
    expect(inferredLineHandleSupportsFlush).toBe(true)
    expect(misspelledIdAccessor).toBeTypeOf("function")
    expect(assertTypedHandle).toBeTypeOf("function")
    expect(assertAggregateHandle).toBeTypeOf("function")
  })
})
