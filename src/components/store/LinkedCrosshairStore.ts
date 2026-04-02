"use client"

import { useSyncExternalStore } from "react"

/**
 * Lightweight store for broadcasting hover X-position across linked charts.
 * Used by linkedHover with mode: "x-position" for coordinate-based sync.
 *
 * Supports click-to-lock: when locked, hover updates are ignored and the
 * crosshair persists at the locked position until unlocked (click or Escape).
 */

interface CrosshairPosition {
  xValue: number
  sourceId: string
  locked?: boolean
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
  // Ignore hover updates when locked
  if (current?.locked) return
  if (current && current.xValue === xValue && current.sourceId === sourceId) return
  state = { positions: new Map(state.positions).set(name, { xValue, sourceId }) }
  emit()
}

export function clearCrosshairPosition(name: string, sourceId: string) {
  const current = state.positions.get(name)
  // Don't clear a locked crosshair on hover-end
  if (current?.locked) return
  if (!current || current.sourceId !== sourceId) return
  const next = new Map(state.positions)
  next.delete(name)
  state = { positions: next }
  emit()
}

/** Toggle lock: if unlocked, lock at xValue; if locked, unlock and clear. Returns new locked state. */
export function toggleCrosshairLock(name: string, xValue: number, sourceId: string): boolean {
  const current = state.positions.get(name)
  if (current?.locked) {
    // Unlock — remove the crosshair
    const next = new Map(state.positions)
    next.delete(name)
    state = { positions: next }
    emit()
    return false
  }
  // Lock at this position
  state = { positions: new Map(state.positions).set(name, { xValue, sourceId, locked: true }) }
  emit()
  return true
}

/** Force-unlock a crosshair by name. When sourceId is provided, only unlocks if it matches (safe for multi-chart unmount). */
export function unlockCrosshair(name: string, sourceId?: string) {
  const current = state.positions.get(name)
  if (!current?.locked) return
  if (sourceId && current.sourceId !== sourceId) return
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
const EMPTY_STATE: CrosshairState = { positions: new Map() }
function subscribeNoop(): () => void { return () => {} }
function getSnapshotNoop(): CrosshairState { return EMPTY_STATE }

/**
 * Hook to read a specific crosshair position by name.
 * Returns the X value, sourceId, and locked state, or null if no crosshair is active.
 */
export function useCrosshairPosition(name: string | undefined): { xValue: number; sourceId: string; locked?: boolean } | null {
  const snap = useSyncExternalStore(
    name ? subscribe : subscribeNoop,
    name ? getSnapshot : getSnapshotNoop,
    name ? getSnapshot : getSnapshotNoop
  )
  if (!name) return null
  return snap.positions.get(name) ?? null
}
