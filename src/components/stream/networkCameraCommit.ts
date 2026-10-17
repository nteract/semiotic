import type { NetworkViewTransform } from "./networkViewportTypes"

/** Internal bridge carried by the opt-in camera's stable viewTransform. No
 * context singleton, public frame prop, or gesture dependency enters the frame. */
export interface NetworkCameraSource {
  getSnapshot: () => NetworkViewTransform
  subscribe: (listener: () => void, afterPaint?: boolean) => () => void
}

export type NetworkCameraView = NetworkViewTransform & {
  _semioticCamera?: NetworkCameraSource
}

export function networkCameraSource(view?: NetworkViewTransform) {
  return (view as NetworkCameraView | undefined)?._semioticCamera
}

/** Callback refs own their subscription, including React 18 null-ref cleanup.
 * SSR still emits the ordinary authored transform; only mounted carriers bind. */
export function networkCameraTransformRef(
  view?: NetworkViewTransform,
  css = false
) {
  const camera = networkCameraSource(view)
  if (!camera) return undefined
  let dispose: (() => void) | undefined
  return (element: SVGGElement | HTMLDivElement | null) => {
    dispose?.()
    dispose = undefined
    if (!element) return
    const apply = () => {
      const { x, y, k } = camera.getSnapshot()
      if (css)
        (element as HTMLDivElement).style.transform =
          `translate(${x}px, ${y}px) scale(${k})`
      else element.setAttribute("transform", `translate(${x},${y}) scale(${k})`)
    }
    apply()
    dispose = camera.subscribe(apply)
  }
}
