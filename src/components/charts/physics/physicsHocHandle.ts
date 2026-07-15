"use client"

/**
 * Shared RealtimeFrameHandle for physics HOCs.
 *
 * Maps user-facing row push/remove/update onto StreamPhysicsFrame body
 * spawns. Push mode is selected by **omitting** `data` on the HOC (not
 * `data={[]}`), matching the rest of Semiotic.
 */
import { useImperativeHandle, useRef } from "react"
import type { Ref, RefObject } from "react"
import type { Datum } from "../shared/datumTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { StreamPhysicsFrameHandle } from "../../stream/physics/StreamPhysicsFrame"
import type { StreamPhysicsPopOptions } from "../../stream/physics/physicsBodyCanvas"
import type { PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineStore"

/**
 * The imperative handle every physics HOC exposes: the shared realtime
 * push/remove/update surface plus the physics-only `popBodies` — a
 * body-removal "pop" burst (expanding ring + sparks) played by the frame.
 * The exit-emphasis counterpart to realtime `pulse`; returns the ids of the
 * bodies actually removed.
 */
export interface PhysicsFrameHandle extends RealtimeFrameHandle {
  popBodies(ids: string[], options?: StreamPhysicsPopOptions): string[]
}

export interface PhysicsDatumSpawnResult {
  datumId: string
  spawns: PhysicsQueuedSpawn[]
}

export interface UsePhysicsHocHandleOptions {
  frameRef: RefObject<StreamPhysicsFrameHandle | null>
  /**
   * Turn one user row into one or more physics body spawns. Called for
   * push / pushMany / update — never for initial static layout (that path
   * uses the HOC's `initialSpawns`).
   */
  spawnDatum: (datum: Datum, index: number) => PhysicsDatumSpawnResult
  /**
   * Optional seed so remove/update work on static initial rows without a
   * prior push. Map each seed row to its body ids (defaults: single body
   * whose id equals the datum id).
   */
  seedRows?: readonly Datum[]
  /**
   * Resolve a stable row id for seed/push tracking. Defaults to
   * `String(datum.id ?? index)`.
   */
  idAccessor?: string | ((datum: Datum, index: number) => string)
  /**
   * Resolve body ids for a seed row. Defaults to matching `seedSpawns`
   * (and unitized `rowId-*` ids), else `[rowId]`.
   */
  bodyIdsForSeed?: (datum: Datum, rowId: string, index: number) => string[]
  /**
   * Initial layout spawns — used to resolve multi-body seed rows (pile
   * unitization, physical-flow packets) for remove/update.
   */
  seedSpawns?: readonly PhysicsQueuedSpawn[]
}

/** Body ids belonging to a seed row (handles unitized `id-0`, `id-1`, …). */
export function bodyIdsForSeedRow(
  rowId: string,
  spawns: readonly PhysicsQueuedSpawn[] | undefined
): string[] {
  if (!spawns?.length) return [rowId]
  const matched = spawns
    .filter((spawn) => {
      if (spawn.id === rowId || spawn.id.startsWith(`${rowId}-`)) return true
      const datum = spawn.datum as Datum | undefined
      if (datum && typeof datum === "object" && datum.id != null) {
        return String(datum.id) === rowId
      }
      return false
    })
    .map((spawn) => spawn.id)
  return matched.length ? matched : [rowId]
}

function defaultRowId(
  datum: Datum,
  index: number,
  idAccessor?: UsePhysicsHocHandleOptions["idAccessor"]
): string {
  if (typeof idAccessor === "function") {
    return String(idAccessor(datum, index))
  }
  if (typeof idAccessor === "string") {
    const value = (datum as Record<string, unknown>)[idAccessor]
    if (value != null) return String(value)
  }
  if (datum != null && typeof datum === "object" && "id" in datum && datum.id != null) {
    return String(datum.id)
  }
  return `physics-row-${index}`
}

function readBodyDatum(
  frame: StreamPhysicsFrameHandle | null | undefined,
  bodyId: string
): Datum | undefined {
  const body = frame?.getData().find((candidate) => candidate.id === bodyId)
  const datum = body?.datum
  if (datum && typeof datum === "object") return datum as Datum
  return undefined
}

export function usePhysicsHocHandle(
  ref: Ref<PhysicsFrameHandle> | undefined,
  options: UsePhysicsHocHandleOptions
): void {
  const {
    frameRef,
    spawnDatum,
    seedRows,
    idAccessor,
    bodyIdsForSeed,
    seedSpawns
  } = options
  const knownRowsRef = useRef(new Map<string, Datum>())
  const bodyIdsByDatumRef = useRef(new Map<string, string[]>())
  const seedSignatureRef = useRef<string>("")

  // Re-seed tracking when the static initial data identity changes.
  // Does not re-spawn bodies — only makes remove/update addressable.
  const seedSignature = seedRows
    ? seedRows
        .map((row, index) => defaultRowId(row, index, idAccessor))
        .join("\0")
    : ""
  if (seedSignature !== seedSignatureRef.current) {
    seedSignatureRef.current = seedSignature
    // Refresh seed tracking for the static initial set. Live push rows whose
    // ids are not in the new seed set are left alone (clear() still resets).
    if (seedRows) {
      for (let index = 0; index < seedRows.length; index += 1) {
        const datum = seedRows[index]
        const rowId = defaultRowId(datum, index, idAccessor)
        knownRowsRef.current.set(rowId, datum)
        bodyIdsByDatumRef.current.set(
          rowId,
          bodyIdsForSeed?.(datum, rowId, index) ??
            bodyIdsForSeedRow(rowId, seedSpawns)
        )
      }
    }
  }

  useImperativeHandle(
    ref,
    (): PhysicsFrameHandle => {
      const knownRows = knownRowsRef.current
      const bodyIdsByDatum = bodyIdsByDatumRef.current

      function resolveOne(datum: Datum, index: number): PhysicsDatumSpawnResult {
        const result = spawnDatum(datum, index)
        const datumId =
          result.datumId || defaultRowId(datum, index, idAccessor)
        return {
          datumId,
          spawns: result.spawns.map((spawn) => ({
            ...spawn,
            // Drop deferred spawnAt so push lands immediately
            spawnAt: undefined
          }))
        }
      }

      function pushResolved(
        results: Array<{ datum: Datum; result: PhysicsDatumSpawnResult }>
      ): void {
        const spawns: PhysicsQueuedSpawn[] = []
        for (const { datum, result } of results) {
          knownRows.set(result.datumId, datum)
          bodyIdsByDatum.set(
            result.datumId,
            result.spawns.map((spawn) => spawn.id)
          )
          spawns.push(...result.spawns)
        }
        if (!spawns.length) return
        const frame = frameRef.current
        if (!frame) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              "[semiotic/physics] push() called before the physics frame mounted (loading/empty early-return). Omit data for push mode and ensure the chart is mounted."
            )
          }
          return
        }
        frame.pushMany(spawns)
        frame.step(0)
      }

      function resolveKnownDatum(rowId: string): Datum | undefined {
        const known = knownRows.get(rowId)
        if (known) return known
        const bodyIds = bodyIdsByDatum.get(rowId) ?? [rowId]
        for (const bodyId of bodyIds) {
          const fromBody = readBodyDatum(frameRef.current, bodyId)
          if (fromBody) {
            knownRows.set(rowId, fromBody)
            if (!bodyIdsByDatum.has(rowId)) bodyIdsByDatum.set(rowId, [bodyId])
            return fromBody
          }
        }
        return undefined
      }

      return {
        push: (datum) => {
          pushResolved([{ datum, result: resolveOne(datum, knownRows.size) }])
        },
        pushMany: (rows) => {
          const baseIndex = knownRows.size
          pushResolved(
            rows.map((datum, index) => ({
              datum,
              result: resolveOne(datum, baseIndex + index)
            }))
          )
        },
        remove: (id) => {
          const ids = Array.isArray(id) ? id : [id]
          const removed: Datum[] = []
          const bodyIds: string[] = []
          for (const rowId of ids) {
            const datum = resolveKnownDatum(rowId)
            if (datum) removed.push(datum)
            knownRows.delete(rowId)
            bodyIds.push(...(bodyIdsByDatum.get(rowId) ?? [rowId]))
            bodyIdsByDatum.delete(rowId)
          }
          if (bodyIds.length) frameRef.current?.remove(bodyIds)
          return removed
        },
        update: (id, updater) => {
          const ids = Array.isArray(id) ? id : [id]
          const previous: Datum[] = []
          for (const rowId of ids) {
            const old = resolveKnownDatum(rowId)
            if (!old) continue
            previous.push(old)
            const bodyIds = bodyIdsByDatum.get(rowId) ?? [rowId]
            frameRef.current?.remove(bodyIds)
            knownRows.delete(rowId)
            bodyIdsByDatum.delete(rowId)
            const next = updater(old)
            pushResolved([
              { datum: next, result: resolveOne(next, knownRows.size) }
            ])
          }
          return previous
        },
        clear: () => {
          knownRows.clear()
          bodyIdsByDatum.clear()
          seedSignatureRef.current = ""
          frameRef.current?.clear()
        },
        getData: () => {
          const frame = frameRef.current
          if (!frame) return Array.from(knownRows.values())
          // Prefer live body datums (initial + push); fall back to known rows.
          const fromBodies = frame
            .getData()
            .map((body) => body.datum)
            .filter(
              (datum): datum is Datum => !!datum && typeof datum === "object"
            )
          if (fromBodies.length) return fromBodies
          return Array.from(knownRows.values())
        },
        // Physics has no continuous scales — omit-style null like network/geo.
        getScales: () => null,
        getCustomLayout: () => frameRef.current?.snapshot() ?? null,
        // Exit-emphasis burst on body removal — the physics sibling of `pulse`.
        popBodies: (ids, popOptions) =>
          frameRef.current?.popBodies(ids, popOptions) ?? []
      }
    },
    [frameRef, idAccessor, spawnDatum]
  )
}
