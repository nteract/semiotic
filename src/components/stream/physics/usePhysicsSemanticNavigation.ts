import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type MutableRefObject,
  type PointerEvent,
  type SetStateAction
} from "react"
import { isInteractiveKeyboardTarget } from "../../charts/shared/semanticInteractions"
import type { PhysicsBodyState } from "./PhysicsKernel"
import type {
  PhysicsPipelineStore,
  PhysicsSimulationState
} from "./PhysicsPipelineStore"
import type {
  PhysicsFrameObservationPayload,
  PhysicsFrameObservationType
} from "./physicsFrameObservations"
import {
  createBodySemanticItems,
  physicsHoverData,
  semanticItemsChanged
} from "./physicsSemanticUI"
import type {
  PhysicsHoverData,
  PhysicsSemanticItem,
  StreamPhysicsFrameProps
} from "./StreamPhysicsTypes"

const NAV_KEYS = new Set([
  "ArrowRight",
  "ArrowLeft",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown"
])

interface PhysicsSemanticNavigationOptions {
  allSemanticItems: PhysicsSemanticItem[]
  bodySemanticItemLimit: number
  bodySemanticItems: StreamPhysicsFrameProps["bodySemanticItems"]
  bodySemanticUpdateMs: number
  emitObservation: (
    type: PhysicsFrameObservationType,
    payload?: PhysicsFrameObservationPayload
  ) => void
  enableHover: boolean
  hoverRadius: number
  logicalClockRef: MutableRefObject<() => number>
  onBodyHover: StreamPhysicsFrameProps["onBodyHover"]
  onBodyPointerDown: StreamPhysicsFrameProps["onBodyPointerDown"]
  onClick: StreamPhysicsFrameProps["onClick"]
  onSemanticItemActivate: StreamPhysicsFrameProps["onSemanticItemActivate"]
  onSemanticItemFocus: StreamPhysicsFrameProps["onSemanticItemFocus"]
  setBodySemanticItemsSnapshot: Dispatch<SetStateAction<PhysicsSemanticItem[]>>
  storeRef: MutableRefObject<PhysicsPipelineStore | null>
}

export interface PhysicsSemanticNavigationResult {
  clearHover: () => void
  focusedBodyIdRef: MutableRefObject<string | null>
  focusedSemanticItem: PhysicsSemanticItem | null
  handleCanvasPointerDown: (event: PointerEvent<HTMLCanvasElement>) => void
  hoverData: PhysicsHoverData | null
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  setFocusedSemanticItem: Dispatch<SetStateAction<PhysicsSemanticItem | null>>
  setHoverData: Dispatch<SetStateAction<PhysicsHoverData | null>>
  syncBodySemanticItems: (
    bodies: readonly PhysicsBodyState[],
    simulationState: PhysicsSimulationState,
    force?: boolean
  ) => void
}

/** Own the frame's body semantics, keyboard navigation, and activation state. */
export function usePhysicsSemanticNavigation({
  allSemanticItems,
  bodySemanticItemLimit,
  bodySemanticItems,
  bodySemanticUpdateMs,
  emitObservation,
  enableHover,
  hoverRadius,
  logicalClockRef,
  onBodyHover,
  onBodyPointerDown,
  onClick,
  onSemanticItemActivate,
  onSemanticItemFocus,
  setBodySemanticItemsSnapshot,
  storeRef
}: PhysicsSemanticNavigationOptions): PhysicsSemanticNavigationResult {
  const semanticFocusIndexRef = useRef(-1)
  const [focusedSemanticItem, setFocusedSemanticItem] =
    useState<PhysicsSemanticItem | null>(null)
  const [hoverData, setHoverData] = useState<PhysicsHoverData | null>(null)
  const focusedBodyIdRef = useRef<string | null>(null)
  const lastBodySemanticUpdateRef = useRef(0)

  const syncBodySemanticItems = useCallback(
    (
      bodies: readonly PhysicsBodyState[],
      simulationState: PhysicsSimulationState,
      force = false
    ) => {
      if (!bodySemanticItems) {
        setBodySemanticItemsSnapshot((current) =>
          current.length ? [] : current
        )
        return
      }
      const now = logicalClockRef.current()
      if (
        !force &&
        bodySemanticUpdateMs > 0 &&
        now - lastBodySemanticUpdateRef.current < bodySemanticUpdateMs
      ) {
        return
      }
      lastBodySemanticUpdateRef.current = now
      const next = createBodySemanticItems(
        bodies,
        simulationState,
        bodySemanticItems,
        bodySemanticItemLimit
      )
      setBodySemanticItemsSnapshot((current) =>
        semanticItemsChanged(current, next) ? next : current
      )
    },
    [
      bodySemanticItemLimit,
      bodySemanticItems,
      bodySemanticUpdateMs,
      logicalClockRef,
      setBodySemanticItemsSnapshot
    ]
  )

  const focusSemanticItem = useCallback(
    (index: number) => {
      if (!allSemanticItems.length) return
      const nextIndex = Math.max(
        0,
        Math.min(index, allSemanticItems.length - 1)
      )
      semanticFocusIndexRef.current = nextIndex
      const item = allSemanticItems[nextIndex]
      focusedBodyIdRef.current = item.bodyId ?? null
      setFocusedSemanticItem(item)
      onSemanticItemFocus?.(item)
      if (item.bodyId && storeRef.current) {
        const body = storeRef.current
          .readBodies()
          .find((candidate) => candidate.id === item.bodyId)
        if (body) {
          const hover = physicsHoverData(body)
          setHoverData(hover)
          onBodyHover?.(body, hover)
        }
      }
    },
    [allSemanticItems, onBodyHover, onSemanticItemFocus, storeRef]
  )

  const clearSemanticFocus = useCallback(() => {
    semanticFocusIndexRef.current = -1
    focusedBodyIdRef.current = null
    setFocusedSemanticItem(null)
    onSemanticItemFocus?.(null)
  }, [onSemanticItemFocus])

  const clearHover = useCallback(() => {
    setHoverData((current) => {
      if (!current) return current
      onBodyHover?.(null, null)
      emitObservation("hover-end")
      return null
    })
  }, [emitObservation, onBodyHover])

  const handleCanvasPointerDown = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      clearSemanticFocus()
      const store = storeRef.current
      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const body = store ? store.hitTest(x, y, Math.max(16, hoverRadius)) : null
      onBodyPointerDown?.(body, event)
      if (body) {
        emitObservation("click", { datum: body.datum, x: body.x, y: body.y })
        emitObservation("activate", {
          datum: body.datum,
          inputType: event.pointerType === "touch" ? "touch" : "pointer"
        })
        onClick?.(body.datum ?? null, { x: body.x, y: body.y, body })
      } else {
        emitObservation("click-end")
        onClick?.(null, { x, y, body: null })
        clearHover()
      }
    },
    [
      clearHover,
      clearSemanticFocus,
      emitObservation,
      hoverRadius,
      onBodyPointerDown,
      onClick,
      storeRef
    ]
  )

  useEffect(() => {
    if (!allSemanticItems.length) {
      clearSemanticFocus()
      return
    }
    const current = semanticFocusIndexRef.current
    if (current >= allSemanticItems.length) {
      focusSemanticItem(allSemanticItems.length - 1)
    } else if (current >= 0) {
      const item = allSemanticItems[current]
      focusedBodyIdRef.current = item.bodyId ?? null
      setFocusedSemanticItem((previous) => {
        if (
          previous != null &&
          previous.id === item.id &&
          Math.round(previous.x) === Math.round(item.x) &&
          Math.round(previous.y) === Math.round(item.y)
        ) {
          return previous
        }
        return item
      })
      if (item.bodyId && storeRef.current) {
        const body = storeRef.current
          .readBodies()
          .find((candidate) => candidate.id === item.bodyId)
        if (body) {
          const hover = physicsHoverData(body)
          setHoverData((previous) =>
            previous?.id === hover.id &&
            Math.round(previous.x) === Math.round(hover.x) &&
            Math.round(previous.y) === Math.round(hover.y)
              ? previous
              : hover
          )
        }
      }
    }
  }, [allSemanticItems, clearSemanticFocus, focusSemanticItem, storeRef])

  useEffect(() => {
    if (!enableHover) clearHover()
  }, [clearHover, enableHover])

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (isInteractiveKeyboardTarget(event) || !allSemanticItems.length) return
      if (event.key === "Escape") {
        event.preventDefault()
        clearSemanticFocus()
        return
      }
      if (
        (event.key === "Enter" || event.key === " ") &&
        semanticFocusIndexRef.current >= 0
      ) {
        event.preventDefault()
        const item = allSemanticItems[semanticFocusIndexRef.current]
        emitObservation("activate", {
          datum: item.datum ?? { id: item.id, label: item.label },
          inputType: "keyboard"
        })
        onSemanticItemActivate?.(item)
        return
      }
      if (!NAV_KEYS.has(event.key)) return
      event.preventDefault()
      const current = semanticFocusIndexRef.current
      if (current < 0) {
        focusSemanticItem(0)
        const item = allSemanticItems[0]
        emitObservation("focus", {
          datum: item.datum ?? { id: item.id, label: item.label },
          inputType: "keyboard"
        })
        return
      }
      const pageStep = Math.max(1, Math.floor(allSemanticItems.length * 0.1))
      let next = current
      if (event.key === "Home") next = 0
      else if (event.key === "End") next = allSemanticItems.length - 1
      else if (event.key === "PageDown")
        next = Math.min(allSemanticItems.length - 1, current + pageStep)
      else if (event.key === "PageUp") next = Math.max(0, current - pageStep)
      else if (event.key === "ArrowRight" || event.key === "ArrowDown")
        next = Math.min(allSemanticItems.length - 1, current + 1)
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
        next = Math.max(0, current - 1)
      focusSemanticItem(next)
      if (next !== current) {
        const item = allSemanticItems[next]
        emitObservation("focus", {
          datum: item.datum ?? { id: item.id, label: item.label },
          inputType: "keyboard"
        })
      }
    },
    [
      allSemanticItems,
      clearSemanticFocus,
      emitObservation,
      focusSemanticItem,
      onSemanticItemActivate
    ]
  )

  return {
    clearHover,
    focusedBodyIdRef,
    focusedSemanticItem,
    handleCanvasPointerDown,
    hoverData,
    onKeyDown,
    setFocusedSemanticItem,
    setHoverData,
    syncBodySemanticItems
  }
}
