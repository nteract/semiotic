"use client"
import { createStore } from "./createStore"

// ── Observation Event Types ──────────────────────────────────────────────

interface ObservationBase {
  timestamp: number
  chartType: string
  chartId?: string
}

export interface HoverObservation extends ObservationBase {
  type: "hover"
  datum: Record<string, any>
  x: number
  y: number
}

export interface HoverEndObservation extends ObservationBase {
  type: "hover-end"
}

export interface BrushObservation extends ObservationBase {
  type: "brush"
  extent: { x: [number, number]; y: [number, number] }
}

export interface BrushEndObservation extends ObservationBase {
  type: "brush-end"
}

export interface SelectionObservation extends ObservationBase {
  type: "selection"
  selection: { name: string; fields: Record<string, any> }
}

export interface SelectionEndObservation extends ObservationBase {
  type: "selection-end"
  selection: { name: string }
}

export interface ClickObservation extends ObservationBase {
  type: "click"
  datum: Record<string, any>
  x: number
  y: number
}

export interface ClickEndObservation extends ObservationBase {
  type: "click-end"
}

export type ChartObservation =
  | HoverObservation
  | HoverEndObservation
  | BrushObservation
  | BrushEndObservation
  | SelectionObservation
  | SelectionEndObservation
  | ClickObservation
  | ClickEndObservation

export type OnObservationCallback = (observation: ChartObservation) => void

// ── Store ────────────────────────────────────────────────────────────────

export interface ObservationStoreState {
  /** Ring buffer of recent observations (newest last). Mutated in place for perf. */
  observations: ChartObservation[]
  maxObservations: number
  /** Monotonic counter incremented on each push — use as change signal */
  version: number
  pushObservation: (observation: ChartObservation) => void
  clearObservations: () => void
}

export const [ObservationProvider, useObservationSelector] = createStore<ObservationStoreState>(
  (set) => ({
    observations: [],
    maxObservations: 100,
    version: 0,

    pushObservation(observation: ChartObservation) {
      set((current) => {
        const obs = current.observations
        obs.push(observation)
        if (obs.length > current.maxObservations) {
          obs.shift()
        }
        // Bump version to signal change — array identity stays the same
        // which avoids O(n) copies on every hover event
        return { version: current.version + 1 }
      })
    },

    clearObservations() {
      set(() => ({ observations: [], version: 0 }))
    }
  })
)
