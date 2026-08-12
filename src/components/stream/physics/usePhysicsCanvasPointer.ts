import * as React from "react"
import { setCanvasMarkCursor, useCanvasMarkCursorCleanup } from "../sceneCursor"
import type { Style } from "../types"
import type { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import type { PhysicsBodyState } from "./PhysicsKernel"
import {
  physicsBodyVisualHitDistanceSquared,
  physicsBodyVisualSearchRadius
} from "./physicsBodyCanvas"
import {
  bodyHitDistanceSquared,
  bodySearchRadius
} from "./physicsPipelineHelpers"
import { physicsHoverData } from "./physicsSemanticUI"
import type {
  PhysicsHoverData,
  StreamPhysicsFrameProps
} from "./StreamPhysicsTypes"
import type { PhysicsFrameObservationPayload } from "./physicsFrameObservations"

type PhysicsFrameObservationEmitter = (
  type: "hover",
  payload: PhysicsFrameObservationPayload
) => void

interface PhysicsCanvasPointerOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  clearHover: () => void
  emitObservation: PhysicsFrameObservationEmitter
  enableHover: boolean
  hoverRadius: number
  onBodyHover: StreamPhysicsFrameProps["onBodyHover"]
  setHoverData: React.Dispatch<React.SetStateAction<PhysicsHoverData | null>>
  storeRef: React.RefObject<PhysicsPipelineStore | null>
}

export interface PhysicsBodyCursorCollection {
  targets?: Map<string, Style>
  maxSearchRadius: number
  collisionGeometry?: boolean
}

function collectPhysicsBodyCursor(
  collection: PhysicsBodyCursorCollection,
  body: PhysicsBodyState,
  style: Style,
  customRenderer: boolean
): void {
  if (!style.cursor) return
  ;(collection.targets ??= new Map()).set(body.id, style)
  collection.collisionGeometry ||= customRenderer
  collection.maxSearchRadius = Math.max(
    collection.maxSearchRadius,
    customRenderer
      ? bodySearchRadius(body)
      : physicsBodyVisualSearchRadius(body, style)
  )
}

/** Owns canvas hit-testing that is shared by physics hover and authored cursors. */
export function usePhysicsCanvasPointer({
  canvasRef,
  clearHover,
  emitObservation,
  enableHover,
  hoverRadius,
  onBodyHover,
  setHoverData,
  storeRef
}: PhysicsCanvasPointerOptions) {
  const pointerRef = React.useRef({
    inside: false,
    x: 0,
    y: 0,
    pointerType: undefined as string | undefined
  })
  const bodyCursorCollectionRef =
    React.useRef<PhysicsBodyCursorCollection | null>(null)
  bodyCursorCollectionRef.current ??= { maxSearchRadius: 0 }
  useCanvasMarkCursorCleanup(canvasRef)

  const beginBodyCursors = React.useCallback(() => {
    const collection = bodyCursorCollectionRef.current!
    collection.targets?.clear()
    collection.maxSearchRadius = 0
    collection.collisionGeometry = false
    return collection
  }, [])

  const setCursorAt = React.useCallback(
    (
      canvas: HTMLCanvasElement,
      store: PhysicsPipelineStore,
      x: number,
      y: number
    ) => {
      const collection = bodyCursorCollectionRef.current!
      const targets = collection.targets
      if (!targets?.size) return
      const body = store.hitTest(x, y, 0, {
        include: (candidate) => targets.has(candidate.id),
        searchRadius: collection.maxSearchRadius,
        distanceSquared: (candidate: PhysicsBodyState, px, py) => {
          const style = targets.get(candidate.id)
          if (!style) return null
          return collection.collisionGeometry
            ? bodyHitDistanceSquared(candidate, px, py, 0)
            : physicsBodyVisualHitDistanceSquared(candidate, style, px, py)
        }
      })
      setCanvasMarkCursor(
        canvas,
        body ? targets.get(body.id)?.cursor : undefined
      )
    },
    []
  )

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!enableHover && !bodyCursorCollectionRef.current?.targets?.size)
        return
      if (!enableHover && event.pointerType === "touch") {
        pointerRef.current.inside = false
        setCanvasMarkCursor(event.currentTarget)
        return
      }
      const store = storeRef.current
      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const pointer = pointerRef.current
      pointer.inside = true
      pointer.x = x
      pointer.y = y
      pointer.pointerType = event.pointerType
      if (!store) return

      if (event.pointerType === "touch")
        setCanvasMarkCursor(event.currentTarget)
      else setCursorAt(event.currentTarget, store, x, y)
      if (!enableHover) return
      // Cursor geometry is presentation-only and may use an authored visual
      // radius. It must not change the established collision/hover selection.
      const body = store.hitTest(x, y, hoverRadius)
      if (!body) {
        clearHover()
        return
      }
      const hover = physicsHoverData(body)
      setHoverData((current) => {
        if (
          current?.id === hover.id &&
          current.x === hover.x &&
          current.y === hover.y
        )
          return current
        onBodyHover?.(body, hover)
        emitObservation("hover", { datum: body.datum, x: body.x, y: body.y })
        return hover
      })
    },
    [
      clearHover,
      emitObservation,
      enableHover,
      hoverRadius,
      onBodyHover,
      setCursorAt,
      setHoverData,
      storeRef
    ]
  )

  const handlePointerLeave = React.useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      pointerRef.current.inside = false
      setCanvasMarkCursor(event.currentTarget)
      clearHover()
    },
    [clearHover]
  )

  const syncBodyCursors = React.useCallback(
    (
      canvas: HTMLCanvasElement,
      store: PhysicsPipelineStore,
      collection: PhysicsBodyCursorCollection
    ) => {
      const pointer = pointerRef.current
      if (
        pointer.inside &&
        pointer.pointerType !== "touch" &&
        collection.targets?.size
      ) {
        setCursorAt(canvas, store, pointer.x, pointer.y)
      } else {
        setCanvasMarkCursor(canvas)
      }
    },
    [setCursorAt]
  )

  return React.useMemo(
    () => ({
      begin: beginBodyCursors,
      collect: collectPhysicsBodyCursor,
      handlePointerLeave,
      handlePointerMove,
      syncBodyCursors
    }),
    [beginBodyCursors, handlePointerLeave, handlePointerMove, syncBodyCursors]
  )
}
