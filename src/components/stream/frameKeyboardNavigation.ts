"use client"

import { useCallback, useRef } from "react"
import type { Dispatch, KeyboardEvent, SetStateAction } from "react"
import type { HoverData } from "../realtime/types"
import type {
  SemanticClickBehavior,
  SemanticHoverBehavior
} from "../charts/shared/semanticInteractions"
import { isInteractiveKeyboardTarget } from "../charts/shared/semanticInteractions"
import type { PipelineStore } from "./PipelineStore"
import type { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { GeoPipelineStore } from "./GeoPipelineStore"
import type { SceneNode } from "./types"
import type { OrdinalSceneNode } from "./ordinalTypes"
import type { GeoSceneNode } from "./geoTypes"
import type { GeoFeatureLike } from "./geoFrameHelpers"
import { enrichDatumWithBand } from "./xySceneBuilders/ribbonScene"
import {
  buildNavGraph,
  extractGeoNavPoints,
  extractOrdinalNavPoints,
  extractXYNavPoints,
  navPointToHover,
  nextGraphIndex,
  nextIndex,
  resolvePosition,
  type NavGraph,
  type NavPoint
} from "./keyboardNav"

type RefValue<Value> = { current: Value }
type SetHoverPoint = Dispatch<SetStateAction<HoverData | null>>
type FocusedNavPoint = Pick<NavPoint, "shape" | "w" | "h" | "pathData">

interface KeyboardInteractionParams<Store, Node = unknown> {
  storeRef: RefValue<Store | null>
  hoverRef: RefValue<HoverData | null>
  hoveredNodeRef?: RefValue<Node | null>
  setHoverPoint: SetHoverPoint
  customHoverBehavior: SemanticHoverBehavior<HoverData>
  customClickBehavior: SemanticClickBehavior<HoverData>
  scheduleRender: () => void
}

interface VersionedSceneStore<Node> {
  scene: Node[]
  version: number
}

interface GraphKeyboardParams<Node, Store extends VersionedSceneStore<Node>>
  extends KeyboardInteractionParams<Store, Node> {
  extractPoints: (scene: Node[]) => NavPoint[]
  toHover: (point: NavPoint, store: Store) => HoverData
}

function useGraphKeyboardNavigation<Node, Store extends VersionedSceneStore<Node>>({
  storeRef,
  hoverRef,
  hoveredNodeRef,
  setHoverPoint,
  customHoverBehavior,
  customClickBehavior,
  scheduleRender,
  extractPoints,
  toHover
}: GraphKeyboardParams<Node, Store>) {
  const kbFocusIndexRef = useRef(-1)
  const focusedNavPointRef = useRef<FocusedNavPoint | null>(null)
  const navGraphCacheRef = useRef<{ version: number; graph: NavGraph } | null>(null)

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (isInteractiveKeyboardTarget(event)) return
    const store = storeRef.current
    if (!store) return
    const clearFocus = () => {
      kbFocusIndexRef.current = -1
      focusedNavPointRef.current = null
      hoverRef.current = null
      if (hoveredNodeRef) hoveredNodeRef.current = null
      setHoverPoint(null)
      customHoverBehavior(null)
      scheduleRender()
    }
    if (store.scene.length === 0) {
      if (kbFocusIndexRef.current >= 0) clearFocus()
      return
    }

    let graph: NavGraph
    if (navGraphCacheRef.current?.version === store.version) {
      graph = navGraphCacheRef.current.graph
    } else {
      const navPoints = extractPoints(store.scene)
      if (navPoints.length === 0) {
        if (kbFocusIndexRef.current >= 0) clearFocus()
        return
      }
      graph = buildNavGraph(navPoints)
      navGraphCacheRef.current = { version: store.version, graph }
    }

    const requestedIndex = kbFocusIndexRef.current
    let current = requestedIndex
    if (current >= graph.flat.length) {
      clearFocus()
      current = -1
    }
    if ((event.key === "Enter" || event.key === " ") && current >= 0) {
      event.preventDefault()
      customClickBehavior(toHover(graph.flat[current], store), {
        type: "activate",
        inputType: "keyboard"
      })
      return
    }

    if (current < 0) {
      if (event.key === "Escape") return
      const navigationKeys = [
        "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown",
        "Home", "End", "PageUp", "PageDown"
      ]
      if (!navigationKeys.includes(event.key)) return
      event.preventDefault()
      kbFocusIndexRef.current = 0
      const point = graph.flat[0]
      focusedNavPointRef.current = point
      const hover = toHover(point, store)
      hoverRef.current = hover
      setHoverPoint(hover)
      customHoverBehavior(hover, { type: "focus", inputType: "keyboard" })
      scheduleRender()
      return
    }

    const next = nextGraphIndex(event.key, resolvePosition(graph, current), graph)
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
    customHoverBehavior(hover, { type: "focus", inputType: "keyboard" })
    scheduleRender()
  }, [
    customClickBehavior,
    customHoverBehavior,
    extractPoints,
    hoverRef,
    hoveredNodeRef,
    scheduleRender,
    setHoverPoint,
    storeRef,
    toHover
  ])

  return { kbFocusIndexRef, focusedNavPointRef, onKeyDown }
}

export function useXYKeyboardNavigation(
  params: KeyboardInteractionParams<PipelineStore, SceneNode>
) {
  return useGraphKeyboardNavigation({
    ...params,
    extractPoints: extractXYNavPoints,
    toHover: (point, store) => navPointToHover({
      ...point,
      datum: enrichDatumWithBand(point.datum, store.resolvedRibbons)
    })
  })
}

interface OrdinalKeyboardParams
  extends KeyboardInteractionParams<OrdinalPipelineStore, OrdinalSceneNode> {
  chartType: string
  oAccessor: unknown
  rAccessor: unknown
}

export function useOrdinalKeyboardNavigation({
  chartType,
  oAccessor,
  rAccessor,
  ...params
}: OrdinalKeyboardParams) {
  return useGraphKeyboardNavigation({
    ...params,
    extractPoints: extractOrdinalNavPoints,
    toHover: point => ({
      ...navPointToHover(point),
      __oAccessor: typeof oAccessor === "string" ? oAccessor : undefined,
      __rAccessor: typeof rAccessor === "string" ? rAccessor : undefined,
      __chartType: chartType
    })
  })
}

function geoPointToHover(point: NavPoint): HoverData {
  const rawDatum = point.datum as GeoFeatureLike | null
  return {
    ...(rawDatum || {}),
    ...(rawDatum?.properties || {}),
    data: rawDatum,
    properties: rawDatum?.properties,
    x: point.x,
    y: point.y,
    __semioticHoverData: true
  }
}

export function useGeoKeyboardNavigation({
  storeRef,
  hoverRef,
  hoveredNodeRef,
  setHoverPoint,
  customHoverBehavior,
  customClickBehavior,
  scheduleRender
}: KeyboardInteractionParams<GeoPipelineStore, GeoSceneNode>) {
  const kbFocusIndexRef = useRef(-1)
  const focusedNavPointRef = useRef<FocusedNavPoint | null>(null)

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (isInteractiveKeyboardTarget(event)) return
    const store = storeRef.current
    if (!store) return
    const clearFocus = () => {
      kbFocusIndexRef.current = -1
      focusedNavPointRef.current = null
      hoverRef.current = null
      if (hoveredNodeRef) hoveredNodeRef.current = null
      setHoverPoint(null)
      customHoverBehavior(null)
      scheduleRender()
    }
    if (store.scene.length === 0) {
      if (kbFocusIndexRef.current >= 0) clearFocus()
      return
    }
    const navPoints = extractGeoNavPoints(store.scene)
    if (navPoints.length === 0) {
      if (kbFocusIndexRef.current >= 0) clearFocus()
      return
    }

    let current = kbFocusIndexRef.current
    if (current >= navPoints.length) {
      clearFocus()
      current = -1
    }
    if ((event.key === "Enter" || event.key === " ") && current >= 0) {
      event.preventDefault()
      customClickBehavior(geoPointToHover(navPoints[current]), {
        type: "activate",
        inputType: "keyboard"
      })
      return
    }

    const next = nextIndex(event.key, current < 0 ? -1 : current, navPoints.length)
    if (next === null) return
    event.preventDefault()

    if (next < 0) {
      clearFocus()
      return
    }

    const index = current < 0 ? 0 : next
    kbFocusIndexRef.current = index
    const point = navPoints[index]
    focusedNavPointRef.current = point
    const hover = geoPointToHover(point)
    hoverRef.current = hover
    setHoverPoint(hover)
    customHoverBehavior(hover, { type: "focus", inputType: "keyboard" })
    scheduleRender()
  }, [
    customClickBehavior,
    customHoverBehavior,
    hoverRef,
    hoveredNodeRef,
    scheduleRender,
    setHoverPoint,
    storeRef
  ])

  return { kbFocusIndexRef, focusedNavPointRef, onKeyDown }
}
