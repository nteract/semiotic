import type {
  NetworkViewTransform,
  NetworkViewportRect
} from "../networkViewportTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"

/** Source of a camera proposal, including programmatic navigation. `anchor`
 * re-solves the camera after a layout run moved the anchored mark. */
export type NetworkZoomSource =
  | "wheel"
  | "drag"
  | "pinch"
  | "keyboard"
  | "control"
  | "fit"
  | "reset"
  | "center"
  | "anchor"

/** Screen CSS pixels at each plot edge, such as a strip covered by a side panel. */
export interface NetworkZoomInsets {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

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
  /** Camera shortcuts: +/- zoom and Alt+arrows pan by 60 screen pixels.
   * True preserves ordinary arrow-key node navigation; false disables camera
   * shortcuts. Opt into { arrowKeys: "pan" } to also pan with ordinary arrows.
   * Editors and Ctrl/Meta browser shortcuts remain untouched. @default true */
  keyboard?: boolean | { arrowKeys: "navigate" | "pan" }
  /** Delay after motion before expensive LOD promotion is allowed. @default 160 */
  settleDelay?: number
  /** Control/keyboard transition duration. Wheel, drag and pinch follow input each frame.
   * Zero disables easing; reduced motion overrides. @default 180 */
  duration?: number
  /** Screen-pixel space around fit bounds. @default 24 */
  fitPadding?: number
  /**
   * Plot strips that consumer chrome covers. Fit, center, reveal, pan bounds
   * and centered zoom (buttons, keyboard, locked axes) use the remaining
   * usable viewport. Changing insets moves the camera only through pan bounds
   * or a later fit/center request.
   */
  insets?: NetworkZoomInsets
  /**
   * Keep this mark's screen position when the custom layout runs again, by
   * translating the camera once per layout commit; the scale is unchanged.
   * Nothing happens when the mark is absent before or after the run.
   */
  anchor?: { markId: string } | null
}

/** Fit options for one request. */
export interface NetworkZoomFitOptions {
  /**
   * Screen-pixel space kept free inside the usable viewport (insets excluded),
   * for all sides or per side; unspecified sides keep `fitPadding`.
   */
  padding?: number | NetworkZoomInsets
  minZoom?: number
  maxZoom?: number
  duration?: number
}

/** Center options. The scale is kept unless `k` is given; `insets` replaces
 * `zoomOptions.insets` for this request. */
export interface NetworkZoomCenterOptions {
  k?: number
  duration?: number
  insets?: NetworkZoomInsets
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
  fitToContent(
    bounds?: NetworkViewportRect,
    options?: NetworkZoomFitOptions
  ): void
  resetZoom(): void
  /** Put the center of a layout rect or point at the usable viewport's center. */
  centerOn(
    target: NetworkViewportRect | { x: number; y: number },
    options?: NetworkZoomCenterOptions
  ): void
  /** Layout-coordinate box of an HTML mark, else of the scene node with this id. */
  getMarkBounds(id: string): NetworkViewportRect | null
  /** Fit the union of the listed marks' bounds; missing ids are skipped. */
  fitToMarks(ids: readonly string[], options?: NetworkZoomFitOptions): void
  /** Pan the least distance that brings a mark inside the usable viewport. */
  revealMark(id: string): void
  centerOnMark(id: string, options?: NetworkZoomCenterOptions): void
}
