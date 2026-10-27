"use client"

import { useCallback, useRef } from "react"
import type { Dispatch, KeyboardEvent, SetStateAction } from "react"
import type { HoverData } from "../realtime/types"
import { isInteractiveKeyboardTarget } from "../charts/shared/semanticInteractions"
import type {
  SemanticClickBehavior,
  SemanticHoverBehavior
} from "../charts/shared/semanticInteractions"
import {
  buildNavGraph,
  nextGraphIndex,
  nextIndex,
  resolvePosition,
  type NavGraph,
  type NavPoint
} from "./navigationGraph"

type RefValue<Value> = { current: Value }
type SetHoverPoint = Dispatch<SetStateAction<HoverData | null>>
type FocusedNavPoint = NavPoint

/** Keep the same datum focused when retained geometry moves, without a new focus event. */
function refreshFocusedPoint(
  points: NavPoint[],
  indexRef: RefValue<number>,
  pointRef: RefValue<FocusedNavPoint | null>,
  hoverRef: RefValue<HoverData | null>,
  setHoverPoint: SetHoverPoint,
  toHover: (point: NavPoint) => HoverData
) {
  const previous = pointRef.current
  if (indexRef.current < 0 || !previous) return
  const matches = (point: NavPoint) =>
    (point.datum === previous.datum ||
      (previous.semanticKey !== undefined &&
        point.semanticKey === previous.semanticKey)) &&
    point.group === previous.group &&
    point.shape === previous.shape
  const index =
    points[indexRef.current] && matches(points[indexRef.current])
      ? indexRef.current
      : points.findIndex(matches)
  const next = points[index]
  indexRef.current = index
  pointRef.current = next ?? null
  if (
    next &&
    next.datum === previous.datum &&
    next.x === previous.x &&
    next.y === previous.y &&
    next.w === previous.w &&
    next.h === previous.h &&
    next.pathData === previous.pathData &&
    next.stats === previous.stats
  )
    return
  const hover = next ? toHover(next) : null
  hoverRef.current = hover
  setHoverPoint(hover)
}

export interface KeyboardInteractionParams<Store, Node = unknown> {
  storeRef: RefValue<Store | null>
  hoverRef: RefValue<HoverData | null>
  hoveredNodeRef?: RefValue<Node | null>
  setHoverPoint: SetHoverPoint
  /** Optional — absent when neither a user callback nor onObservation is wired. */
  customHoverBehavior?: SemanticHoverBehavior<HoverData>
  customClickBehavior?: SemanticClickBehavior<HoverData>
  scheduleRender: () => void
  /** Cancel queued pointer hit testing when keyboard interaction dismisses hover. */
  clearPointerHover?: () => void
}

interface VersionedSceneStore<Node> {
  scene: Node[]
  version: number
}

interface GraphKeyboardParams<
  Node,
  Store extends VersionedSceneStore<Node>
> extends KeyboardInteractionParams<Store, Node> {
  extractPoints: (scene: Node[]) => NavPoint[]
  toHover: (point: NavPoint, store: Store) => HoverData
  navigation?: "graph" | "linear"
  nextConnected?: (
    key: string,
    graph: NavGraph,
    index: number,
    neighbor: RefValue<number>
  ) => number | null
}

export function useGraphKeyboardNavigation<
  Node,
  Store extends VersionedSceneStore<Node>
>({
  storeRef,
  hoverRef,
  hoveredNodeRef,
  setHoverPoint,
  customHoverBehavior,
  customClickBehavior,
  scheduleRender,
  clearPointerHover,
  extractPoints,
  toHover,
  navigation = "graph",
  nextConnected
}: GraphKeyboardParams<Node, Store>) {
  const neighborIndexRef = useRef(-1)
  const kbFocusIndexRef = useRef(-1)
  const focusedNavPointRef = useRef<FocusedNavPoint | null>(null)
  const navGraphCacheRef = useRef<{ version: number; graph: NavGraph } | null>(
    null
  )
  const refreshKeyboardFocus = useCallback(() => {
    const store = storeRef.current
    if (!store) return
    if (kbFocusIndexRef.current < 0) {
      navGraphCacheRef.current = null
      return
    }
    const graph = buildNavGraph(extractPoints(store.scene))
    navGraphCacheRef.current = { version: store.version, graph }
    refreshFocusedPoint(
      graph.flat,
      kbFocusIndexRef,
      focusedNavPointRef,
      hoverRef,
      setHoverPoint,
      (point) => toHover(point, store)
    )
    if (kbFocusIndexRef.current < 0 && hoveredNodeRef)
      hoveredNodeRef.current = null
  }, [
    extractPoints,
    hoverRef,
    hoveredNodeRef,
    setHoverPoint,
    storeRef,
    toHover
  ])

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isInteractiveKeyboardTarget(event)) return
      const store = storeRef.current
      if (!store) return
      const clearFocus = () => {
        const hadHover = hoverRef.current !== null
        kbFocusIndexRef.current = -1
        focusedNavPointRef.current = null
        neighborIndexRef.current = -1
        hoverRef.current = null
        if (hoveredNodeRef) hoveredNodeRef.current = null
        setHoverPoint(null)
        if (hadHover) customHoverBehavior?.(null)
        scheduleRender()
      }
      if (store.scene.length === 0) {
        if (kbFocusIndexRef.current >= 0 || event.key === "Escape") clearFocus()
        return
      }

      let graph: NavGraph
      if (navGraphCacheRef.current?.version === store.version) {
        graph = navGraphCacheRef.current.graph
      } else {
        const navPoints = extractPoints(store.scene)
        if (navPoints.length === 0) {
          if (kbFocusIndexRef.current >= 0 || event.key === "Escape")
            clearFocus()
          return
        }
        graph = buildNavGraph(navPoints)
        navGraphCacheRef.current = { version: store.version, graph }
      }

      if (event.key === "Escape") {
        const parent = nextConnected?.(
          "Escape",
          graph,
          kbFocusIndexRef.current,
          neighborIndexRef
        )
        if (parent == null || parent < 0) {
          event.preventDefault()
          clearPointerHover?.()
          clearFocus()
          return
        }
        // This Escape ascends a keyboard group; document-level pointer dismissal
        // must not clear the newly focused owner while the mouse is still inside.
        event.stopPropagation()
      }
      const requestedIndex = kbFocusIndexRef.current
      let current = requestedIndex
      if (current >= graph.flat.length) {
        clearFocus()
        current = -1
      }
      if (
        ((event.key === "Enter" && !nextConnected) || event.key === " ") &&
        current >= 0
      ) {
        event.preventDefault()
        customClickBehavior?.(toHover(graph.flat[current], store), {
          type: "activate",
          inputType: "keyboard"
        })
        return
      }

      let next: number | null
      if (current < 0) {
        const navigationKeys = [
          "ArrowRight",
          "ArrowLeft",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
          "PageUp",
          "PageDown"
        ]
        if (
          !navigationKeys.includes(event.key) &&
          !(nextConnected && event.key === "Enter")
        )
          return
        neighborIndexRef.current = -1
        next = nextConnected?.(event.key, graph, -1, neighborIndexRef) ?? 0
      } else {
        next = nextConnected
          ? nextConnected(event.key, graph, current, neighborIndexRef)
          : navigation === "linear"
            ? nextIndex(event.key, current, graph.flat.length)
            : nextGraphIndex(event.key, resolvePosition(graph, current), graph)
      }
      if (next === null) return
      event.preventDefault()

      if (next < 0) {
        clearFocus()
        return
      }

      kbFocusIndexRef.current = next
      const point = graph.flat[next]
      focusedNavPointRef.current = point
      const hover = toHover(point, store)
      hoverRef.current = hover
      setHoverPoint(hover)
      customHoverBehavior?.(hover, { type: "focus", inputType: "keyboard" })
      scheduleRender()
    },
    [
      clearPointerHover,
      customClickBehavior,
      customHoverBehavior,
      extractPoints,
      nextConnected,
      navigation,
      hoverRef,
      hoveredNodeRef,
      scheduleRender,
      setHoverPoint,
      storeRef,
      toHover
    ]
  )

  return {
    kbFocusIndexRef,
    focusedNavPointRef,
    neighborIndexRef,
    onKeyDown,
    refreshKeyboardFocus
  }
}
