"use client"

import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState
} from "react"
import type { Ref, RefObject } from "react"
import type { Datum } from "../shared/datumTypes"
import type { StreamPhysicsFrameHandle } from "../../stream/physics/StreamPhysicsTypes"
import type { PhysicsFrameHandle } from "./physicsHocHandle"
import type { PhysicsChartLayout } from "./physicsChartShared"
import { reconcilePhysicsChart } from "./physicsChartReconcile"
import {
  createPhysicsSourceState,
  type PhysicsSourceState
} from "./physicsSourceRows"

// An omitted data prop must keep its identity across encoding changes.
const EMPTY_PHYSICS_ROWS: readonly never[] = []
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

/**
 * Source records own both the compiled scene and its projection. Imperative
 * edits use the same compiler as data/encoding prop changes, with stable IDs.
 */
export function usePhysicsChartData<T extends Datum>(options: {
  ref: Ref<PhysicsFrameHandle> | undefined
  frameRef: RefObject<StreamPhysicsFrameHandle | null>
  data?: readonly T[]
  idPrefix: string
  buildLayout: (rows: T[]) => PhysicsChartLayout
}): { layout: PhysicsChartLayout; resetSeed: () => void } {
  const { ref, frameRef, idPrefix, buildLayout } = options
  const data = options.data ?? EMPTY_PHYSICS_ROWS
  const [state, setState] = useState(() =>
    createPhysicsSourceState(data, idPrefix)
  )
  // Replacing data is authoritative. Imperative edits survive unrelated
  // rerenders and encoding changes, but never resurrect rows from old data.
  let current = state
  if (state.seed !== data) {
    current = createPhysicsSourceState(data, idPrefix)
    setState(current)
  }
  const currentRef = useRef(current)
  currentRef.current = current
  const compilerRef = useRef(buildLayout)
  compilerRef.current = buildLayout
  const cache = useRef<{
    rows: T[]
    build: typeof buildLayout
    layout: PhysicsChartLayout
  } | null>(null)
  function compile(rows: T[]): PhysicsChartLayout {
    if (
      cache.current?.rows !== rows ||
      cache.current.build !== compilerRef.current
    ) {
      cache.current = {
        rows,
        build: compilerRef.current,
        layout: compilerRef.current(rows)
      }
    }
    return cache.current.layout
  }
  const layout = compile(current.rows)
  const applied = useRef<{
    store: ReturnType<StreamPhysicsFrameHandle["getStore"]>
    layout: PhysicsChartLayout
  } | null>(null)

  function synchronize(next: PhysicsChartLayout, paceNewBodies = true): void {
    const frame = frameRef.current
    if (!frame) return
    const store = frame.getStore()
    if (applied.current?.store === store && applied.current.layout !== next) {
      frame.restore(
        reconcilePhysicsChart(
          frame.snapshot(),
          applied.current.layout,
          next,
          paceNewBodies
        )
      )
    }
    applied.current = { store, layout: next }
  }

  // The child has created its initial scene before this parent layout effect.
  // A resize/rerun can replace that child; its new store already has this layout.
  useIsomorphicLayoutEffect(() => {
    synchronize(layout)
  })

  useImperativeHandle(ref, (): PhysicsFrameHandle => {
    function commit(next: PhysicsSourceState<T>): void {
      // An authored empty array stays empty, including through a saved handle.
      // Only omitted data uses the internal push-mode seed.
      const seed = currentRef.current.seed
      if (seed !== EMPTY_PHYSICS_ROWS && seed.length === 0) return
      currentRef.current = next
      const nextLayout = compile(next.rows)
      synchronize(nextLayout, false)
      setState(next)
    }
    function pushMany(incoming: Datum[]): void {
      if (!incoming.length) return
      const previous = currentRef.current
      const next = createPhysicsSourceState(
        [...previous.rows, ...(incoming as T[])],
        idPrefix,
        previous.nextId
      )
      commit({ ...next, seed: previous.seed })
    }
    return {
      push: (datum) => pushMany([datum]),
      pushMany,
      remove: (ids) => {
        const wanted = new Set(Array.isArray(ids) ? ids : [ids])
        const previous = currentRef.current
        const removed = previous.rows.filter((row) =>
          wanted.has(String(row.id))
        )
        if (removed.length)
          commit({
            ...previous,
            rows: previous.rows.filter((row) => !wanted.has(String(row.id)))
          })
        return removed
      },
      update: (ids, updater) => {
        const wanted = new Set(Array.isArray(ids) ? ids : [ids])
        const previous = currentRef.current
        const changed: T[] = []
        const rows = new Map(previous.rows.map((row) => [String(row.id), row]))
        for (const row of previous.rows) {
          if (!wanted.has(String(row.id))) continue
          changed.push(row)
          const next = updater(row)
          const id = next.id ?? row.id
          if (String(id) !== String(row.id)) rows.delete(String(row.id))
          rows.set(String(id), { ...next, id } as unknown as T)
        }
        if (changed.length)
          commit({ ...previous, rows: Array.from(rows.values()) })
        return changed
      },
      clear: () => {
        frameRef.current?.clear()
        commit({ ...currentRef.current, rows: [] })
      },
      getData: () => currentRef.current.rows.slice(),
      getScales: () => null,
      getCustomLayout: () => frameRef.current?.snapshot() ?? null,
      popBodies: (ids, popOptions) =>
        frameRef.current?.popBodies(ids, popOptions) ?? []
    }
  })
  return {
    layout,
    resetSeed: () => {
      const next = createPhysicsSourceState(currentRef.current.seed, idPrefix)
      currentRef.current = next
      setState(next)
    }
  }
}
