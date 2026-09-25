import type * as React from "react"
import { describe, expect, expectTypeOf, it } from "vitest"
import type * as Realtime from "../../semiotic-realtime"
import type * as RealtimeCore from "../../semiotic-realtime-core"
import type * as Semiotic from "../../semiotic"
import type { ChartAccessor } from "../shared/types"
import type { CoercibleNumber } from "../../stream/accessorUtils"
import { readRealtimeTime } from "./realtimeAccessors"

interface TemporalRow {
  timestamp: Date
  iso: string
  epoch: number
  value: number
}

type ExpectedTimeAccessor = ChartAccessor<TemporalRow, CoercibleNumber> | undefined
type PublicLineProps = Realtime.RealtimeLineChartProps<TemporalRow>

describe("public realtime temporal accessor types", () => {
  it("accepts temporal callbacks on every chart and inherited histogram variant", () => {
    expectTypeOf<PublicLineProps["timeAccessor"]>().toEqualTypeOf<ExpectedTimeAccessor>()
    expectTypeOf<Realtime.RealtimeHistogramProps<TemporalRow>["timeAccessor"]>().toEqualTypeOf<ExpectedTimeAccessor>()
    expectTypeOf<Realtime.TemporalHistogramProps<TemporalRow>["timeAccessor"]>().toEqualTypeOf<ExpectedTimeAccessor>()
    expectTypeOf<Realtime.RealtimeHeatmapProps<TemporalRow>["timeAccessor"]>().toEqualTypeOf<ExpectedTimeAccessor>()
    expectTypeOf<Realtime.RealtimeSwarmChartProps<TemporalRow>["timeAccessor"]>().toEqualTypeOf<ExpectedTimeAccessor>()
    expectTypeOf<Realtime.RealtimeWaterfallChartProps<TemporalRow>["timeAccessor"]>().toEqualTypeOf<ExpectedTimeAccessor>()
    expectTypeOf<RealtimeCore.RealtimeLineChartProps<TemporalRow>["timeAccessor"]>().toEqualTypeOf<ExpectedTimeAccessor>()
    expectTypeOf<React.ComponentProps<typeof Semiotic.RealtimeLineChart<TemporalRow>>["timeAccessor"]>().toEqualTypeOf<ExpectedTimeAccessor>()
    expectTypeOf<React.ComponentProps<typeof Semiotic.RealtimeTemporalHistogram<TemporalRow>>["timeAccessor"]>().toEqualTypeOf<ExpectedTimeAccessor>()
  })

  it("preserves typed field checking and numeric value accessors", () => {
    // @ts-expect-error Temporal callbacks still receive the authored row type.
    const misspelled: PublicLineProps["timeAccessor"] = (row: TemporalRow) => row.timestmp
    // @ts-expect-error Temporal accessors reject arbitrary object return values.
    const invalid: PublicLineProps["timeAccessor"] = () => ({ timestamp: 1 })
    // @ts-expect-error Widening time does not widen numeric value accessors.
    const invalidValue: PublicLineProps["valueAccessor"] = (row: TemporalRow) => row.timestamp
    void misspelled
    void invalid
    void invalidValue
    expectTypeOf<PublicLineProps["valueAccessor"]>().toEqualTypeOf<ChartAccessor<TemporalRow, number> | undefined>()
  })

  it("normalizes public Date, ISO, and numeric callback results without casts", () => {
    const timestamp = new Date("2024-01-01T12:30:00Z")
    const row: TemporalRow = { timestamp, iso: timestamp.toISOString(), epoch: +timestamp, value: 2 }
    const dateAccessor: PublicLineProps["timeAccessor"] = (datum: TemporalRow) => datum.timestamp
    const isoAccessor: PublicLineProps["timeAccessor"] = (datum: TemporalRow) => datum.iso
    const numberAccessor: PublicLineProps["timeAccessor"] = (datum: TemporalRow) => datum.epoch
    expect(readRealtimeTime(row, dateAccessor, "time")).toBe(timestamp)
    expect(readRealtimeTime(row, isoAccessor, "time")).toEqual(timestamp)
    expect(readRealtimeTime(row, numberAccessor, "time")).toBe(+timestamp)
  })
})
