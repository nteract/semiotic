import type { NetworkZoomState } from "./types"
import type {
  NetworkCameraSource,
  NetworkCameraView
} from "../networkCameraCommit"
import { DEFAULT_ZOOM } from "./geometry"
import { cameraTransformRef } from "./cameraTransformRef"

export const DEFAULT_ZOOM_STATE: NetworkZoomState = {
  zoom: DEFAULT_ZOOM,
  settledZoom: DEFAULT_ZOOM,
  isInteracting: false,
  visibleRect: null
}

export function createNetworkZoomStore(initial = DEFAULT_ZOOM_STATE) {
  let state = initial
  let size = {
    k: state.zoom.k,
    settledK: state.settledZoom.k,
    isInteracting: state.isInteracting
  }
  const liveListeners = new Set<() => void>()
  const sizeListeners = new Set<() => void>()
  const cameraListeners = new Set<() => void>()
  const viewportListeners = new Set<() => void>()
  const subscribe = (listeners: Set<() => void>) => (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  let depth = 0,
    liveChanged = false,
    sizeChanged = false
  const equalView = (a: typeof state.zoom, b: typeof state.zoom) =>
    a.x === b.x && a.y === b.y && a.k === b.k
  let layoutCommit: NetworkCameraSource["layoutCommitted"]
  const camera: NetworkCameraSource = {
    getSnapshot: () => state.zoom,
    subscribe: (listener, afterPaint = false) =>
      subscribe(afterPaint ? viewportListeners : cameraListeners)(listener),
    transformRef: (css) => cameraTransformRef(camera, css),
    layoutCommitted: (result, previous) => layoutCommit?.(result, previous)
  }
  const store = {
    /** Receive each committed custom layout result; returns the unsubscribe. */
    onLayoutCommit(handler: NonNullable<NetworkCameraSource["layoutCommitted"]>) {
      layoutCommit = handler
      return () => {
        if (layoutCommit === handler) layoutCommit = undefined
      }
    },
    getSnapshot: () => state,
    getSize: () => size,
    subscribe: subscribe(liveListeners),
    subscribeSize: subscribe(sizeListeners),
    view: {
      get x() {
        return state.zoom.x
      },
      get y() {
        return state.zoom.y
      },
      get k() {
        return state.zoom.k
      },
      _semioticCamera: camera
    } satisfies NetworkCameraView,
    update(patch: Partial<NetworkZoomState>) {
      const next = { ...state, ...patch }
      if (equalView(next.zoom, state.zoom)) next.zoom = state.zoom
      if (equalView(next.settledZoom, state.settledZoom))
        next.settledZoom = state.settledZoom
      const a = next.visibleRect,
        b = state.visibleRect
      if (
        a &&
        b &&
        a.x === b.x &&
        a.y === b.y &&
        a.width === b.width &&
        a.height === b.height
      )
        next.visibleRect = b
      if (
        next.zoom === state.zoom &&
        next.settledZoom === state.settledZoom &&
        next.isInteracting === state.isInteracting &&
        next.visibleRect === state.visibleRect
      )
        return
      const cameraChanged = next.zoom !== state.zoom
      state = next
      liveChanged = true
      if (
        size.k !== state.zoom.k ||
        size.settledK !== state.settledZoom.k ||
        size.isInteracting !== state.isInteracting
      ) {
        size = {
          k: state.zoom.k,
          settledK: state.settledZoom.k,
          isInteracting: state.isInteracting
        }
        sizeChanged = true
      }
      // Viewport callbacks may publish a new visibleRect while the camera is
      // committing. Batch that echo into the same live snapshot notification.
      depth++
      try {
        if (cameraChanged) {
          for (const listener of [...cameraListeners]) listener()
          for (const listener of [...viewportListeners]) listener()
        }
      } finally {
        if (--depth === 0) {
          const notifySize = sizeChanged,
            notifyLive = liveChanged
          sizeChanged = liveChanged = false
          if (notifySize) sizeListeners.forEach((listener) => listener())
          if (notifyLive) liveListeners.forEach((listener) => listener())
        }
      }
    }
  }
  return store
}

export type NetworkZoomStore = ReturnType<typeof createNetworkZoomStore>
