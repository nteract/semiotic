import { act, createEvent, fireEvent, waitFor } from "@testing-library/react"

type Point = { clientX: number; clientY: number }

/**
 * Drag a d3 brush in jsdom: mousedown on `.overlay`, one mousemove per point,
 * then mouseup at the last point, each in its own act() so React commits and
 * runs effects between events. jsdom has no SVG matrices, so d3's pointer()
 * reads client coordinates against a zero rect: points are brush pixels.
 */
export async function dragD3Brush(container: HTMLElement, overlaySelector: string, from: Point, moves: Point[]) {
  const overlay = await waitFor(() => {
    const node = container.querySelector(overlaySelector)
    if (!node) throw new Error(`${overlaySelector} not mounted`)
    return node
  })
  // d3-brush listens for the rest of the gesture on the event's view. The
  // vitest global is not jsdom's Window, so the view is set after creation.
  const view = overlay.ownerDocument.defaultView!
  const fire = (target: Element | Window, type: "mouseDown" | "mouseMove" | "mouseUp", point: Point) => {
    const event = createEvent[type](target, { ...point, button: 0 })
    Object.defineProperty(event, "view", { value: view })
    act(() => { fireEvent(target, event) })
  }
  fire(overlay, "mouseDown", from)
  for (const point of moves) fire(view, "mouseMove", point)
  fire(view, "mouseUp", moves.at(-1) ?? from)
}
