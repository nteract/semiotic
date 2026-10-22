/** Opt-in virtual network viewport; ordinary chart imports exclude gestures and LOD. */
export { ZoomableNetworkCustomChart } from "./stream/networkZoom/ZoomableNetworkCustomChart"
export type { ZoomableNetworkCustomChartProps } from "./stream/networkZoom/ZoomableNetworkCustomChart"
export {
  useNetworkZoom,
  useNetworkProjectedSize,
  useNetworkLOD,
  useNetworkLODLevel
} from "./stream/networkZoom/NetworkZoomContext"
export type { NetworkLODOptions } from "./stream/networkZoom/NetworkZoomContext"
export { getNetworkContentBounds } from "./stream/networkZoom/geometry"
// The pure camera math behind the handle's fit and center, for a host that plans
// a move before it makes one (both honor insets, zoom limits and pan bounds).
export {
  fitZoom as fitNetworkZoom,
  centerZoom as centerNetworkZoom,
  usableViewport as usableNetworkViewport
} from "./stream/networkZoom/geometry"
export type {
  NetworkZoomOptions,
  NetworkZoomInsets,
  NetworkZoomFitOptions,
  NetworkZoomCenterOptions,
  NetworkZoomState,
  NetworkZoomSource,
  NetworkZoomChange,
  ZoomableNetworkCustomChartHandle
} from "./stream/networkZoom/types"
export type {
  NetworkViewTransform,
  NetworkViewportRect
} from "./stream/networkViewportTypes"
// Apply or invert a zoom camera; pair with a layout fit (for example
// createDagreFit) to move between authored, plot, and viewport coordinates.
export { projectNetworkPoint, invertNetworkRect } from "./stream/networkViewTransform"
