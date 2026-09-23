import type {
  NetworkViewportOptions,
  NetworkViewportRect
} from "./networkViewportTypes"

export function resolveNetworkScrollContainer(
  layer: HTMLElement,
  options?: NetworkViewportOptions
): HTMLElement | null {
  if (options?.scrollContainer !== undefined) return options.scrollContainer
  if (options?.scrollContainerRef) return options.scrollContainerRef.current
  const win = layer.ownerDocument.defaultView
  for (let el = layer.parentElement; el && win; el = el.parentElement) {
    const style = win.getComputedStyle(el)
    if (
      /(auto|scroll|overlay)/.test(
        `${style.overflow} ${style.overflowX} ${style.overflowY}`
      )
    )
      return el
  }
  return null
}

/** Clip on the axis whose CSS overflow is constrained. */
export interface NetworkViewportClip {
  element: HTMLElement
  x: boolean
  y: boolean
}

export function networkViewportClips(
  layer: HTMLElement,
  root: HTMLElement
): NetworkViewportClip[] {
  const win = layer.ownerDocument.defaultView!
  const clips = new Map<HTMLElement, NetworkViewportClip>()
  // Both ancestry chains matter when the explicit root is outside the frame.
  for (const start of [layer.parentElement, root.parentElement]) {
    for (let el = start; el; el = el.parentElement) {
      // The explicit root is already intersected by measureNetworkViewport.
      if (el === root || clips.has(el)) continue
      const style = win.getComputedStyle(el)
      const x = /(auto|scroll|overlay|hidden|clip)/.test(
        style.overflowX || style.overflow
      )
      const y = /(auto|scroll|overlay|hidden|clip)/.test(
        style.overflowY || style.overflow
      )
      if (x || y) clips.set(el, { element: el, x, y })
    }
  }
  return [...clips.values()]
}

function clientRect(element: HTMLElement): NetworkViewportRect {
  const rect = element.getBoundingClientRect()
  return {
    x: rect.left + element.clientLeft,
    y: rect.top + element.clientTop,
    width: element.clientWidth,
    height: element.clientHeight
  }
}

export function intersectNetworkRects(
  a: NetworkViewportRect,
  b: NetworkViewportRect
): NetworkViewportRect {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  return {
    x,
    y,
    width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
    height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y)
  }
}

/** The unpadded window in plot coordinates, before clipping to the plot itself. */
export function measureNetworkViewport(
  layer: HTMLElement,
  root: HTMLElement,
  clips: NetworkViewportClip[]
): NetworkViewportRect | null {
  const rootRect = clientRect(root)
  if (rootRect.width <= 0 || rootRect.height <= 0) return null
  const win = layer.ownerDocument.defaultView!
  let rect = intersectNetworkRects(rootRect, {
    x: 0,
    y: 0,
    width: win.innerWidth,
    height: win.innerHeight
  })
  for (const clip of clips) {
    const bounds = clientRect(clip.element)
    rect = intersectNetworkRects(rect, {
      x: clip.x ? bounds.x : rect.x,
      y: clip.y ? bounds.y : rect.y,
      width: clip.x ? bounds.width : rect.width,
      height: clip.y ? bounds.height : rect.height
    })
  }
  const origin = layer.getBoundingClientRect()
  return { ...rect, x: rect.x - origin.left, y: rect.y - origin.top }
}

export function networkRectIntersects(
  a: NetworkViewportRect,
  b: NetworkViewportRect
): boolean {
  return (
    a.width > 0 &&
    a.height > 0 &&
    b.x + b.width >= a.x &&
    b.x <= a.x + a.width &&
    b.y + b.height >= a.y &&
    b.y <= a.y + a.height
  )
}
