import type {
  NetworkViewTransform,
  NetworkViewportRect
} from "../networkViewportTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"

/** Source of a camera proposal, including programmatic navigation. */
export type NetworkZoomSource =
  "wheel" | "drag" | "pinch" | "keyboard" | "control" | "fit" | "reset"

/** Camera policy. Bounds apply to gestures, controls and imperative methods. */
export interface NetworkZoomOptions {
  /** Smallest scale, relative to authored layout pixels. @default 0.1 */
  minZoom?: number
  /** Largest scale. @default 8 */
  maxZoom?: number
  /** Lock all user and imperative camera movement. Controlled props remain authoritative. */
  locked?: boolean
  /** Lock scale changes while allowing pan. @default true */
  zoomEnabled?: boolean
  /** Allowed translation axes. Zoom remains centered on a locked axis. @default true */
  pan?: boolean | "x" | "y"
  /** Optional layout-coordinate limits. An axis smaller than the viewport is centered. */
  panBounds?: NetworkViewportRect
  /** Mouse/touch drag; independent of imperative pan. @default true */
  dragPan?: boolean
  /** Wheel/trackpad zoom; modifier requires Ctrl or Meta. @default "modifier" */
  wheelZoom?: boolean | "modifier"
  /** Two-pointer touch/pen zoom. @default true */
  pinchZoom?: boolean
  /** Double click/tap zoom; Shift reverses mouse double click. @default true */
  doubleClickZoom?: boolean
  /** +/- zoom, Alt+arrows pan. Ordinary arrows retain chart navigation. @default true */
  keyboard?: boolean
  /** Delay after motion before expensive LOD promotion is allowed. @default 160 */
  settleDelay?: number
  /** Control/keyboard transition duration. Wheel, drag and pinch follow input each frame.
   * Zero disables easing; reduced motion overrides. @default 180 */
  duration?: number
  /** Screen-pixel space around fit bounds. @default 24 */
  fitPadding?: number
}

/** Change notification. An idle event also fires when a gesture settles. */
export interface NetworkZoomChange {
  source: NetworkZoomSource
  phase: "moving" | "idle"
}

/** Live camera facts for consumer-owned rendering and level of detail. */
export interface NetworkZoomState {
  zoom: NetworkViewTransform
  settledZoom: NetworkViewTransform
  isInteracting: boolean
  /** Unpadded visible window in layout coordinates. */
  visibleRect: NetworkViewportRect | null
}

/** Chart data methods plus a bounded, optional camera. Durations use milliseconds. */
export interface ZoomableNetworkCustomChartHandle extends RealtimeFrameHandle {
  getZoom(): NetworkViewTransform
  zoomTo(zoom: NetworkViewTransform, duration?: number): void
  zoomIn(): void
  zoomOut(): void
  /** Translate by screen CSS pixels on the unlocked axes. */
  panBy(x: number, y: number): void
  /** Fit retained node/card bounds; supply bounds for decorations or edge excursions. */
  fitToContent(bounds?: NetworkViewportRect): void
  resetZoom(): void
}
