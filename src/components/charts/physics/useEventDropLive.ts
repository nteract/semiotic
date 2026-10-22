import {
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState
} from "react"
import type { RefObject } from "react"
import type { Datum } from "../shared/datumTypes"
import type { EventDropChartProps } from "./EventDropChart"
import { readAccessor, type PhysicsChartLayout } from "./physicsChartShared"
import { registerPhysicsLivePrograms } from "./registerPhysicsLivePrograms"
import {
  EventDropLiveRuntime,
  type EventDropLiveConfig
} from "./EventDropLiveRuntime"
import type { PhysicsFrameHandle } from "./physicsHocHandle"
import type { StreamPhysicsFrameHandle } from "../../stream/physics/StreamPhysicsTypes"
import type { PhysicsPipelineStore } from "../../stream/physics/PhysicsPipelineStore"
import type { EventDropProjectionMetadata } from "./eventDropPhysics"

export function eventDropLiveSpawn(
  datum: Datum,
  index: number,
  props: EventDropChartProps
) {
  const eventTime = Number(
    readAccessor(datum, index, props.timeAccessor ?? "time")
  )
  const source = String(
    readAccessor(datum, index, props.sourceAccessor ?? "source") ?? ""
  )
  const id = String(datum.id ?? `event-live-${index}`)
  return {
    id,
    x: 0,
    y: 0,
    shape: { type: "circle" as const, radius: props.ballRadius ?? 7 },
    datum: { ...datum, id, eventTime, source }
  }
}

/**
 * Live spawns for rows with a finite event time. Other rows are skipped, as
 * replay skips them; materializing one would throw inside the frame loop.
 */
export function eventDropLiveSpawns(
  rows: readonly Datum[],
  firstIndex: number,
  props: EventDropChartProps
) {
  const spawns: ReturnType<typeof eventDropLiveSpawn>[] = []
  rows.forEach((row, offset) => {
    const spawn = eventDropLiveSpawn(row, firstIndex + offset, props)
    if (Number.isFinite(spawn.datum.eventTime)) spawns.push(spawn)
    else if (process.env.NODE_ENV !== "production")
      console.warn(
        `[semiotic/physics] EventDropChart live row "${spawn.id}" has no finite event time and was skipped.`
      )
  })
  return spawns
}

export function buildLiveEventDropLayout(
  config: EventDropLiveConfig,
  props: EventDropChartProps
): PhysicsChartLayout {
  if (props.emitters && props.data !== undefined)
    throw new Error("EventDrop emitters require push mode: omit data")
  // The store resolves these programs when the frame creates or restores it.
  registerPhysicsLivePrograms()
  const runtime = new EventDropLiveRuntime(config)
  const metadata = runtime.metadata()
  return {
    config: {
      kernel: { gravity: { x: 0, y: 900 }, seed: config.seed },
      bodyLimit: 400,
      eviction: "sleeping-first",
      ...props.frameProps?.config,
      timeScale:
        (props.frameProps?.config?.timeScale ?? 1) * (props.timeScale ?? 1),
      emitters: props.frameProps?.config?.emitters ?? false,
      ...(props.emitters && {
        emitters: {
          ...props.emitters,
          active: {
            ...Object.fromEntries(
              (props.sources ?? []).map((source) => [
                source.id,
                source.active !== false
              ])
            ),
            ...props.emitters.active
          },
          timeUnit: config.timeUnit,
          originTime: config.originTime,
          templates: Object.fromEntries(
            props.emitters.sources.map((source) => [
              source.id,
              {
                x: 0,
                y: 0,
                shape: { type: "circle" as const, radius: config.ballRadius }
              }
            ])
          )
        }
      }),
      eventDrop: config
    },
    initialSpawns: eventDropLiveSpawns(props.data ?? [], 0, props),
    projectionRows: [],
    metadata: { ...metadata }
  }
}

/** Push directly into the retained pipeline; never accumulate the input history. */
export function useEventDropLive(
  dataRef: RefObject<PhysicsFrameHandle | null>,
  frameRef: RefObject<StreamPhysicsFrameHandle | null>,
  props: EventDropChartProps
) {
  const latest = useRef(props)
  latest.current = props
  const nextId = useRef(props.data?.length ?? 0)
  const seed = useRef(props.data)
  const [metadata, setMetadata] = useState<EventDropProjectionMetadata>()
  const lastVersion = useRef("")
  const onFrame = useCallback((store: PhysicsPipelineStore) => {
    latest.current.frameProps?.onFrame?.(store)
    if (!latest.current.live) return
    const key = `${store.getUpdateSnapshot().revisions.sceneGeometry}:${store.runtimeState().elapsedSeconds}`
    if (key === lastVersion.current) return
    lastVersion.current = key
    setMetadata(store.eventDropState()?.metadata)
  }, [])
  useImperativeHandle(
    props.live ? dataRef : undefined,
    (): PhysicsFrameHandle => {
      const getData = () =>
        (frameRef.current?.getStore().readBodies() ?? []).map(
          (b) => b.datum as Datum
        )
      return {
        push: (row) => dataRef.current?.pushMany([row]),
        pushMany: (rows) => {
          if (latest.current.data !== undefined) return
          const frame = frameRef.current
          if (!frame) return
          // In-flight worker responses can temporarily precede optimistic pushes.
          const firstId = Math.max(
            frame.getStore().enqueueSequence(),
            nextId.current
          )
          const spawns = eventDropLiveSpawns(rows, firstId, latest.current)
          nextId.current = firstId + rows.length
          if (spawns.length) frame.pushMany(spawns)
        },
        remove: (ids) => {
          const wanted = new Set(Array.isArray(ids) ? ids : [ids])
          const rows = getData().filter((row) => wanted.has(String(row.id)))
          frameRef.current?.remove(Array.from(wanted))
          return rows
        },
        update: () => {
          throw new Error(
            "Live admissions are immutable; clear and replay to correct history"
          )
        },
        clear: () => {
          nextId.current = 0
          frameRef.current?.clear()
        },
        getData,
        getScales: () => null,
        getCustomLayout: () => frameRef.current?.snapshot() ?? null,
        popBodies: (ids, options) =>
          frameRef.current?.popBodies(ids, options) ?? []
      }
    }
  )
  useLayoutEffect(() => {
    if (!props.live || seed.current === props.data) return
    seed.current = props.data
    const frame = frameRef.current
    if (!frame) return
    nextId.current = 0
    const store = frame.getStore()
    store.clear()
    store.enqueue(
      (props.data ?? []).map((row) =>
        eventDropLiveSpawn(row, nextId.current++, props)
      )
    )
    // Replacement data has the same seed-body semantics as first mount,
    // including paused charts. Restore once to transfer this state to a worker.
    store.materializeDueSpawns()
    frame.restore(store.snapshot())
  }, [props.data, props.live, frameRef, props])
  return { metadata, onFrame }
}
