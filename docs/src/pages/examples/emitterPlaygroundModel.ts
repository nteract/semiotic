import { createSyntheticEmitter, EventDropLedger } from "semiotic/physics"
import type { PhysicsBodyState } from "semiotic/physics"

export const EMISSION_SECONDS = 24
export const RUN_SECONDS = 28
export const TRAVEL_SECONDS = 1.2
export const WINDOW_SECONDS = 5

export interface PlaygroundEvent {
  id: string
  source: string
  time: number
  arrivalTime: number
  watermarkAtArrival: number
  older: boolean
}

/** A bounded host integration: the physics clock drives one synthetic source. */
export function createEmitterPlayground(rate: number, delay: number) {
  const emitter = createSyntheticEmitter([{ id: "p1", ratePerSec: rate }], 42)
  const ledger = new EventDropLedger(WINDOW_SECONDS, { delay }, ["p1"])
  const emitted = new Map<string, PlaygroundEvent>()
  const arrived = new Set<string>()
  let time = 0
  let olderCount = 0

  const watermark = () => (Number.isFinite(ledger.getWatermark()) ? ledger.getWatermark() : -delay)

  const remember = (id: string, eventTime: number, older: boolean) => {
    const row = {
      id,
      source: "p1",
      time: eventTime,
      arrivalTime: time + TRAVEL_SECONDS,
      watermarkAtArrival: watermark(),
      older,
    }
    emitted.set(id, row)
    return row
  }

  return {
    advance(deltaSeconds: number, active: boolean): PlaygroundEvent[] {
      const delta = Math.max(0, Math.min(deltaSeconds, RUN_SECONDS - time))
      const emittingDelta = Math.max(0, Math.min(delta, EMISSION_SECONDS - time))
      time += delta
      return emitter
        .advance(emittingDelta * 1000, { active: { p1: active } })
        .map((event) => remember(event.id, event.eventTime / 1000, false))
    },
    sendOlder(): PlaygroundEvent | undefined {
      // Choose an already closed window. This avoids predicting a future
      // admission while the general live HOC integration is still pending.
      if (watermark() < WINDOW_SECONDS || time >= EMISSION_SECONDS || olderCount >= 16)
        return undefined
      return remember(`older-${olderCount++}`, 1, true)
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
