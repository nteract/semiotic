/** Incremental admission and historical accounting, independent of rendering. */
export interface EventDropWatermarkOptions {
  delay?: number
  value?: number
  external?: () => number
  perSource?: boolean
  idleTimeout?: number
  allowedLateness?: number
}

export type EventDropWatermark =
  EventDropWatermarkOptions | ((latestEventTime: number) => number)

export interface EventDropSourceCount {
  accepted: number
  late: number
}

export interface EventDropLedgerRow extends EventDropSourceCount {
  windowId: string
  start: number
  end: number
  bySource: Record<string, EventDropSourceCount>
  closedAt?: number
  watermarkAtClose?: number
  open: boolean
}

export interface EventDropLedgerEvent {
  type:
    | "physics-window-open"
    | "physics-window-close"
    | "physics-window-update"
    | "physics-watermark-advance"
    | "physics-source-idle"
    | "physics-watermark-held"
  windowId?: string
  start?: number
  end?: number
  accepted?: number
  late?: number
  bySource?: Record<string, EventDropSourceCount>
  watermark?: number
  from?: number
  to?: number
  cause?: "arrival" | "external"
  sourceId?: string
  retractions?: number
}

function copyRow(row: EventDropLedgerRow): EventDropLedgerRow {
  return {
    ...row,
    bySource: Object.fromEntries(
      Object.entries(row.bySource).map(([id, count]) => [id, { ...count }])
    )
  }
}

/**
 * Append-only stream ledger. Call append in arrival order; caller-owned ids and
 * correction/replay policy stay outside this accumulator. Closing records the
 * counts *at closure*: later rejected arrivals still increase the late total.
 * Units are caller-defined, but times, window size, delay and timeout must agree.
 */
export class EventDropLedger {
  private windows = new Map<string, EventDropLedgerRow>()
  private openWindows = new Set<EventDropLedgerRow>()
  private sources = new Map<
    string,
    { latest: number; arrival: number; idle: boolean }
  >()
  private latest = -Infinity
  private frontier = -Infinity
  private value = -Infinity
  private heldBy: string | undefined
  private pending: EventDropLedgerEvent[] = []

  constructor(
    readonly windowSize: number,
    private policy: EventDropWatermark = {},
    sourceIds: readonly string[] = []
  ) {
    if (!Number.isFinite(windowSize) || windowSize <= 0)
      throw new RangeError(
        "EventDrop windows.size must be a finite positive number"
      )
    for (const id of sourceIds)
      this.sources.set(id, {
        latest: -Infinity,
        arrival: -Infinity,
        idle: false
      })
    this.validatePolicy(policy)
  }

  private validatePolicy(policy: EventDropWatermark) {
    if (typeof policy === "function") return
    for (const key of ["delay", "idleTimeout", "allowedLateness"] as const) {
      const value = policy[key]
      if (value != null && (!Number.isFinite(value) || value < 0))
        throw new RangeError(`watermark.${key} must be finite and nonnegative`)
    }
    if (policy.value != null && !Number.isFinite(policy.value))
      throw new RangeError("watermark.value must be finite")
  }

  setWatermark(policy: EventDropWatermark): void {
    this.validatePolicy(policy)
    this.policy = policy
  }

  getWatermark(): number {
    return this.value
  }
  getLatestEventTime(): number {
    return this.latest
  }
  getArrivalFrontier(): number {
    return this.frontier
  }
  getLedger(): EventDropLedgerRow[] {
    return Array.from(this.windows.values(), copyRow).sort(
      (a, b) => a.start - b.start
    )
  }
  drainEvents(): EventDropLedgerEvent[] {
    const events = this.pending
    this.pending = []
    return events
  }

  advance(now: number, cause: "arrival" | "external" = "external"): void {
    if (!Number.isFinite(now)) return
    this.frontier = Math.max(this.frontier, now)
    const policy = this.policy
    let proposed: number
    if (typeof policy === "function") proposed = policy(this.latest)
    else if (policy.external) proposed = policy.external()
    else if (policy.value != null) proposed = policy.value
    else {
      let latest = this.latest
      if (policy.perSource) {
        latest = Infinity
        let heldBy: string | undefined
        for (const [id, source] of this.sources) {
          if (!Number.isFinite(source.arrival)) source.arrival = now
          const idle =
            policy.idleTimeout != null &&
            now - source.arrival >= policy.idleTimeout
          if (idle && !source.idle)
            this.pending.push({ type: "physics-source-idle", sourceId: id })
          source.idle = idle
          if (!idle && source.latest < latest) {
            latest = source.latest
            heldBy = id
          }
        }
        if (heldBy && heldBy !== this.heldBy && latest < this.latest)
          this.pending.push({
            type: "physics-watermark-held",
            sourceId: heldBy
          })
        this.heldBy = heldBy
        if (latest === Infinity) latest = this.latest
      }
      proposed = latest - (policy.delay ?? this.windowSize)
    }
    if (!Number.isFinite(proposed) || proposed <= this.value) return
    const from = this.value
    this.value = proposed
    this.pending.push({
      type: "physics-watermark-advance",
      from,
      to: proposed,
      cause
    })
    for (const row of this.openWindows)
      if (row.end <= this.value) this.close(row, now)
  }

  private close(row: EventDropLedgerRow, now: number): void {
    row.open = false
    row.closedAt = now
    row.watermarkAtClose = this.value
    this.openWindows.delete(row)
    this.pending.push({
      type: "physics-window-close",
      ...copyRow(row),
      watermark: this.value
    })
  }

  append(event: {
    eventTime: number
    arrivalTime: number
    source?: string
    watermarkAtArrival?: number
  }) {
    const { eventTime, arrivalTime, source = "" } = event
    if (!Number.isFinite(eventTime) || !Number.isFinite(arrivalTime))
      throw new RangeError("Event and arrival times must be finite")
    if (arrivalTime < this.frontier)
      throw new RangeError(
        "Incremental admissions require nondecreasing arrival times"
      )
    this.latest = Math.max(this.latest, eventTime)
    const sourceState = this.sources.get(source)
    this.sources.set(source, {
      latest: Math.max(sourceState?.latest ?? -Infinity, eventTime),
      arrival: arrivalTime,
      idle: false
    })
    this.advance(arrivalTime, "arrival")
    const start = Math.floor(eventTime / this.windowSize) * this.windowSize
    const end = start + this.windowSize
    const windowId = `${start}-${end}`
    let row = this.windows.get(windowId)
    if (!row) {
      row = {
        windowId,
        start,
        end,
        accepted: 0,
        late: 0,
        bySource: Object.create(null),
        open: true
      }
      this.windows.set(windowId, row)
      this.openWindows.add(row)
      this.pending.push({ type: "physics-window-open", windowId, start, end })
    }
    const watermarkAtArrival = event.watermarkAtArrival ?? this.value
    const allowed =
      typeof this.policy === "function" ? 0 : (this.policy.allowedLateness ?? 0)
    const late = end + allowed <= watermarkAtArrival
    const count = (row.bySource[source] ??= { accepted: 0, late: 0 })
    const key = late ? "late" : "accepted"
    row[key]++
    count[key]++
    if (!row.open && !late)
      this.pending.push({
        type: "physics-window-update",
        windowId,
        accepted: row.accepted,
        late: row.late,
        bySource: copyRow(row).bySource,
        watermark: this.value,
        retractions: 1
      })
    if (row.open && end <= this.value) this.close(row, arrivalTime)
    return { windowId, start, end, late, watermarkAtArrival }
  }
}
