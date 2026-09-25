import * as React from "react"
import { TooltipRoot, hasTooltipContent, markTooltipChrome } from "semiotic/network"
import { unwrapDatum } from "semiotic/utils"
import { ZoomableNetworkCustomChart } from "semiotic/network/zoom"
import type {
  ZoomableNetworkCustomChartHandle,
  NetworkZoomOptions
} from "semiotic/network/zoom"
import type {
  NetworkCustomLayout,
  NetworkViewTransform,
  NetworkViewportSnapshot
} from "semiotic/network"

declare global {
  interface Window {
    networkZoomHandle: ZoomableNetworkCustomChartHandle | null
    networkZoomLayoutCalls: number
    networkZoomDemoLayoutCalls: number
    networkZoomChanges: { x: number; y: number; k: number }[]
  }
}
window.networkZoomLayoutCalls = 0
window.networkZoomChanges = []
const nodes = [{ id: "a" }, { id: "b" }],
  edges: [] = []
const layout: NetworkCustomLayout = () => {
  window.networkZoomLayoutCalls++
  return {
    sceneNodes: [
      {
        type: "rect",
        x: 100,
        y: 80,
        w: 120,
        h: 80,
        datum: { id: "a" },
        id: "a",
        style: { fill: "#3366cc" }
      },
      {
        type: "rect",
        x: 1200,
        y: 900,
        w: 120,
        h: 80,
        datum: { id: "b" },
        id: "b",
        style: { fill: "#6688aa" }
      }
    ],
    sceneEdges: [
      {
        type: "line",
        x1: 100,
        y1: 200,
        x2: 350,
        y2: 200,
        datum: { id: "edge" },
        style: { stroke: "#228844", strokeWidth: 2 }
      }
    ],
    htmlMarks: [
      {
        id: "a",
        x: 100,
        y: 80,
        width: 120,
        height: 80,
        content: (
          <input
            aria-label="Draft"
            defaultValue="hello"
            style={{ pointerEvents: "auto", width: 70, margin: 8 }}
          />
        )
      },
      {
        id: "b",
        x: 1200,
        y: 900,
        width: 120,
        height: 80,
        content: <span>Far card</span>
      }
    ],
    backgrounds: (
      <rect
        data-testid="world-background"
        x={100}
        y={80}
        width={120}
        height={80}
        fill="pink"
      />
    ),
    overlays: (
      <g data-testid="world-overlay">
        <rect x={100} y={80} width={120} height={80} fill="none" stroke="red" />
        <path d="M100,200 L350,200" stroke="green" />
      </g>
    )
  }
}
// An unmarked consumer wrapper around a library-owned surface.
const ChartTooltip = markTooltipChrome(function ChartTooltip({ label }: { label: string }) {
  const id = React.useId()
  return <TooltipRoot id={id} role="tooltip" style={{ background: "navy", color: "white" }}>{label}</TooltipRoot>
})
const MyTooltip = ({ label }: { label: string }) => <ChartTooltip label={label} />
const ownedTooltip = markTooltipChrome((datum: Record<string, unknown>) => <MyTooltip label={String(datum.id)} />)
const emptyResults: Record<string, React.ReactNode> = {
  null: null, undefined: undefined, boolean: false, true: true,
  text: "", whitespace: "  ", array: [], fragment: <>{null}{false}</>
}

export function ZoomFixture() {
  const tooltipMode = new URLSearchParams(location.search).get("tooltip")
  const rawTooltip = new URLSearchParams(location.search).has("raw-tooltip")
  const [width, setWidth] = React.useState(540)
  const tooltip = tooltipMode === "owned"
    ? ownedTooltip
    : tooltipMode && Object.hasOwn(emptyResults, tooltipMode)
      ? markTooltipChrome(() => {
          // A wrapping library suppresses empty consumer results before adding its surface.
          const result = emptyResults[tooltipMode]
          return hasTooltipContent(result) ? <MyTooltip label={String(result)} /> : null
        })
      : tooltipMode === "zero"
        ? () => 0
        : (datum: Record<string, unknown>) => <span data-testid="zoom-tooltip">{String(datum.id)}</span>
  const [viewport, setViewport] =
    React.useState<NetworkViewportSnapshot | null>(null)
  const [hover, setHover] = React.useState("none")
  const [zoom, setZoom] = React.useState<NetworkViewTransform>({
    x: 0,
    y: 0,
    k: 1
  })
  const [controlled, setControlled] = React.useState(false)
  const [accept, setAccept] = React.useState(false)
  const [options, setOptions] = React.useState<NetworkZoomOptions>({
    wheelZoom: true,
    duration: new URLSearchParams(location.search).has("animated") ? 180 : 0,
    minZoom: 0.25,
    maxZoom: 4
  })
  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={controlled}
          onChange={(e) => setControlled(e.target.checked)}
        />
        Controlled
      </label>
      <label>
        <input
          type="checkbox"
          checked={accept}
          onChange={(e) => setAccept(e.target.checked)}
        />
        Accept changes
      </label>
      <label>
        <input
          type="checkbox"
          onChange={(e) =>
            setOptions((old) => ({ ...old, locked: e.target.checked }))
          }
        />
        Lock
      </label>
      <button onClick={() => setWidth(340)}>Narrow chart</button>
      <ZoomableNetworkCustomChart
        nodes={nodes}
        edges={edges}
        layout={layout}
        width={width}
        height={360}
        margin={{ left: 30, top: 20, right: 10, bottom: 10 }}
        ref={(handle) => {
          window.networkZoomHandle = handle
        }}
        zoom={controlled ? zoom : undefined}
        onZoomChange={(next, event) => {
          if (event.phase === "moving") window.networkZoomChanges.push(next)
          if (accept && event.phase === "moving") setZoom(next)
        }}
        zoomOptions={options}
        animate={false}
        accessibleTable={false}
        tooltip={tooltipMode === "false" ? false : tooltip}
        onObservation={(event) => {
          if (event.type === "hover") setHover(String(event.datum?.id))
          if (event.type === "hover-end") setHover("none")
        }}
        frameProps={{
          ...(rawTooltip ? {
            tooltipContent: tooltipMode === "owned"
              ? markTooltipChrome((hover) => <MyTooltip label={String(unwrapDatum(hover)?.id)} />)
              : (hover) => tooltipMode && Object.hasOwn(emptyResults, tooltipMode)
                ? emptyResults[tooltipMode]
                : tooltip(unwrapDatum(hover) || {})
          } : {}),
          onViewportChange: setViewport,
          htmlMarkCulling: { overscan: 0 },
          paused: new URLSearchParams(location.search).has("paused")
        }}
      />
      <output data-testid="zoom-viewport">{JSON.stringify(viewport)}</output>
      <output data-testid="zoom-hover">{hover}</output>
    </>
  )
}
