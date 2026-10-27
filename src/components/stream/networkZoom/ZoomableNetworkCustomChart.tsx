"use client"
import * as React from "react"
import { flushSync } from "react-dom"
import { NetworkCustomChart } from "../../charts/custom/NetworkCustomChart"
import type { NetworkCustomChartProps } from "../../charts/custom/NetworkCustomChart"
import type { Datum } from "../../charts/shared/datumTypes"
import type { ChartObservation } from "../../store/ObservationStore"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { NetworkLayoutResult } from "../networkCustomLayout"
import type {
  NetworkViewTransform,
  NetworkViewportSnapshot,
  NetworkViewportRect
} from "../networkViewportTypes"
import type {
  NetworkLayoutCommitCamera,
  NetworkZoomCenterOptions,
  NetworkZoomChange,
  NetworkZoomFitOptions,
  NetworkZoomOptions,
  ZoomableNetworkCustomChartHandle
} from "./types"
import { NetworkZoomProvider } from "./NetworkZoomContext"
import { createNetworkZoomStore } from "./NetworkZoomStore"
import { NetworkZoomControls } from "./NetworkZoomControls"
import { bindNetworkZoom } from "./gestures"
import {
  anchorZoom,
  centerZoom,
  constrainZoom,
  DEFAULT_ZOOM,
  EMPTY_PLOT,
  fitZoom,
  getNetworkContentBounds,
  getNetworkMarkBounds,
  getNetworkMarksBounds,
  sameZoom,
  usableViewport
} from "./geometry"

const CameraChart = /* @__PURE__ */ React.memo(
  NetworkCustomChart
) as typeof NetworkCustomChart

const layoutOf = (frame: React.RefObject<RealtimeFrameHandle | null>) =>
  frame.current?.getCustomLayout?.() as NetworkLayoutResult | null

/** An opt-in camera around NetworkCustomChart. Layout remains in authored
 * coordinates; only presentation, hit testing and the visible window change. */
export interface ZoomableNetworkCustomChartProps<
  TNode extends Datum = Datum,
  TEdge extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
> extends NetworkCustomChartProps<TNode, TEdge, TConfig> {
  /** Controlled camera. Accept onZoomChange proposals to permit interaction. */
  zoom?: NetworkViewTransform
  /** Initial uncontrolled camera. @default { x: 0, y: 0, k: 1 } */
  defaultZoom?: NetworkViewTransform
  onZoomChange?: (zoom: NetworkViewTransform, event: NetworkZoomChange) => void
  /**
   * Called from the commit that renders each new custom layout run's HTML marks
   * and overlays, before that frame paints, with the run it replaces and the
   * commit's camera. A move made through that camera applies in this commit,
   * so the run's marks paint under it, and its `getZoom` reads it back at
   * once. A zero-duration move through the handle lands with those marks too.
   */
  onLayoutCommit?: (
    result: NetworkLayoutResult | null,
    previous: NetworkLayoutResult | null,
    camera: NetworkLayoutCommitCamera
  ) => void
  zoomOptions?: NetworkZoomOptions
  /** Accessible zoom, fit and reset buttons. @default true */
  zoomControls?: boolean
}

/** Opt-in virtual network viewport with Pointer Events gestures, bounded
 * camera controls and projected-size/settled-state hooks for HTML content. */
export const ZoomableNetworkCustomChart = /* @__PURE__ */ React.forwardRef(
  function ZoomableNetworkCustomChart<
    TNode extends Datum,
    TEdge extends Datum,
    TConfig extends object
  >(
    props: ZoomableNetworkCustomChartProps<TNode, TEdge, TConfig>,
    ref: React.ForwardedRef<ZoomableNetworkCustomChartHandle>
  ) {
    const {
      zoom: controlled,
      defaultZoom = DEFAULT_ZOOM,
      onZoomChange,
      onLayoutCommit,
      zoomOptions = {},
      zoomControls = true,
      frameProps,
      ...chartProps
    } = props
    const container = React.useRef<HTMLDivElement>(null)
    const frame = React.useRef<RealtimeFrameHandle>(null)
    const driver = React.useRef<ReturnType<typeof bindNetworkZoom> | null>(null)
    const [store] = React.useState(() => {
      const initial = constrainZoom(
        controlled ?? defaultZoom,
        EMPTY_PLOT,
        zoomOptions
      )
      return createNetworkZoomStore({
        zoom: initial,
        settledZoom: initial,
        isInteracting: false,
        visibleRect: null
      })
    })
    const [plot, setPlot] = React.useState<NetworkViewportRect>(EMPTY_PLOT)
    const bounded = constrainZoom(
      controlled ?? store.getSnapshot().zoom,
      plot,
      zoomOptions
    )
    const zoom = React.useMemo(() => bounded, [bounded.x, bounded.y, bounded.k]) // eslint-disable-line react-hooks/exhaustive-deps -- scalar camera identity
    const live = React.useRef({
      zoom,
      zoomOptions,
      plot,
      controlled,
      onZoomChange,
      onLayoutCommit,
      defaultZoom
    })
    live.current = {
      zoom,
      zoomOptions,
      plot,
      controlled,
      onZoomChange,
      onLayoutCommit,
      defaultZoom
    }
    // Controlled props/resizes commit the accepted camera before browser paint.
    React.useLayoutEffect(() => {
      store.update({
        zoom,
        ...(!store.getSnapshot().isInteracting ? { settledZoom: zoom } : {})
      })
    }, [store, zoom])
    React.useEffect(() => {
      if (!container.current) return
      const apply = (next: NetworkViewTransform, event: NetworkZoomChange) => {
        const current = live.current
        if (current.controlled === undefined && event.phase === "moving") {
          current.zoom = constrainZoom(next, current.plot, current.zoomOptions)
        }
        store.update({
          zoom: current.zoom,
          isInteracting: event.phase === "moving",
          ...(event.phase === "idle" ? { settledZoom: current.zoom } : {})
        })
        current.onZoomChange?.(next, event)
      }
      const bound = bindNetworkZoom(container.current, {
        getZoom: () => live.current.zoom,
        getPlot: () => live.current.plot,
        getOptions: () => live.current.zoomOptions,
        change: (next, event) => {
          // Moving updates run in an animation frame or microtask, outside
          // React's lifecycle. Commit all layers and any controlled acceptance
          // before the next paint; deferring the commit can also lose input
          // against an older camera.
          if (event.phase === "moving") flushSync(() => apply(next, event))
          else apply(next, event)
        },
        // A commit move runs inside this chart's own layout effect, where
        // React flushes the updates it causes before paint by itself.
        commit: apply
      })
      driver.current = bound
      return () => {
        bound.destroy()
        driver.current = null
      }
    }, [store])
    // A policy change ends the move in flight; a bounds change keeps it and
    // re-clamps its destination.
    React.useEffect(() => {
      driver.current?.cancel()
    }, [zoomOptions.locked, zoomOptions.zoomEnabled, zoomOptions.pan])
    React.useEffect(() => {
      driver.current?.rebound()
    }, [
      zoomOptions.minZoom,
      zoomOptions.maxZoom,
      zoomOptions.panBounds?.x,
      zoomOptions.panBounds?.y,
      zoomOptions.panBounds?.width,
      zoomOptions.panBounds?.height
    ])
    const commitCamera = React.useMemo<NetworkLayoutCommitCamera>(
      () => ({
        getZoom: () => live.current.zoom,
        zoomTo: (next) => driver.current?.jumpTo(next, "control")
      }),
      []
    )
    const getMarkBounds = React.useCallback(
      (id: string) => getNetworkMarkBounds(layoutOf(frame), id),
      []
    )
    const fitToContent = React.useCallback(
      (bounds?: NetworkViewportRect, fit?: NetworkZoomFitOptions) => {
        const content = bounds ?? getNetworkContentBounds(layoutOf(frame))
        if (!content) return
        const { plot, zoomOptions: options, zoom } = live.current
        const next = fitZoom(
          content,
          plot,
          options.zoomEnabled === false
            ? { ...options, minZoom: zoom.k, maxZoom: zoom.k }
            : options,
          fit
        )
        if (next) driver.current?.moveTo(next, "fit", fit?.duration)
      },
      []
    )
    const centerOn = React.useCallback(
      (
        target: NetworkViewportRect | { x: number; y: number },
        center?: NetworkZoomCenterOptions
      ) => {
        const { plot, zoomOptions: options, zoom } = live.current
        const next = centerZoom(target, zoom, plot, options, center)
        if (next) driver.current?.moveTo(next, "center", center?.duration)
      },
      []
    )
    const resetZoom = React.useCallback(
      () => driver.current?.moveTo(live.current.defaultZoom, "reset"),
      []
    )
    const reveal = React.useCallback(
      (
        bounds: NetworkViewportRect | null | undefined,
        source: "keyboard" | "control" = "keyboard"
      ) => {
        if (!bounds) return
        const { zoom: view, plot, zoomOptions: options } = live.current
        const usable = usableViewport(plot, options.insets)
        const shift = (
          start: number,
          length: number,
          offset: number,
          available: number
        ) =>
          length > available - 24
            ? offset + available / 2 - start - length / 2
            : start < offset + 12
              ? offset + 12 - start
              : start + length > offset + available - 12
                ? offset + available - 12 - start - length
                : 0
        const dx = shift(
          bounds.x * view.k + view.x,
          bounds.width * view.k,
          usable.x,
          usable.width
        )
        const dy = shift(
          bounds.y * view.k + view.y,
          bounds.height * view.k,
          usable.y,
          usable.height
        )
        if (dx || dy) driver.current?.panBy(dx, dy, source)
      },
      []
    )
    // Re-solve the camera once per committed layout so the anchored mark's
    // center keeps its screen position; the frame commits HTML marks first.
    // Bounds are snapshotted per commit because layouts may reuse and update
    // mark objects, which would rewrite the previous result's geometry. The
    // host's `onLayoutCommit` follows with the anchor applied, so its own move
    // supersedes the anchor's.
    const anchored = React.useRef<{
      id: string
      bounds: NetworkViewportRect | null
    } | null>(null)
    React.useLayoutEffect(
      () =>
        store.onLayoutCommit((result, previous) => {
          const id = live.current.zoomOptions.anchor?.markId
          const last = anchored.current
          anchored.current = null
          if (id != null) {
            const after = getNetworkMarkBounds(result, id)
            anchored.current = { id, bounds: after }
            const before =
              last?.id === id ? last.bounds : getNetworkMarkBounds(previous, id)
            // A run that left the mark in place (a restyle, a hover) must not
            // move the camera: any move cancels the tween in flight.
            const next = before && after && anchorZoom(live.current.zoom, before, after)
            if (next && !sameZoom(next, live.current.zoom))
              driver.current?.jumpTo(next, "anchor")
          }
          live.current.onLayoutCommit?.(result, previous, commitCamera)
        }),
      [store, commitCamera]
    )
    const onObservation = props.onObservation
    const observe = React.useCallback(
      (event: ChartObservation) => {
        if (event.type === "focus") {
          const mark = layoutOf(frame)?.sceneNodes?.find(
            (node) =>
              node.datum === event.datum ||
              node.datum?.data === event.datum ||
              (event.datum.id != null && node.id === String(event.datum.id))
          )
          if (mark) reveal(getNetworkContentBounds({ sceneNodes: [mark] }))
        }
        onObservation?.(event)
      },
      [onObservation, reveal]
    )
    React.useImperativeHandle(
      ref,
      () => ({
        // Data methods keep the ordinary chart handle contract.
        push: (point) => frame.current?.push(point),
        pushMany: (points) => frame.current?.pushMany(points),
        remove: (id) => frame.current?.remove(id) ?? [],
        update: (id, updater) => frame.current?.update(id, updater) ?? [],
        clear: () => frame.current?.clear(),
        getData: () => frame.current?.getData() ?? [],
        getCustomLayout: () => frame.current?.getCustomLayout?.() ?? null,
        getLayoutFailure: () => frame.current?.getLayoutFailure?.() ?? null,
        getZoom: () => live.current.zoom,
        zoomTo: (next, duration) =>
          driver.current?.moveTo(next, "control", duration),
        zoomIn: () => driver.current?.zoomBy(2),
        zoomOut: () => driver.current?.zoomBy(0.5),
        panBy: (x, y) => driver.current?.panBy(x, y),
        fitToContent,
        resetZoom,
        centerOn,
        getMarkBounds,
        fitToMarks: (ids, fit) => {
          const bounds = getNetworkMarksBounds(layoutOf(frame), ids)
          if (bounds) fitToContent(bounds, fit)
        },
        revealMark: (id) => reveal(getMarkBounds(id), "control"),
        centerOnMark: (id, center) => {
          const bounds = getMarkBounds(id)
          if (bounds) centerOn(bounds, center)
        }
      }),
      [fitToContent, resetZoom, centerOn, getMarkBounds, reveal]
    )
    const onViewportChange = frameProps?.onViewportChange
    const report = React.useCallback(
      (next: NetworkViewportSnapshot) => {
        if (next.plotRect) {
          const previous = live.current.plot,
            plot = next.plotRect
          if (
            previous.x !== plot.x ||
            previous.y !== plot.y ||
            previous.width !== plot.width ||
            previous.height !== plot.height
          )
            setPlot(plot)
          live.current.plot = plot
        }
        store.update({ visibleRect: next.visibleRect })
        onViewportChange?.(next)
      },
      [onViewportChange, store]
    )
    const touchAction =
      zoomOptions.locked ||
      ((zoomOptions.dragPan === false || zoomOptions.pan === false) &&
        (zoomOptions.pinchZoom === false || zoomOptions.zoomEnabled === false))
        ? "auto"
        : "none"
    // A viewport report updates live context after the frame commits. Keep
    // chart props stable so that report does not commit the entire frame again.
    const cameraFrameProps = React.useMemo(
      () => ({
        ...frameProps,
        viewTransform: store.view,
        onViewportChange: report
      }),
      [frameProps, store, report]
    )
    return (
      <NetworkZoomProvider store={store}>
        <div
          ref={container}
          className="semiotic-network-zoom"
          onFocusCapture={(event) => {
            const id =
              event.target.closest<HTMLElement>("[data-mark-id]")?.dataset
                .markId
            if (!id) return
            reveal(layoutOf(frame)?.htmlMarks?.find((mark) => mark.id === id))
          }}
          style={{
            position: "relative",
            width: props.responsiveWidth ? "100%" : props.width,
            touchAction
          }}
        >
          <CameraChart
            {...chartProps}
            ref={frame}
            onObservation={observe}
            frameProps={cameraFrameProps}
          />
          {zoomControls && (
            <NetworkZoomControls
              zoomOptions={zoomOptions}
              driver={driver}
              fitToContent={fitToContent}
              resetZoom={resetZoom}
            />
          )}
        </div>
      </NetworkZoomProvider>
    )
  }
) as <
  TNode extends Datum = Datum,
  TEdge extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
>(
  props: ZoomableNetworkCustomChartProps<TNode, TEdge, TConfig> &
    React.RefAttributes<ZoomableNetworkCustomChartHandle>
) => React.ReactElement
