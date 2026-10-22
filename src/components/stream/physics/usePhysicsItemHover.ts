import * as React from "react"
import type { PhysicsSemanticItem } from "./StreamPhysicsTypes"
import type { PhysicsFrameObservationPayload } from "./physicsFrameObservations"
import { physicsCanvasCoordinates } from "./physicsCanvasCoordinates"

/** A semantic item under the pointer, in plot coordinates. */
export interface PhysicsItemHover {
  item: PhysicsSemanticItem
  x: number
  y: number
}

type ItemHoverObservation = (
  type: "hover" | "hover-end",
  payload?: PhysicsFrameObservationPayload
) => void

/** Overlay elements name the semantic item they draw with this attribute. */
export const PHYSICS_SEMANTIC_ID_ATTRIBUTE = "data-semiotic-semantic-id"

/**
 * Pointer hover for semantic items without bodies, such as pipes a custom
 * layout draws in its SVG overlay. An element whose
 * `data-semiotic-semantic-id` names an item with that `id` shows the item's
 * tooltip; canvas bodies keep their own hover. Escape dismisses it until the
 * pointer moves again.
 */
export function usePhysicsItemHover(
  items: readonly PhysicsSemanticItem[],
  margin: { left: number; top: number },
  enabled: boolean,
  emitObservation: ItemHoverObservation,
  clearKeyboardFocus: () => void,
  clearBodyHover: () => void
) {
  const [hover, setHover] = React.useState<PhysicsItemHover | null>(null)
  const hoverRef = React.useRef<PhysicsItemHover | null>(null)
  const byId = React.useMemo(() => {
    const index = new Map<string, PhysicsSemanticItem>()
    for (const item of items) if (item.id != null) index.set(item.id, item)
    return index
  }, [items])

  const clear = React.useCallback(() => {
    if (!hoverRef.current) return
    hoverRef.current = null
    setHover(null)
    emitObservation("hover-end")
  }, [emitObservation])

  // Capture runs before the canvas handler, so leaving an item ends its
  // hover before a body under the pointer starts its own.
  const onPointerMoveCapture = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const target = event.target as Element | null
      const host = enabled
        ? target?.closest?.(`[${PHYSICS_SEMANTIC_ID_ATTRIBUTE}]`)
        : null
      const item = host
        ? byId.get(host.getAttribute(PHYSICS_SEMANTIC_ID_ATTRIBUTE) ?? "")
        : undefined
      if (!item) {
        clear()
        return
      }
      // Pointer items take ownership before publishing their own hover.
      clearKeyboardFocus()
      clearBodyHover()
      const next = {
        item,
        ...physicsCanvasCoordinates(
          event.currentTarget,
          event.clientX,
          event.clientY,
          margin
        )
      }
      const previous = hoverRef.current
      hoverRef.current = next
      setHover(next)
      if (previous?.item !== item)
        emitObservation("hover", {
          datum: item.datum ?? item,
          x: next.x,
          y: next.y,
          inputType: "pointer"
        })
    },
    [
      byId,
      clear,
      emitObservation,
      enabled,
      margin,
      clearKeyboardFocus,
      clearBodyHover
    ]
  )

  React.useEffect(() => {
    if (!hover || typeof document === "undefined") return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") clear()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [hover, clear])

  // A rebuilt layout keeps the hovered id current; a removed item ends hover.
  React.useEffect(() => {
    const current = hoverRef.current
    if (!current) return
    const item = byId.get(current.item.id ?? "")
    if (!item) clear()
    else if (item !== current.item) {
      hoverRef.current = { ...current, item }
      setHover(hoverRef.current)
    }
  }, [byId, clear])

  return { hover, onPointerMoveCapture, clear }
}
