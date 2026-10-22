import { createRef, type ComponentRef, type RefCallback } from "react"
import {
  ZoomableNetworkCustomChart,
  type NetworkViewportRect,
  type NetworkViewTransform,
  type ZoomableNetworkCustomChartHandle
} from "semiotic/network/zoom"
import { lineageDagLayout } from "semiotic/recipes"

type ReleasedCameraHandle = Omit<
  ZoomableNetworkCustomChartHandle,
  "centerOn" | "centerOnMark" | "fitToMarks" | "getMarkBounds" | "revealMark"
>

const ref = createRef<ZoomableNetworkCustomChartHandle>()
const inferredRef = createRef<ComponentRef<typeof ZoomableNetworkCustomChart>>()
const releasedCallback: RefCallback<ReleasedCameraHandle> = (handle) => {
  if (!handle) return
  const zoom: NetworkViewTransform = handle.getZoom()
  handle.zoomTo(zoom, 0)
  handle.zoomIn()
  handle.zoomOut()
  handle.panBy(10, 20)
  handle.fitToContent()
  handle.resetZoom()
}

export function navigateCamera(handle: ZoomableNetworkCustomChartHandle) {
  handle.centerOn({ x: 10, y: 20 })
  handle.centerOn({ x: 10, y: 20, width: 50, height: 30 }, { k: 2, duration: 0 })
  handle.centerOnMark("source", { insets: { right: 100 } })
  const bounds: NetworkViewportRect | null = handle.getMarkBounds("source")
  handle.fitToMarks(["source", "target"], { padding: 10 })
  handle.revealMark("source")
  // @ts-expect-error Camera targets require numeric layout coordinates.
  handle.centerOn({ x: "10", y: 20 })
  // @ts-expect-error Mark IDs retain their string type.
  handle.centerOnMark(123)
  // @ts-expect-error Mark collections retain their string element type.
  handle.fitToMarks([123])
  // @ts-expect-error Mark bounds can be absent.
  const missingBounds: NetworkViewportRect = handle.getMarkBounds("missing")
  // @ts-expect-error Reveal accepts a mark ID rather than a coordinate.
  handle.revealMark({ x: 10, y: 20 })
  void missingBounds
  return bounds
}

const props = {
  nodes: [{ id: "source" }, { id: "target" }],
  edges: [{ source: "source", target: "target" }],
  layout: lineageDagLayout
}

export const cameraRefs = {
  object: <ZoomableNetworkCustomChart {...props} ref={ref} />,
  inferred: <ZoomableNetworkCustomChart {...props} ref={inferredRef} />,
  releasedCallback: <ZoomableNetworkCustomChart {...props} ref={releasedCallback} />
}
