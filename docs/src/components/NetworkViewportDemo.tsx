import * as React from "react"
import { NetworkCustomChart, networkHitTarget } from "semiotic/network"
import type { NetworkCustomLayout, NetworkViewportSnapshot } from "semiotic/network"

const nodes = Array.from({ length: 30 }, (_, i) => ({
  id: `step-${i}`,
  label: `Stage ${i + 1}`,
  x: 20,
  y: 20 + i * 64,
}))
const edges: [] = []
const margin = { left: 20, top: 20, right: 20, bottom: 20 }
const DemoContext = React.createContext<{
  viewport: NetworkViewportSnapshot | null
  selected: string | null
  select: (id: string) => void
}>({ viewport: null, selected: null, select: () => {} })

function Card({ id, label }: { id: string; label: string }) {
  const { selected, select } = React.useContext(DemoContext)
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 8,
        boxSizing: "border-box",
        height: 48,
        background: "var(--surface-2, #edf3f8)",
        border: `2px solid ${selected === id ? "var(--accent, #4267a4)" : "var(--border-color, #ccd5df)"}`,
        borderRadius: 6,
        pointerEvents: "auto",
      }}
    >
      <button type="button" aria-pressed={selected === id} onClick={() => select(id)}>
        {label}
      </button>
      <input aria-label={`Note for ${label}`} placeholder="Add a note" style={{ width: 150 }} />
    </div>
  )
}

function VisibleEdges() {
  const { viewport } = React.useContext(DemoContext)
  const rect = viewport?.visibleRect
  return (
    <g pointerEvents="none">
      {nodes
        .slice(1)
        .filter((node) => !rect || (node.y + 24 >= rect.y && node.y - 40 <= rect.y + rect.height))
        .map((node) => (
          <path
            key={node.id}
            d={`M360,${node.y - 40} C440,${node.y - 40} 440,${node.y + 24} 360,${node.y + 24}`}
            fill="none"
            stroke="var(--accent, #4267a4)"
            strokeWidth={2}
          />
        ))}
    </g>
  )
}

const layout: NetworkCustomLayout = (ctx) => ({
  sceneNodes: ctx.nodes.map((node) =>
    networkHitTarget({
      x: Number(node.data?.x),
      y: Number(node.data?.y),
      width: 340,
      height: 48,
      datum: node,
      id: node.id,
    }),
  ),
  htmlMarks: ctx.nodes.map((node) => ({
    id: node.id,
    x: Number(node.data?.x),
    y: Number(node.data?.y),
    width: 340,
    height: 48,
    content: <Card id={node.id} label={String(node.data?.label)} />,
  })),
  overlays: <VisibleEdges />,
})

/** Cards, SVG edge culling and minimap share the frame's viewport report. */
export default function NetworkViewportDemo() {
  const [scrollContainer, setScrollContainer] = React.useState<HTMLDivElement | null>(null)
  const [viewport, setViewport] = React.useState<NetworkViewportSnapshot | null>(null)
  const [selected, setSelected] = React.useState<string | null>(null)
  const options = React.useMemo(() => ({ scrollContainer }), [scrollContainer])
  const culling = React.useMemo(
    () => ({ overscan: 80, pinnedIds: selected ? [selected] : [] }),
    [selected],
  )
  const select = React.useCallback(
    (id: string) => setSelected((previous) => (previous === id ? null : id)),
    [],
  )
  const value = React.useMemo(() => ({ viewport, selected, select }), [viewport, selected, select])
  const rect = viewport?.visibleRect
  return (
    <div>
      <p>
        Scroll the stages. Select a card to retain it, or edit its note to keep it mounted while
        focused.
      </p>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div
          ref={setScrollContainer}
          style={{
            overflow: "auto",
            height: 280,
            width: 520,
            maxWidth: "100%",
            border: "1px solid var(--border-color, #ccd5df)",
          }}
        >
          <DemoContext.Provider value={value}>
            <NetworkCustomChart
              nodes={nodes}
              edges={edges}
              layout={layout}
              width={520}
              height={2000}
              margin={margin}
              animate={false}
              description="Thirty topology stages with editable notes"
              summary="Scroll to explore the topology. The minimap outlines the visible region."
              accessibleTable
              frameProps={{
                viewport: options,
                htmlMarkCulling: culling,
                onViewportChange: setViewport,
              }}
            />
          </DemoContext.Provider>
        </div>
        <svg
          width={70}
          height={245}
          viewBox="0 0 480 1960"
          role="img"
          aria-label="Minimap with visible window"
          style={{ flexShrink: 0 }}
        >
          {nodes.map((node) => (
            <circle key={node.id} cx={190} cy={node.y + 24} r={20} fill="var(--accent, #4267a4)" />
          ))}
          {rect && (
            <rect
              {...rect}
              fill="var(--accent, #4267a4)"
              fillOpacity={0.15}
              stroke="var(--accent, #4267a4)"
              strokeWidth={8}
            />
          )}
        </svg>
      </div>
      <p aria-live="polite">
        {viewport?.visibleMarkIds?.length ?? nodes.length} visible;{" "}
        {viewport?.mountedMarkIds.length ?? nodes.length} mounted.{" "}
        {selected ? `${selected} is pinned.` : "No card is pinned."}
      </p>
    </div>
  )
}
