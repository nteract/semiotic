import { EventDropLedger } from "semiotic/physics"
import type { PhysicsBodyState, SyntheticArrival, SyntheticSourceSpec } from "semiotic/physics"

export const EMISSION_SECONDS = 24
export const RUN_SECONDS = 28
export const TRAVEL_SECONDS = 1.2
export const WINDOW_SECONDS = 5

export type EmitterPattern = "regular" | "jittered" | "bursty"

export function playgroundSources(pattern: EmitterPattern): SyntheticSourceSpec[] {
  return [
    {
      id: "p1",
      ratePerSec: 2,
      jitter: pattern === "jittered" ? "watermarks" : "none",
      ...(pattern === "bursty"
        ? {
            interval: 2000,
            burst: { min: 3, max: 6, gapMs: [1500, 2500] as [number, number], intraMs: 100 },
          }
        : {}),
    },
  ]
}

export interface PlaygroundEvent {
  id: string
  source: string
  time: number
  arrivalTime: number
  watermarkAtArrival: number
  older: boolean
}

/** The host owns admission readouts; useEmitters owns emission scheduling. */
export function createEmitterPlayground(delay: number) {
  const ledger = new EventDropLedger(WINDOW_SECONDS, { delay }, ["p1"])
  const emitted = new Map<string, PlaygroundEvent>()
  const arrived = new Set<string>()
  let time = 0
  let olderCount = 0
  let newestEmittedTime = 0

  const watermark = () => (Number.isFinite(ledger.getWatermark()) ? ledger.getWatermark() : -delay)

  const remember = (id: string, eventTime: number, emissionTime: number, older: boolean) => {
    newestEmittedTime = Math.max(newestEmittedTime, eventTime)
    const row = {
      id,
      source: "p1",
      time: eventTime,
      arrivalTime: emissionTime + TRAVEL_SECONDS,
      // Every journey takes the same time, so board entry preserves emission
      // order. Reserve the watermark after all preceding emitted events arrive.
      watermarkAtArrival: newestEmittedTime - delay,
      older,
    }
    emitted.set(id, row)
    return row
  }

  return {
    advance(deltaSeconds: number): void {
      const delta = Math.max(0, Math.min(deltaSeconds, RUN_SECONDS - time))
      time += delta
    },
    receive(event: SyntheticArrival): PlaygroundEvent {
      // This six-window study starts at zero, including prehistory from jitter.
      const eventTime = Math.max(0, event.eventTime / 1000)
      return remember(
        event.id,
        eventTime,
        event.arrivalTime / 1000,
        eventTime < event.arrivalTime / 1000,
      )
    },
    sendOlder(): PlaygroundEvent | undefined {
      // Choose an already closed window. This avoids predicting a future
      // admission while the general live HOC integration is still pending.
      if (watermark() < WINDOW_SECONDS || time >= EMISSION_SECONDS || olderCount >= 16)
        return undefined
      return remember(`older-${olderCount++}`, 1, time, true)
    },
    observe(bodies: readonly PhysicsBodyState[]): boolean {
      let changed = false
      // Admission follows the actual travel handoff, never a pixel region.
      for (const body of bodies) {
        const row = emitted.get(body.id)
        if (!row || body.travel || arrived.has(body.id)) continue
        arrived.add(body.id)
        ledger.append({
          eventTime: row.time,
          arrivalTime: time,
          source: row.source,
          watermarkAtArrival: row.watermarkAtArrival,
        })
        changed = true
      }
      ledger.drainEvents()
      return changed
    },
    read() {
      const rows = ledger.getLedger()
      return {
        time,
        watermark: watermark(),
        emitted: emitted.size,
        travelling: emitted.size - arrived.size,
        accepted: rows.reduce((sum, row) => sum + row.accepted, 0),
        late: rows.reduce((sum, row) => sum + row.late, 0),
        canSendOlder: watermark() >= WINDOW_SECONDS && time < EMISSION_SECONDS && olderCount < 16,
        complete: time >= RUN_SECONDS,
        rows,
      }
    },
  }
}
