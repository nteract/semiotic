import type { NetworkViewTransform } from "./networkViewportTypes"

/** Internal bridge carried by the opt-in camera's stable viewTransform. No
 * context singleton, public frame prop, or gesture dependency enters the frame. */
export interface NetworkCameraSource {
  getSnapshot: () => NetworkViewTransform
  subscribe: (listener: () => void, afterPaint?: boolean) => () => void
  transformRef: (
    css: boolean
  ) => (element: SVGGElement | HTMLDivElement | null) => void
}

export type NetworkCameraView = NetworkViewTransform & {
  _semioticCamera?: NetworkCameraSource
}

export function networkCameraSource(view?: NetworkViewTransform) {
  return (view as NetworkCameraView | undefined)?._semioticCamera
}

/** Static rendering retains only this bridge; the opt-in entry owns DOM writes. */
export function networkCameraTransformRef(
  view?: NetworkViewTransform,
  css = false
) {
  return networkCameraSource(view)?.transformRef(css)
}
