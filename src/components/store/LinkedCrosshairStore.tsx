"use client"

import * as React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore
} from "react"

/** A linked crosshair in data-space x coordinates (epoch milliseconds for time). */
export interface CrosshairPosition {
  xValue: number
  sourceId: string
  locked?: boolean
}

/** External positions may omit sourceId so the crosshair appears on every chart. */
export type CrosshairPositionInput = Omit<CrosshairPosition, "sourceId"> & {
  sourceId?: string
}

/** Control or observe one named x-position group inside LinkedCharts. */
export interface LinkedCrosshairConfig {
  name: string
  /** undefined selects internal state; null controls an inactive crosshair. */
  position?: CrosshairPositionInput | null
  /** Hover, leave, click, Escape, and hook actions request a new position here. */
  onPositionChange?: (position: CrosshairPosition | null) => void
}

interface CrosshairStore {
  getSnapshot: () => ReadonlyMap<string, CrosshairPosition>
  subscribe: (listener: () => void) => () => void
  set: (name: string, position: CrosshairPosition | null) => void
}

function samePosition(
  a: CrosshairPosition | null,
  b: CrosshairPosition | null
): boolean {
  return (
    a === b ||
    !!(
      a &&
      b &&
      a.xValue === b.xValue &&
      a.sourceId === b.sourceId &&
      !!a.locked === !!b.locked
    )
  )
}

function normalizePosition(
  position: CrosshairPositionInput | null
): CrosshairPosition | null {
  if (!position || !Number.isFinite(position.xValue)) return null
  return { ...position, sourceId: position.sourceId ?? "external" }
}

function createCrosshairStore(): CrosshairStore {
  let positions = new Map<string, CrosshairPosition>()
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => positions,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    set: (name, position) => {
      if (samePosition(positions.get(name) ?? null, position)) return
      positions = new Map(positions)
      if (position) positions.set(name, position)
      else positions.delete(name)
      for (const listener of listeners) listener()
    }
  }
}

let fallbackStore: CrosshairStore | undefined
function getFallbackStore(): CrosshairStore {
  return (fallbackStore ??= createCrosshairStore())
}

const CrosshairContext = /* @__PURE__ */ createContext<{
  store: CrosshairStore
  control?: LinkedCrosshairConfig
} | null>(null)

/** Provider owned by LinkedCharts; isolates names between dashboards. */
export function LinkedCrosshairProvider({
  children,
  control
}: {
  children: React.ReactNode
  control?: LinkedCrosshairConfig
}) {
  const [store] = useState(createCrosshairStore)
  const value = useMemo(() => ({ store, control }), [store, control])
  // One listener per dashboard prevents duplicate controlled requests from
  // peer overlays, while Escape can still clear locks in other dashboards.
  useEffect(() => {
    const actions = createActions(store, control)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (control) actions.unlockCrosshair(control.name)
      for (const name of store.getSnapshot().keys()) {
        if (name !== control?.name) actions.unlockCrosshair(name)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [store, control])
  return (
    <CrosshairContext.Provider value={value}>
      {children}
    </CrosshairContext.Provider>
  )
}

function createActions(store: CrosshairStore, control?: LinkedCrosshairConfig) {
  const controlled = (name: string) =>
    control?.name === name && control.position !== undefined
  const get = (name: string): CrosshairPosition | null =>
    controlled(name)
      ? normalizePosition(control!.position!)
      : (store.getSnapshot().get(name) ?? null)
  const set = (name: string, input: CrosshairPositionInput | null) => {
    const position = normalizePosition(input)
    if (samePosition(get(name), position)) return
    if (!controlled(name)) store.set(name, position)
    if (control?.name === name) control.onPositionChange?.(position)
  }
  return {
    setPosition: set,
    setCrosshairPosition(name: string, xValue: number, sourceId: string) {
      if (!get(name)?.locked) set(name, { xValue, sourceId })
    },
    clearCrosshairPosition(name: string, sourceId: string) {
      const current = get(name)
      if (current && !current.locked && current.sourceId === sourceId)
        set(name, null)
    },
    toggleCrosshairLock(
      name: string,
      xValue: number,
      sourceId: string
    ): boolean {
      if (get(name)?.locked) {
        set(name, null)
        return false
      }
      set(name, { xValue, sourceId, locked: true })
      return true
    },
    unlockCrosshair(name: string, sourceId?: string) {
      const current = get(name)
      if (current?.locked && (!sourceId || current.sourceId === sourceId))
        set(name, null)
    },
    releaseCrosshair(name: string, sourceId: string) {
      // An external owner controls lifetime as well as the position.
      if (!controlled(name) && get(name)?.sourceId === sourceId) set(name, null)
    }
  }
}

/** Internal scoped actions shared by chart event handlers and overlays. */
export function useCrosshairActions() {
  const context = useContext(CrosshairContext)
  const store = context?.store ?? getFallbackStore()
  const handlesEscape = context !== null
  return useMemo(
    () => ({
      ...createActions(store, context?.control),
      handlesEscape
    }),
    [store, context?.control, handlesEscape]
  )
}

const EMPTY_POSITIONS: ReadonlyMap<string, CrosshairPosition> =
  /* @__PURE__ */ new Map()
const serverSnapshot = () => EMPTY_POSITIONS
const subscribeNoop = () => () => {}

/** Read a named crosshair; inactive names return null. */
export function useCrosshairPosition(
  name: string | undefined
): CrosshairPosition | null {
  const context = useContext(CrosshairContext)
  const store = context?.store ?? getFallbackStore()
  const positions = useSyncExternalStore(
    name ? store.subscribe : subscribeNoop,
    store.getSnapshot,
    serverSnapshot
  )
  const control = context?.control
  const controlled =
    control != null && control.name === name && control.position !== undefined
  const input = controlled ? (control.position ?? null) : null
  const externalPosition = useMemo(() => normalizePosition(input), [input])
  return controlled
    ? externalPosition
    : name
      ? (positions.get(name) ?? null)
      : null
}

export interface UseLinkedCrosshairResult {
  position: CrosshairPosition | null
  /** Replace the position, including lock state; null clears even a locked crosshair. */
  setPosition: (position: CrosshairPositionInput | null) => void
}

/** Read and update the same crosshair as charts, from a table or other React UI. */
export function useLinkedCrosshair(name: string): UseLinkedCrosshairResult {
  const position = useCrosshairPosition(name)
  const actions = useCrosshairActions()
  const setPosition = useCallback(
    (next: CrosshairPositionInput | null) => actions.setPosition(name, next),
    [actions, name]
  )
  return { position, setPosition }
}

// Preserve the internal standalone-store helpers used by existing frame tests.
export function setCrosshairPosition(
  name: string,
  xValue: number,
  sourceId: string
) {
  createActions(getFallbackStore()).setCrosshairPosition(name, xValue, sourceId)
}
export function clearCrosshairPosition(name: string, sourceId: string) {
  createActions(getFallbackStore()).clearCrosshairPosition(name, sourceId)
}
export function toggleCrosshairLock(
  name: string,
  xValue: number,
  sourceId: string
): boolean {
  return createActions(getFallbackStore()).toggleCrosshairLock(
    name,
    xValue,
    sourceId
  )
}
export function unlockCrosshair(name: string, sourceId?: string) {
  createActions(getFallbackStore()).unlockCrosshair(name, sourceId)
}
