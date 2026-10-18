import type { NetworkCameraSource } from "../networkCameraCommit"

/** Callback refs own subscriptions, including React 18 null-ref cleanup.
 * SSR emits the authored transform without binding any mounted carriers. */
export function cameraTransformRef(camera: NetworkCameraSource, css: boolean) {
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
