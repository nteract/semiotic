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

export type ChartObservation =
  | HoverObservation
  | HoverEndObservation
  | BrushObservation
  | BrushEndObservation
  | SelectionObservation
  | SelectionEndObservation

export type OnObservationCallback = (observation: ChartObservation) => void

// ── Store ────────────────────────────────────────────────────────────────

export interface ObservationStoreState {
  observations: ChartObservation[]
  maxObservations: number
  pushObservation: (observation: ChartObservation) => void
  clearObservations: () => void
}

export const [ObservationProvider, useObservationSelector] = createStore(
  (set: Function) => ({
    observations: [] as ChartObservation[],
    maxObservations: 100,

    pushObservation(observation: ChartObservation) {
      set((current: ObservationStoreState) => {
        const next = [...current.observations, observation]
        if (next.length > current.maxObservations) {
          return { observations: next.slice(next.length - current.maxObservations) }
        }
        return { observations: next }
      })
    },

    clearObservations() {
      set(() => ({ observations: [] as ChartObservation[] }))
    }
  })
)
