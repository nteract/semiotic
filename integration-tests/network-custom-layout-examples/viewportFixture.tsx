import * as React from "react"
import {
  NetworkCustomChart,
  networkHitTarget
} from "../../dist/network.module.min.js"
import type { NetworkCustomLayout } from "../../src/components/stream/networkCustomLayout"
import type { NetworkViewportSnapshot } from "../../src/components/stream/networkViewportTypes"

declare global {
  interface Window {
    networkViewportLayoutCalls: number
  }
}
window.networkViewportLayoutCalls = 0
const initialNodes = Array.from({ length: 30 }, (_, i) => ({
  id: String(i),
  x: 30,
  y: i * 80
}))
const edges: [] = []
const margin = { left: 30, top: 20, right: 20, bottom: 20 }
const ViewportContext = React.createContext<NetworkViewportSnapshot | null>(
  null
)

function Card({ id }: { id: string }) {
  const [draft, setDraft] = React.useState(`draft ${id}`)
  return (
    <label
      style={{
        display: "block",
        background: "#def",
        pointerEvents: "auto",
        height: 60
      }}
    >
      Card {id}
      <input
        aria-label={`Card ${id}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </label>
  )
}

function VisibleEdges() {
  const viewport = React.useContext(ViewportContext)
  const rect = viewport?.visibleRect
  return (
    <g data-testid="visible-edges" pointerEvents="none">
      {initialNodes
        .slice(1)
        .filter(
          (node) =>
            !rect || (node.y >= rect.y && node.y - 80 <= rect.y + rect.height)
        )
        .map((node) => (
          <path
            key={node.id}
            data-edge-id={node.id}
            d={`M345,${node.y - 50} L390,${node.y - 10} L345,${node.y + 30}`}
            fill="none"
            stroke="navy"
          />
        ))}
    </g>
  )
}

const layout: NetworkCustomLayout = (ctx) => {
  window.networkViewportLayoutCalls++
  return {
    sceneNodes: ctx.nodes.map((node) =>
      networkHitTarget({
        x: Number(node.data?.x),
        y: Number(node.data?.y),
        width: 300,
        height: 60,
        datum: node,
        id: node.id
      })
    ),
    htmlMarks: ctx.nodes.map((node) => ({
      id: node.id,
      x: Number(node.data?.x),
      y: Number(node.data?.y),
      width: 300,
      height: 60,
      content: <Card id={node.id} />
    })),
    overlays: <VisibleEdges />
  }
}

export function ViewportFixture() {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [nodes, setNodes] = React.useState(initialNodes)
  const [snapshot, setSnapshot] =
    React.useState<NetworkViewportSnapshot | null>(null)
  const [enabled, setEnabled] = React.useState(true)
  const [overscan, setOverscan] = React.useState(0)
  const [pin, setPin] = React.useState(true)
  const [mode, setMode] = React.useState("ref")
  const [alternate, setAlternate] = React.useState<HTMLDivElement | null>(null)
  const [alternateKey, setAlternateKey] = React.useState(0)
  const [height, setHeight] = React.useState(200)
  const viewport =
    mode === "auto"
      ? undefined
      : mode === "ref"
        ? { scrollContainerRef: rootRef }
        : { scrollContainer: mode === "null" ? null : alternate }
  return (
    <>
      <div>
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Cull
        </label>
        <label>
          <input
            type="checkbox"
            checked={pin}
            onChange={(event) => setPin(event.target.checked)}
          />
          Pin card 1
        </label>
        <label>
          Overscan
          <select
            aria-label="Overscan"
            value={overscan}
            onChange={(event) => setOverscan(Number(event.target.value))}
          >
            <option>0</option>
            <option>400</option>
          </select>
        </label>
        <label>
          Root
          <select
            aria-label="Root"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option>ref</option>
            <option>auto</option>
            <option>null</option>
            <option>external</option>
          </select>
        </label>
        <button onClick={() => setAlternateKey((key) => key + 1)}>
          Replace external root
        </button>
        <button
          onClick={() => setHeight((value) => (value === 200 ? 280 : 200))}
        >
          Resize viewport
        </button>
        <button
          onClick={() => setNodes((rows) => rows.map((node) => ({ ...node })))}
        >
          Replace nodes
        </button>
        <button
          onClick={() =>
            setNodes((rows) => rows.filter((node) => node.id !== "0"))
          }
        >
          Delete card 0
        </button>
      </div>
      <output data-testid="viewport">{JSON.stringify(snapshot)}</output>
      <div style={{ position: "relative" }}>
        <div
          key={alternateKey}
          ref={setAlternate}
          data-testid="external-root"
          style={{
            position: "absolute",
            left: 50,
            top: 30,
            width: 240,
            height: alternateKey % 2 ? 130 : 80,
            pointerEvents: "none"
          }}
        />
        <div
          ref={rootRef}
          data-testid="scroll-root"
          style={{
            overflow: "auto",
            width: 420,
            height,
            border: "6px solid gray"
          }}
        >
          <ViewportContext.Provider value={snapshot}>
            <NetworkCustomChart
              nodes={nodes}
              edges={edges}
              layout={layout}
              width={800}
              height={2440}
              margin={margin}
              animate={false}
              description="Scrollable topology cards"
              accessibleTable
              frameProps={{
                viewport,
                htmlMarkCulling: {
                  enabled,
                  overscan,
                  pinnedIds: pin ? ["1"] : []
                },
                onViewportChange: setSnapshot
              }}
            />
          </ViewportContext.Provider>
        </div>
      </div>
      <svg width={160} height={240} aria-label="Topology minimap">
        {initialNodes.map((node) => (
          <circle
            key={node.id}
            cx={20}
            cy={node.y / 10 + 3}
            r={2}
            fill="navy"
          />
        ))}
        {snapshot?.visibleRect && (
          <rect
            data-testid="minimap-window"
            x={snapshot.visibleRect.x / 5}
            y={snapshot.visibleRect.y / 10}
            width={snapshot.visibleRect.width / 5}
            height={snapshot.visibleRect.height / 10}
            fill="none"
            stroke="red"
          />
        )}
      </svg>
    </>
  )
}
