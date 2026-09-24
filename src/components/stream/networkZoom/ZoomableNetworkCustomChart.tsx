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
  NetworkViewportSnapshot
} from "../networkViewportTypes"
import type {
  NetworkZoomChange,
  NetworkZoomOptions,
  ZoomableNetworkCustomChartHandle
} from "./types"
import { NetworkZoomContext } from "./NetworkZoomContext"
import { bindNetworkZoom } from "./gestures"
import {
  constrainZoom,
  DEFAULT_ZOOM,
  EMPTY_PLOT,
  fitZoom,
  getNetworkContentBounds,
  zoomLimits
} from "./geometry"

const controlStyle: React.CSSProperties = {
  minWidth: 44,
  minHeight: 44,
  padding: "4px 12px",
  font: "inherit",
  borderRadius: 6,
  border: "1px solid var(--semiotic-border, #b6c4ce)",
  background: "var(--semiotic-bg, #fff)",
  color: "inherit"
}

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
  zoomOptions?: NetworkZoomOptions
  /** Accessible zoom, fit and reset buttons. @default true */
  zoomControls?: boolean
}

/** Opt-in virtual network viewport with Pointer Events gestures, bounded
 * camera controls and projected-size/settled-state hooks for HTML content. */
export const ZoomableNetworkCustomChart = React.forwardRef(
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
      zoomOptions = {},
      zoomControls = true,
      frameProps,
      ...chartProps
    } = props
    const container = React.useRef<HTMLDivElement>(null)
    const frame = React.useRef<RealtimeFrameHandle>(null)
    const driver = React.useRef<ReturnType<typeof bindNetworkZoom> | null>(null)
    const [localZoom, setLocalZoom] = React.useState(defaultZoom)
    const [isInteracting, setInteracting] = React.useState(false)
    const [viewport, setViewport] =
      React.useState<NetworkViewportSnapshot | null>(null)
    const plot = viewport?.plotRect ?? EMPTY_PLOT
    const bounded = constrainZoom(controlled ?? localZoom, plot, zoomOptions)
    const zoom = React.useMemo(() => bounded, [bounded.x, bounded.y, bounded.k]) // eslint-disable-line react-hooks/exhaustive-deps -- scalar camera identity
    const [settledZoom, setSettledZoom] = React.useState(zoom)
    const live = React.useRef({
      zoom,
      zoomOptions,
      plot,
      controlled,
      onZoomChange,
      defaultZoom
    })
    live.current = {
      zoom,
      zoomOptions,
      plot,
      controlled,
      onZoomChange,
      defaultZoom
    }
    // Controlled updates and resizes are also valid settled size changes.
    React.useEffect(() => {
      if (!isInteracting) setSettledZoom(zoom)
    }, [zoom.x, zoom.y, zoom.k, isInteracting]) // eslint-disable-line react-hooks/exhaustive-deps -- scalar camera identity
    React.useEffect(() => {
      if (!container.current) return
      const bound = bindNetworkZoom(container.current, {
        getZoom: () => live.current.zoom,
        getPlot: () => live.current.plot,
        getOptions: () => live.current.zoomOptions,
        change: (next, event) => {
          const update = () => {
            const current = live.current
            if (current.controlled === undefined && event.phase === "moving") {
              current.zoom = constrainZoom(
                next,
                current.plot,
                current.zoomOptions
              )
              setLocalZoom(current.zoom)
            }
            setInteracting(event.phase === "moving")
            if (event.phase === "idle") setSettledZoom(current.zoom)
            current.onZoomChange?.(next, event)
          }
          // Moving updates run once per rAF, outside React's lifecycle. Commit
          // all layers and any controlled acceptance before this frame paints;
          // deferring the commit can also lose input against an older camera.
          if (event.phase === "moving") flushSync(update)
          else update()
        }
      })
      driver.current = bound
      return () => {
        bound.destroy()
        driver.current = null
      }
    }, [])
    React.useEffect(() => {
      driver.current?.cancel()
    }, [
      zoomOptions.locked,
      zoomOptions.zoomEnabled,
      zoomOptions.pan,
      zoomOptions.minZoom,
      zoomOptions.maxZoom,
      zoomOptions.panBounds?.x,
      zoomOptions.panBounds?.y,
      zoomOptions.panBounds?.width,
      zoomOptions.panBounds?.height
    ])
    const fitToContent = React.useCallback(
      (
        bounds?: Parameters<ZoomableNetworkCustomChartHandle["fitToContent"]>[0]
      ) => {
        const content =
          bounds ??
          getNetworkContentBounds(
            frame.current?.getCustomLayout?.() as NetworkLayoutResult | null
          )
        if (!content) return
        const { plot, zoomOptions: options, zoom } = live.current
        const next = fitZoom(
          content,
          plot,
          options.zoomEnabled === false
            ? { ...options, minZoom: zoom.k, maxZoom: zoom.k }
            : options
        )
        if (next) driver.current?.moveTo(next, "fit")
      },
      []
    )
    const resetZoom = React.useCallback(
      () => driver.current?.moveTo(live.current.defaultZoom, "reset"),
      []
    )
    const reveal = React.useCallback(
      (
        bounds: Parameters<ZoomableNetworkCustomChartHandle["fitToContent"]>[0]
      ) => {
        if (!bounds) return
        const { zoom: view, plot } = live.current
        const shift = (start: number, length: number, available: number) =>
          length > available - 24
            ? available / 2 - start - length / 2
            : start < 12
              ? 12 - start
              : start + length > available - 12
                ? available - 12 - start - length
                : 0
        const dx = shift(
          bounds.x * view.k + view.x,
          bounds.width * view.k,
          plot.width
        )
        const dy = shift(
          bounds.y * view.k + view.y,
          bounds.height * view.k,
          plot.height
        )
        if (dx || dy) driver.current?.panBy(dx, dy, "keyboard")
      },
      []
    )
    const onObservation = props.onObservation
    const observe = React.useCallback(
      (event: ChartObservation) => {
        if (event.type === "focus") {
          const result =
            frame.current?.getCustomLayout?.() as NetworkLayoutResult | null
          const mark = result?.sceneNodes?.find(
            (node) =>
              node.datum === event.datum ||
              node.datum?.data === event.datum ||
              (event.datum.id != null && node.id === String(event.datum.id))
          )
          if (mark)
            reveal(getNetworkContentBounds({ sceneNodes: [mark] }) ?? undefined)
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
        resetZoom
      }),
      [fitToContent, resetZoom]
    )
    const onViewportChange = frameProps?.onViewportChange
    const report = React.useCallback(
      (next: NetworkViewportSnapshot) => {
        if (next.plotRect) live.current.plot = next.plotRect
        setViewport(next)
        onViewportChange?.(next)
      },
      [onViewportChange]
    )
    const state = React.useMemo(
      () => ({
        zoom,
        settledZoom,
        isInteracting,
        visibleRect: viewport?.visibleRect ?? null
      }),
      [zoom, settledZoom, isInteracting, viewport?.visibleRect]
    )
    const [min, max] = zoomLimits(zoomOptions)
    const zoomLocked = zoomOptions.locked || zoomOptions.zoomEnabled === false
    const touchAction =
      zoomOptions.locked ||
      ((zoomOptions.dragPan === false || zoomOptions.pan === false) &&
        (zoomOptions.pinchZoom === false || zoomOptions.zoomEnabled === false))
        ? "auto"
        : "none"
    return (
      <NetworkZoomContext.Provider value={state}>
        <div
          ref={container}
          className="semiotic-network-zoom"
          onFocusCapture={(event) => {
            const id =
              event.target.closest<HTMLElement>("[data-mark-id]")?.dataset
                .markId
            if (!id) return
            const result =
              frame.current?.getCustomLayout?.() as NetworkLayoutResult | null
            reveal(result?.htmlMarks?.find((mark) => mark.id === id))
          }}
          style={{
            position: "relative",
            width: props.responsiveWidth ? "100%" : props.width,
            touchAction
          }}
        >
          <NetworkCustomChart
            {...chartProps}
            ref={frame}
            onObservation={observe}
            frameProps={{
              ...frameProps,
              viewTransform: zoom,
              onViewportChange: report
            }}
          />
          {zoomControls && (
            <div
              role="group"
              className="semiotic-network-zoom-controls"
              aria-label="Network viewport controls"
              data-network-zoom-ignore=""
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 0",
                touchAction: "auto"
              }}
            >
              <button
                type="button"
                aria-label="Zoom out"
                style={controlStyle}
                disabled={zoomLocked || zoom.k <= min}
                onClick={() => driver.current?.zoomBy(0.5)}
              >
                −
              </button>
              <output
                aria-label="Zoom level"
                style={{
                  minWidth: 54,
                  textAlign: "center",
                  fontVariantNumeric: "tabular-nums"
                }}
              >
                {Math.round(zoom.k * 100)}%
              </output>
              <button
                type="button"
                aria-label="Zoom in"
                style={controlStyle}
                disabled={zoomLocked || zoom.k >= max}
                onClick={() => driver.current?.zoomBy(2)}
              >
                +
              </button>
              <button
                type="button"
                disabled={zoomOptions.locked}
                onClick={() => fitToContent()}
                style={controlStyle}
              >
                Fit
              </button>
              <button
                type="button"
                disabled={zoomOptions.locked}
                onClick={resetZoom}
                style={controlStyle}
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </NetworkZoomContext.Provider>
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
