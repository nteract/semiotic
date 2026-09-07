import type { ComponentRef } from "react"
import type { LineChart } from "semiotic/line"

export interface Observation {
  id: string
  minute: number
  value: number
}

export const RETAINED_RECORDS = 4
export const INITIAL_OBSERVATIONS: Observation[] = [
  { id: "obs-01", minute: 0, value: 12 },
  { id: "obs-02", minute: 1, value: 18 },
  { id: "obs-03", minute: 2, value: 15 },
]

// Event order is processing order. A correction preserves the observation's
// event time and ID; it does not create a new point at its arrival time.
export const LIVE_EVENTS = [
  { row: { id: "obs-02", minute: 1, value: 14 }, label: "Correct obs-02 from 18 to 14" },
  { row: { id: "obs-04", minute: 3, value: 20 }, label: "Add obs-04 at minute 3" },
  { row: { id: "obs-05", minute: 4, value: 16 }, label: "Add obs-05; discard obs-01" },
  { row: { id: "obs-03", minute: 2, value: 17 }, label: "Correct obs-03 from 15 to 17" },
  { row: { id: "obs-06", minute: 5, value: 19 }, label: "Add obs-06; discard obs-02" },
] satisfies Array<{ row: Observation; label: string }>

export const liveChartProps = {
  xAccessor: "minute",
  yAccessor: "value",
  pointIdAccessor: "id",
  xLabel: "Observation time (minutes after 09:00)",
  yLabel: "Synthetic reading (units)",
  title: "The latest four observations",
  description:
    "Synthetic observations by event time. Corrections keep their original time and record ID.",
  summary:
    "Advance the source to inspect corrections and retention. Disconnect to freeze the displayed window, then reconnect to catch up.",
  showPoints: true,
  showGrid: true,
  accessibleTable: true,
  xExtent: [0, 5] as [number, number],
  yExtent: [0, 24] as [number, number],
}

type FeedMessage =
  | { kind: "snapshot"; rows: Observation[]; cursor: number }
  | { kind: "change"; row: Observation; removed: string[]; cursor: number }

/** A deterministic, in-memory source, not a network or ordering protocol. */
export function createLiveSource() {
  let rows = INITIAL_OBSERVATIONS.map((row) => ({ ...row }))
  let cursor = 0
  const listeners = new Set<(message: FeedMessage) => void>()
  return {
    get cursor() {
      return cursor
    },
    get subscriberCount() {
      return listeners.size
    },
    get rows() {
      return rows.map((row) => ({ ...row }))
    },
    subscribe(listener: (message: FeedMessage) => void) {
      listeners.add(listener)
      // Registration and snapshot are synchronous in this fixture. A remote
      // source needs an atomic snapshot/cursor handoff to avoid losing events.
      listener({ kind: "snapshot", rows: rows.map((row) => ({ ...row })), cursor })
      return () => {
        listeners.delete(listener)
      }
    },
    advance() {
      const event = LIVE_EVENTS[cursor]
      if (!event) return false
      const byId = new Map(rows.map((row) => [row.id, row]))
      byId.set(event.row.id, { ...event.row })
      const ordered = [...byId.values()].sort((a, b) => a.minute - b.minute)
      const removed = ordered.slice(0, -RETAINED_RECORDS).map((row) => row.id)
      rows = ordered.slice(-RETAINED_RECORDS)
      cursor += 1
      for (const listener of listeners) {
        listener({ kind: "change", row: { ...event.row }, removed, cursor })
      }
      return true
    },
  }
}

export type LiveSource = ReturnType<typeof createLiveSource>
type LiveChartHandle = ComponentRef<typeof LineChart>

/** Connect only after React mounts the chart and supplies its ref. */
export function connectLiveChart(
  source: LiveSource,
  chart: LiveChartHandle,
  onReadback: (rows: Observation[], cursor: number) => void,
) {
  const retainedIds = new Set<string>()
  return source.subscribe((message) => {
    if (message.kind === "snapshot") {
      chart.clear()
      chart.pushMany(message.rows)
      retainedIds.clear()
      for (const row of message.rows) retainedIds.add(row.id)
    } else {
      for (const id of message.removed) {
        chart.remove(id)
        retainedIds.delete(id)
      }
      if (retainedIds.has(message.row.id)) {
        chart.update(message.row.id, (previous) => ({ ...previous, ...message.row }))
      } else if (!message.removed.includes(message.row.id)) {
        chart.push(message.row)
        retainedIds.add(message.row.id)
      }
    }
    // Inspect the chart's retained store, rather than echoing the source rows.
    const actual = chart.getData().map((row) => ({
      id: String(row.id),
      minute: Number(row.minute),
      value: Number(row.value),
    }))
    onReadback(actual, message.cursor)
  })
}
