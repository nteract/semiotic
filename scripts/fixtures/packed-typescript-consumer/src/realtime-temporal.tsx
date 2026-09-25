import {
  RealtimeHeatmap,
  RealtimeHistogram,
  RealtimeLineChart,
  RealtimeSwarmChart,
  RealtimeWaterfallChart,
  TemporalHistogram,
  type RealtimeLineChartProps
} from "semiotic/realtime"
import {
  RealtimeLineChart as CoreLineChart,
  TemporalHistogram as CoreTemporalHistogram
} from "semiotic/realtime/core"
import {
  RealtimeLineChart as RootLineChart,
  RealtimeTemporalHistogram as LegacyHistogram,
  TemporalHistogram as RootTemporalHistogram
} from "semiotic"

interface TemporalRow {
  date: Date
  iso: string
  epoch: number
  value: number
}

const date = new Date("2024-01-01T12:30:00Z")
const data: TemporalRow[] = [{ date, iso: date.toISOString(), epoch: +date, value: 2 }]

function temporalCharts(timeAccessor: (row: TemporalRow) => number | Date | string) {
  const props = { data, timeAccessor, valueAccessor: (row: TemporalRow) => row.value }
  return [
    <RealtimeLineChart<TemporalRow> key="line" {...props} />,
    <RealtimeHistogram<TemporalRow> key="histogram" {...props} binSize={86400000} />,
    <TemporalHistogram<TemporalRow> key="temporal" {...props} binSize={86400000} />,
    <RealtimeHeatmap<TemporalRow> key="heatmap" {...props} />,
    <RealtimeSwarmChart<TemporalRow> key="swarm" {...props} />,
    <RealtimeWaterfallChart<TemporalRow> key="waterfall" {...props} />,
    <CoreLineChart<TemporalRow> key="core-line" {...props} />,
    <CoreTemporalHistogram<TemporalRow> key="core-temporal" {...props} binSize={86400000} />,
    <RootLineChart<TemporalRow> key="root-line" {...props} />,
    <LegacyHistogram<TemporalRow> key="legacy-histogram" {...props} binSize={86400000} />,
    <RootTemporalHistogram<TemporalRow> key="root-temporal" {...props} binSize={86400000} />
  ]
}

export const dateCharts = temporalCharts(row => row.date)
export const isoCharts = temporalCharts(row => row.iso)
export const numericCharts = temporalCharts(row => row.epoch)

// @ts-expect-error The widened return type must retain typed datum validation.
export const typo: RealtimeLineChartProps<TemporalRow>["timeAccessor"] = (row: TemporalRow) => row.datte
// @ts-expect-error Arbitrary object return values are not temporal values.
export const invalidTime: RealtimeLineChartProps<TemporalRow>["timeAccessor"] = () => ({ date })
// @ts-expect-error Time accessor widening does not widen value accessors.
export const invalidValue: RealtimeLineChartProps<TemporalRow>["valueAccessor"] = (row: TemporalRow) => row.date
