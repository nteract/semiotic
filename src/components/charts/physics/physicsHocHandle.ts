"use client"

import { useImperativeHandle, useRef } from "react"
import type { Ref, RefObject } from "react"
import type { Datum } from "../shared/datumTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { StreamPhysicsFrameHandle } from "../../stream/physics/StreamPhysicsFrame"
import type { PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineStore"

export interface PhysicsDatumSpawnResult {
  datumId: string
  spawns: PhysicsQueuedSpawn[]
}

export interface UsePhysicsHocHandleOptions {
  frameRef: RefObject<StreamPhysicsFrameHandle | null>
  spawnDatum: (datum: Datum, index: number) => PhysicsDatumSpawnResult
}

export function usePhysicsHocHandle(
  ref: Ref<RealtimeFrameHandle> | undefined,
  options: UsePhysicsHocHandleOptions
): void {
  const { frameRef, spawnDatum } = options
  const knownRowsRef = useRef(new Map<string, Datum>())
  const bodyIdsByDatumRef = useRef(new Map<string, string[]>())

  useImperativeHandle(
    ref,
    (): RealtimeFrameHandle => {
      const knownRows = knownRowsRef.current
      const bodyIdsByDatum = bodyIdsByDatumRef.current

      function pushOne(datum: Datum, index: number): void {
        const result = spawnDatum(datum, index)
        const spawns = result.spawns.map((spawn) => ({
          ...spawn,
          spawnAt: undefined
        }))
        knownRows.set(result.datumId, datum)
        bodyIdsByDatum.set(
          result.datumId,
          spawns.map((spawn) => spawn.id)
        )
        frameRef.current?.pushMany(spawns)
        frameRef.current?.step(0)
      }

      return {
        push: (datum) => pushOne(datum, knownRows.size),
        pushMany: (rows) => rows.forEach((datum, index) => pushOne(datum, index)),
        remove: (id) => {
          const ids = Array.isArray(id) ? id : [id]
          const removed: Datum[] = []
          const bodyIds: string[] = []
          for (const datumId of ids) {
            const datum = knownRows.get(datumId)
            if (datum) removed.push(datum)
            knownRows.delete(datumId)
            bodyIds.push(...(bodyIdsByDatum.get(datumId) ?? [datumId]))
            bodyIdsByDatum.delete(datumId)
          }
          frameRef.current?.remove(bodyIds)
          return removed
        },
        update: (id, updater) => {
          const ids = Array.isArray(id) ? id : [id]
          const previous: Datum[] = []
          for (const datumId of ids) {
            const old = knownRows.get(datumId)
            if (!old) continue
            previous.push(old)
            const bodyIds = bodyIdsByDatum.get(datumId) ?? [datumId]
            frameRef.current?.remove(bodyIds)
            knownRows.delete(datumId)
            bodyIdsByDatum.delete(datumId)
            pushOne(updater(old), knownRows.size)
          }
          return previous
        },
        clear: () => {
          knownRows.clear()
          bodyIdsByDatum.clear()
          frameRef.current?.clear()
        },
        getData: () =>
          frameRef.current
            ?.getData()
            .map((body) => body.datum)
            .filter((datum): datum is Datum => !!datum && typeof datum === "object") ?? [],
        getCustomLayout: () => frameRef.current?.snapshot() ?? null
      }
    },
    [frameRef, spawnDatum]
  )
}
