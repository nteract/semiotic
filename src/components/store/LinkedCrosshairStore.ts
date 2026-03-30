"use client"

import { useSyncExternalStore } from "react"

/**
 * Lightweight store for broadcasting hover X-position across linked charts.
 * Used by linkedHover with mode: "x-position" for coordinate-based sync.
 *
 * Uses useSyncExternalStore (same pattern as React docs recommend) to avoid
 * adding a Zustand dependency.
 */

interface CrosshairPosition {
  xValue: number
  sourceId: string
}

interface CrosshairState {
  positions: Map<string, CrosshairPosition>
}

type Listener = () => void

let state: CrosshairState = { positions: new Map() }
const listeners = new Set<Listener>()

function emit() {
  for (const l of listeners) l()
}

export function setCrosshairPosition(name: string, xValue: number, sourceId: string) {
  const current = state.positions.get(name)
  if (current && current.xValue === xValue && current.sourceId === sourceId) return
  state = { positions: new Map(state.positions).set(name, { xValue, sourceId }) }
  emit()
}

export function clearCrosshairPosition(name: string, sourceId: string) {
  const current = state.positions.get(name)
  if (!current || current.sourceId !== sourceId) return
  const next = new Map(state.positions)
  next.delete(name)
  state = { positions: next }
  emit()
}

function getSnapshot(): CrosshairState {
  return state
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// No-op subscribe/snapshot for components that don't need crosshair updates.
// Avoids re-renders on every crosshair change for non-crosshair charts.
const EMPTY_STATE: CrosshairState = { positions: new Map() }
function subscribeNoop(): () => void { return () => {} }
function getSnapshotNoop(): CrosshairState { return EMPTY_STATE }

/**
 * Hook to read a specific crosshair position by name.
 * Returns the X value and sourceId, or null if no crosshair is active.
 * When name is undefined, uses a no-op subscription to avoid unnecessary re-renders.
 */
export function useCrosshairPosition(name: string | undefined): { xValue: number; sourceId: string } | null {
  const snap = useSyncExternalStore(
    name ? subscribe : subscribeNoop,
    name ? getSnapshot : getSnapshotNoop,
    name ? getSnapshot : getSnapshotNoop
  )
  if (!name) return null
  return snap.positions.get(name) ?? null
}
