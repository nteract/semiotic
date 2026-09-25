import type { HoverData } from "../realtime/types"
import type { NetworkSceneNode } from "./networkTypes"
import { buildHoverData } from "./hoverUtils"
import {
  buildNavGraph,
  extractNetworkNavPoints,
  type NavPoint
} from "./keyboardNav"

type RefValue<T> = { current: T }

/** Refresh retained keyboard geometry without issuing another focus event. */
export function refreshNetworkKeyboardFocus({
  sceneNodes,
  indexRef,
  pointRef,
  neighborIndexRef,
  hoverRef,
  setHoverData
}: {
  sceneNodes: NetworkSceneNode[]
  indexRef: RefValue<number>
  pointRef: RefValue<NavPoint | null>
  neighborIndexRef: RefValue<number>
  hoverRef: RefValue<HoverData | null>
  setHoverData: (hover: HoverData | null) => void
}): void {
  const previous = pointRef.current
  if (indexRef.current < 0 || !previous) return
  const graph = buildNavGraph(extractNetworkNavPoints(sceneNodes))
  // Bounded updates recreate layout nodes; their IDs retain user identity.
  const id = previous.datum?.id
  const index =
    id != null
      ? (graph.idToIdx.get(String(id)) ?? -1)
      : graph.flat.findIndex(
          (point) =>
            point.datum === previous.datum && point.group === previous.group
        )
  const next = graph.flat[index]
  if (index !== indexRef.current) neighborIndexRef.current = -1
  indexRef.current = index
  pointRef.current = next ?? null
  if (
    next &&
    next.datum === previous.datum &&
    next.x === previous.x &&
    next.y === previous.y &&
    next.w === previous.w &&
    next.h === previous.h &&
    next.shape === previous.shape
  )
    return
  const hover = next
    ? buildHoverData(next.datum || {}, next.x, next.y, { nodeOrEdge: "node" })
    : null
  hoverRef.current = hover
  setHoverData(hover)
}
