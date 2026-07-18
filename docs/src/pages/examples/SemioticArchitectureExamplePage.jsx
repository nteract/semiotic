import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { NetworkCustomChart, useSelectionActions } from "semiotic"
import { networkHitTarget, unwrapDatum, useCustomLayoutSelection } from "semiotic/recipes"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  SEMIOTIC_ARCHITECTURE_EDGES,
  SEMIOTIC_ARCHITECTURE_NODES,
  SEMIOTIC_EXAMPLE_PROFILES,
  architectureHighlight,
} from "./data/semioticArchitecture"
import "./SemioticArchitectureExamplePage.css"

const CHART_HEIGHT = 1050
const MIN_CHART_WIDTH = 1100
// The minimap reuses positionArchitecture in a fixed coordinate space and lets
// the SVG viewBox scale it down into the 250px side panel.
const MINIMAP_LAYOUT_WIDTH = 1100
const SPINE_CONNECTOR_IDS = [
  "feature-bough",
  "input-static",
  "root-scene",
  "root-render",
  "root-data",
  "root-pipelines",
]
const SPINE_CONNECTOR_LABELS = {
  "feature-bough": "Shared capabilities",
  "input-static": "Data props",
  "root-scene": "Scene graph",
  "root-render": "Rendering engines",
  "root-data": "Data ingestion",
  "root-pipelines": "Pipeline stores",
}
const spineConnectorSet = new Set(SPINE_CONNECTOR_IDS)

export default function SemioticArchitectureExamplePage() {
  const [selectedId, setSelectedId] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [chartWidth, hostRef] = useResponsiveWidth(MIN_CHART_WIDTH, 1160)

  const selectedProfile = useMemo(
    () => SEMIOTIC_EXAMPLE_PROFILES.find((profile) => profile.id === selectedId) ?? null,
    [selectedId],
  )
  const highlighted = useMemo(() => architectureHighlight(selectedProfile), [selectedProfile])

  // The example buttons publish the expanded highlight set into the shared
  // selection store (write-only — this component doesn't re-render on selection
  // changes). The chart consumes it via `selection`, and because the layout
  // provides `restyle`, a button click restyles the existing scene + overlay
  // instead of re-running positionArchitecture and rebuilding the quadtree.
  const { selectPoints, clear } = useSelectionActions("architecture-highlight")
  useEffect(() => {
    if (selectedProfile) selectPoints({ id: [...highlighted] })
    else clear()
  }, [selectedProfile, highlighted, selectPoints, clear])

  const handleObservation = useCallback((observation) => {
    if (observation.type === "hover" && observation.datum) {
      setHoveredNode(unwrapDatum(observation.datum))
    } else if (observation.type === "hover-end") {
      setHoveredNode(null)
    }
  }, [])

  const detailNode = hoveredNode?.id ? hoveredNode : null

  return (
    <ExamplePageLayout title="The Living System of Semiotic">
      <p className="architecture-lede">
        For builders: which pieces of Semiotic power each demo? This map ties the public charts to
        the frames and shared systems underneath. Pick an example to light up only what that page
        uses.
      </p>

      <section className="architecture-controls" aria-labelledby="architecture-example-heading">
        <div className="architecture-controls-main">
          <div className="architecture-controls-heading">
            <div>
              <span className="architecture-kicker">Trace a composition</span>
              <h2 id="architecture-example-heading">Which parts does each example use?</h2>
            </div>
            <button
              type="button"
              className={`architecture-system-button ${selectedId == null ? "is-active" : ""}`}
              aria-pressed={selectedId == null}
              onClick={() => setSelectedId(null)}
            >
              Whole system
            </button>
          </div>
          <div
            className="architecture-example-buttons"
            role="group"
            aria-label="Highlight an example"
          >
            {SEMIOTIC_EXAMPLE_PROFILES.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className={profile.id === selectedId ? "is-active" : ""}
                aria-pressed={profile.id === selectedId}
                onClick={() =>
                  setSelectedId((current) => (current === profile.id ? null : profile.id))
                }
              >
                {profile.shortLabel || profile.label}
              </button>
            ))}
          </div>
        </div>
        <ArchitectureMiniMap
          highlighted={highlighted}
          hasSelection={selectedProfile != null}
          label={
            selectedProfile ? selectedProfile.shortLabel || selectedProfile.label : "Whole system"
          }
        />
      </section>

      <section className="architecture-figure" aria-label="Semiotic architecture Diagram">
        <div className="architecture-chart-scroller" ref={hostRef}>
          <div style={{ width: chartWidth }}>
            <NetworkCustomChart
              nodes={SEMIOTIC_ARCHITECTURE_NODES}
              edges={SEMIOTIC_ARCHITECTURE_EDGES}
              layout={semioticArchitectureLayout}
              chartId="semiotic-architecture"
              selection={{ name: "architecture-highlight" }}
              width={chartWidth}
              height={CHART_HEIGHT}
              margin={0}
              enableHover
              onObservation={handleObservation}
              description="A diagram of Semiotic's functionality organized by visibility and optional feature usage. Visible Semiotic fans upward through five frame models into chart HOCs, capability stars annotate the public surface, six internal systems join it to Semiotic Internals, and private subsystems fan downward."
              summary={
                selectedProfile
                  ? `${selectedProfile.label} uses ${selectedProfile.uses.length} directly configured architecture elements; its supporting branch and implementation roots are highlighted.`
                  : `The map contains ${SEMIOTIC_ARCHITECTURE_NODES.length} architecture elements and ${SEMIOTIC_ARCHITECTURE_EDGES.length} structural or dependency relationships.`
              }
              accessibleTable
              frameProps={{
                background: "transparent",
                tooltipContent: renderArchitectureTooltip,
              }}
            />
          </div>
        </div>

        <ArchitectureReadout
          node={detailNode}
          profile={selectedProfile}
          highlightedCount={highlighted.size}
        />
      </section>

      <section className="architecture-explanation">
        <div>
          <span className="architecture-kicker">How to read it</span>
          <h2>How public charts connect to shared internals</h2>
        </div>
        <div className="architecture-explanation-grid">
          <p>
            The upper network diagram fans from Visible Semiotic into XY, Ordinal, Network, Geo,
            and Physics frames, then into exact HOCs and grouped chart families. Shared settings
            and composition tools sit on the two gold-star semicircles that frame this public
            surface.
          </p>
          <p>
            Six central ribbons carry shared capabilities, data props, scene graphs, rendering
            engines, data ingestion, and pipeline stores between Visible Semiotic and Semiotic
            Internals. The lower network then fans into interaction, state, theming, streaming,
            annotation, recipes, accessibility, and output machinery.
          </p>
        </div>
      </section>
    </ExamplePageLayout>
  )
}

// A simplified overview that keeps the full diagram's composition — the canopy
// fan, the load-bearing spine, the internal fan, and the two capability rings —
// but swaps filled ribbons for plain lines and stars/rects for circles, so the
// whole shape fits in a 250px panel and the difference between examples is
// legible at a glance as you click through.
function minimapRadius(node) {
  if (node.id === "semiotic-core" || node.id === "semiotic-internals") return 22
  if (node.layer === "frame") return 15
  if (node.layer === "root") return 13
  if (node.layer === "input" || node.layer === "branch") return 12
  return 8
}

// Build the minimap scene from the same positions the full chart uses, so the
// two stay in sync. Mirrors the connection topology drawn by ArchitectureOverlay
// (canopy / spine / internal fan / side branches) rather than the raw data edges
// — the rhizome `supports` relationships are not drawn as lines in the diagram.
function buildMinimapScene() {
  const positioned = positionArchitecture(
    SEMIOTIC_ARCHITECTURE_NODES.map((node) => node.data ?? node),
    { width: MINIMAP_LAYOUT_WIDTH },
  ).map((node) => ({ ...node, r: minimapRadius(node) }))
  const byId = new Map(positioned.map((node) => [node.id, node]))
  const core = byId.get("semiotic-core")
  const internals = byId.get("semiotic-internals")

  const line = (id, kind, source, target, endpoints) => ({
    id,
    kind,
    endpoints,
    x1: source.x,
    y1: source.y,
    x2: target.x,
    y2: target.y,
  })

  const lines = []
  // Canopy fan: core → frames → leaves, plus the value side-branch.
  for (const frame of positioned.filter((n) => n.layer === "frame")) {
    lines.push(line(`canopy-${frame.id}`, "canopy", core, frame, [core.id, frame.id]))
  }
  for (const leaf of positioned.filter(
    (n) => (n.layer === "leaf" || n.layer === "leaf-group") && n.cluster !== "value",
  )) {
    const frame = byId.get(leaf.parent)
    if (frame)
      lines.push(line(`${frame.id}-${leaf.id}`, "canopy", frame, leaf, [frame.id, leaf.id]))
  }
  const value = byId.get("value-components")
  const bigNumber = byId.get("hoc-big-number")
  if (value) lines.push(line("core-value", "canopy", core, value, [core.id, value.id]))
  if (value && bigNumber) {
    lines.push(line("value-big", "canopy", value, bigNumber, [value.id, bigNumber.id]))
  }

  // Load-bearing spine: parallel lines from Visible Semiotic to Internals, one
  // per connector, matching LoadBearingSpine's geometry.
  const connectorWidth = 27
  const gap = 7
  const totalWidth =
    SPINE_CONNECTOR_IDS.length * connectorWidth + (SPINE_CONNECTOR_IDS.length - 1) * gap
  const spineStartX = core.x - totalWidth / 2 + connectorWidth / 2
  SPINE_CONNECTOR_IDS.forEach((id, index) => {
    const x = spineStartX + index * (connectorWidth + gap)
    lines.push({
      id: `spine-${id}`,
      kind: "spine",
      endpoints: [id],
      x1: x,
      y1: core.y + core.height / 2,
      x2: x,
      y2: internals.y - internals.height / 2,
    })
  })

  // Internal fan: Internals → each implementation root, plus the push branch.
  for (const root of positioned.filter((n) => n.layer === "root" && !spineConnectorSet.has(n.id))) {
    lines.push(line(`fan-${root.id}`, "internal", internals, root, [internals.id, root.id]))
  }
  const push = byId.get("input-push")
  if (push) lines.push(line("side-push", "internal", internals, push, [internals.id, push.id]))

  // Node marks mirror the diagram: visible nodes + capabilities (as circles),
  // never the spine connectors — those are the spine lines above.
  const dots = positioned.filter((n) => !spineConnectorSet.has(n.id))

  // The two capability rings the fruit sit on, as thin arcs (from CapabilityStars).
  const centerX = MINIMAP_LAYOUT_WIDTH / 2
  const arcs = [
    `M38,414 A${centerX - 38},365 0 0 1 ${MINIMAP_LAYOUT_WIDTH - 38},414`,
    `M118,414 A${centerX - 118},286 0 0 1 ${MINIMAP_LAYOUT_WIDTH - 118},414`,
  ]

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of dots) {
    minX = Math.min(minX, node.x - node.r)
    minY = Math.min(minY, node.y - node.r)
    maxX = Math.max(maxX, node.x + node.r)
    maxY = Math.max(maxY, node.y + node.r)
  }
  const pad = 16
  const viewBox = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`

  return { dots, lines, arcs, viewBox }
}

function ArchitectureMiniMap({ highlighted, hasSelection, label }) {
  const { dots, lines, arcs, viewBox } = useMemo(buildMinimapScene, [])
  const isActive = (id) => !hasSelection || highlighted.has(id)

  return (
    <aside className="architecture-minimap" aria-hidden="true">
      <span className="architecture-kicker">Full map</span>
      <p className="architecture-minimap-caption">{label}</p>
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        <g className={`architecture-minimap-lines ${hasSelection ? "has-selection" : ""}`}>
          {arcs.map((d, index) => (
            <path key={`arc-${index}`} d={d} className="architecture-minimap-arc" />
          ))}
          {lines.map((edge) => {
            const active = edge.endpoints.every(isActive)
            return (
              <line
                key={edge.id}
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                className={[
                  "architecture-minimap-edge",
                  `is-${edge.kind}`,
                  hasSelection ? (active ? "is-active" : "is-dimmed") : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            )
          })}
        </g>
        <g className="architecture-minimap-dots">
          {dots.map((node) => (
            <circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={node.r}
              className={[
                "architecture-minimap-dot",
                `is-${node.layer}`,
                hasSelection ? (isActive(node.id) ? "is-active" : "is-dimmed") : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          ))}
        </g>
      </svg>
    </aside>
  )
}

function ArchitectureReadout({ node, profile, highlightedCount }) {
  if (node) {
    return (
      <aside className="architecture-readout" aria-live="polite">
        <span className={`architecture-readout-kind is-${node.layer}`}>
          {layerLabel(node.layer)}
        </span>
        <strong>{node.label}</strong>
        <p>{node.detail}</p>
      </aside>
    )
  }

  if (profile) {
    return (
      <aside className="architecture-readout" aria-live="polite">
        <span className="architecture-readout-kind is-example">Example path</span>
        <strong>{profile.label}</strong>
        <p>{profile.note}</p>
        <div className="architecture-profile-meta">
          <span>{profile.uses.length} direct choices</span>
          <span>{highlightedCount} elements with supporting paths</span>
          <Link to={profile.path}>Open example →</Link>
        </div>
      </aside>
    )
  }

  return (
    <aside className="architecture-readout" aria-live="polite">
      <span className="architecture-readout-kind is-system">System view</span>
      <strong>Hover any element to inspect it.</strong>
      <p>
        Ribbons widen toward the shared frame and runtime systems. Stars mark cross-frame
        capabilities. Select an example above to dim everything outside its implementation path.
      </p>
    </aside>
  )
}

function semioticArchitectureLayout(ctx) {
  const rawNodes = ctx.nodes.map((node) => node.data ?? node)
  const positioned = positionArchitecture(rawNodes, ctx.dimensions.plot)
  const positionedById = new Map(positioned.map((node) => [node.id, node]))

  const sceneNodes = positioned.map((node) =>
    networkHitTarget({
      x: node.x - node.width / 2,
      y: node.y - node.height / 2,
      width: node.width,
      height: node.height,
      datum: node,
      id: node.id,
      label: `${node.label}. ${node.detail}`,
    }),
  )

  return {
    sceneNodes,
    // The visible marks all live in the overlay; the scene nodes are invisible
    // hit targets with nothing to restyle. Providing a (no-op) restyle still
    // matters: it opts the chart into the style-only selection path, so a
    // highlight change swaps the overlay's selection context without re-running
    // this layout or rebuilding the hit-test quadtree.
    restyle: () => undefined,
    overlays: (
      <ArchitectureOverlay
        nodes={positioned}
        nodeById={positionedById}
        width={ctx.dimensions.plot.width}
      />
    ),
  }
}

function ArchitectureOverlay({ nodes, nodeById, width }) {
  // Re-renders on selection change via context; the canvas scene stays put.
  const selection = useCustomLayoutSelection()
  const hasSelection = selection.isActive
  const isActive = (id) => !hasSelection || selection.predicate({ id })
  const visible = nodeById.get("semiotic-core")
  const internals = nodeById.get("semiotic-internals")
  const frames = nodes.filter((node) => node.layer === "frame")
  const leaves = nodes.filter((node) => node.layer === "leaf" || node.layer === "leaf-group")
  const capabilities = nodes.filter((node) => node.layer === "fruit")
  const internalRoots = nodes.filter(
    (node) => node.layer === "root" && !spineConnectorSet.has(node.id),
  )
  const visibleNodes = nodes.filter(
    (node) => node.layer !== "fruit" && !spineConnectorSet.has(node.id),
  )

  return (
    <g
      className={`architecture-overlay architecture-diagram ${hasSelection ? "has-selection" : "is-overview"}`}
      pointerEvents="none"
    >
      <defs>
        <linearGradient id="architecture-upper-ribbon" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--semiotic-primary, #4f8fc7)" />
          <stop offset="100%" stopColor="var(--semiotic-success, #4f9362)" />
        </linearGradient>
        <linearGradient id="architecture-spine-ribbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--semiotic-primary, #4f8fc7)" />
          <stop offset="100%" stopColor="var(--semiotic-info, #4d8fa8)" />
        </linearGradient>
        <linearGradient id="architecture-lower-ribbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--semiotic-info, #4d8fa8)" />
          <stop offset="100%" stopColor="var(--text-secondary)" />
        </linearGradient>
        <filter id="architecture-active-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <SankeyCanopy
        visible={visible}
        frames={frames}
        leaves={leaves}
        nodeById={nodeById}
        isActive={isActive}
      />
      <CapabilityStars
        capabilities={capabilities}
        width={width}
        isActive={isActive}
        selectionActive={hasSelection}
      />
      <LoadBearingSpine
        visible={visible}
        internals={internals}
        nodeById={nodeById}
        isActive={isActive}
      />
      <InternalSideBranch internals={internals} nodeById={nodeById} isActive={isActive} />
      <InternalFan internals={internals} roots={internalRoots} isActive={isActive} />

      {visibleNodes.map((node) => (
        <ArchitectureNode
          key={node.id}
          node={node}
          active={isActive(node.id)}
          selectionActive={hasSelection}
        />
      ))}
    </g>
  )
}

function SankeyCanopy({ visible, frames, leaves, nodeById, isActive }) {
  const valueBranch = nodeById.get("value-components")
  const bigNumber = nodeById.get("hoc-big-number")

  return (
    <g className="architecture-diagram-canopy">
      {frames.map((frame) => (
        <SankeyRibbon
          key={`visible-${frame.id}`}
          source={visible}
          target={frame}
          sourceWidth={34}
          targetWidth={19}
          active={isActive(visible.id) && isActive(frame.id)}
          kind="upper"
        />
      ))}
      {leaves
        .filter((leaf) => leaf.cluster !== "value")
        .map((leaf) => {
          const frame = nodeById.get(leaf.parent)
          return (
            <SankeyRibbon
              key={`${frame.id}-${leaf.id}`}
              source={frame}
              target={leaf}
              sourceWidth={9}
              targetWidth={3}
              active={isActive(frame.id) && isActive(leaf.id)}
              kind="upper"
            />
          )
        })}
      <SideRibbon
        source={visible}
        target={valueBranch}
        sourceWidth={16}
        targetWidth={10}
        active={isActive(visible.id) && isActive(valueBranch.id)}
      />
      <SideRibbon
        source={valueBranch}
        target={bigNumber}
        sourceWidth={7}
        targetWidth={3}
        active={isActive(valueBranch.id) && isActive(bigNumber.id)}
      />
    </g>
  )
}

function SankeyRibbon({ source, target, sourceWidth, targetWidth, active, kind }) {
  if (!source || !target) return null
  return (
    <path
      d={verticalRibbonPath(source, target, sourceWidth, targetWidth)}
      className={`architecture-ribbon is-${kind} ${active ? "is-active" : "is-dimmed"}`}
    />
  )
}

function SideRibbon({ source, target, sourceWidth, targetWidth, active }) {
  if (!source || !target) return null
  return (
    <path
      d={horizontalRibbonPath(source, target, sourceWidth, targetWidth)}
      className={`architecture-ribbon is-side ${active ? "is-active" : "is-dimmed"}`}
    />
  )
}

function LoadBearingSpine({ visible, internals, nodeById, isActive }) {
  const connectorWidth = 27
  const gap = 7
  const totalWidth =
    SPINE_CONNECTOR_IDS.length * connectorWidth + (SPINE_CONNECTOR_IDS.length - 1) * gap
  const startX = visible.x - totalWidth / 2 + connectorWidth / 2
  const midpointY = (visible.y + internals.y) / 2

  return (
    <g className="architecture-load-bearing-spine">
      <rect
        className="architecture-spine-tie"
        x={visible.x - totalWidth / 2 - 7}
        y={midpointY - 42}
        width={totalWidth + 14}
        height="7"
        rx="3.5"
      />
      <rect
        className="architecture-spine-tie"
        x={visible.x - totalWidth / 2 - 7}
        y={midpointY + 36}
        width={totalWidth + 14}
        height="7"
        rx="3.5"
      />
      {SPINE_CONNECTOR_IDS.map((id, index) => {
        const connector = nodeById.get(id)
        const x = startX + index * (connectorWidth + gap)
        const active = isActive(id)
        return (
          <g key={id} className={active ? "is-active" : "is-dimmed"}>
            <path
              d={spineRibbonPath(visible, internals, x, connectorWidth)}
              className="architecture-ribbon is-spine"
            />
            <text
              x={x}
              y={midpointY}
              transform={`rotate(-90 ${x} ${midpointY})`}
              className="architecture-spine-label"
            >
              {SPINE_CONNECTOR_LABELS[id] || connector.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function InternalFan({ internals, roots, isActive }) {
  return (
    <g className="architecture-internal-fan">
      {roots.map((root) => (
        <SankeyRibbon
          key={`${internals.id}-${root.id}`}
          source={internals}
          target={root}
          sourceWidth={18}
          targetWidth={7}
          active={isActive(internals.id) && isActive(root.id)}
          kind="lower"
        />
      ))}
    </g>
  )
}

function InternalSideBranch({ internals, nodeById, isActive }) {
  const pushApi = nodeById.get("input-push")

  return (
    <g className="architecture-internal-side-branch">
      <SideRibbon
        source={internals}
        target={pushApi}
        sourceWidth={14}
        targetWidth={9}
        active={isActive(internals.id) && isActive(pushApi.id)}
      />
    </g>
  )
}

function CapabilityStars({ capabilities, width, isActive, selectionActive }) {
  const centerX = width / 2
  return (
    <g className="architecture-capability-ring">
      <path d={`M38,414 A${centerX - 38},365 0 0 1 ${width - 38},414`} />
      <path d={`M118,414 A${centerX - 118},286 0 0 1 ${width - 118},414`} />
      {capabilities.map((node) => {
        const active = isActive(node.id)
        const anchor = node.x < centerX - 40 ? "start" : node.x > centerX + 40 ? "end" : "middle"
        const labelX = anchor === "start" ? node.x + 13 : anchor === "end" ? node.x - 13 : node.x
        const labelY = anchor === "middle" ? node.y - 15 : node.y + 3
        return (
          <g
            key={node.id}
            className={[
              "architecture-capability-star",
              active ? "is-active" : "is-dimmed",
              selectionActive && active ? "is-traced" : "",
            ].join(" ")}
          >
            <path d={starPath(node.x, node.y, 10, 4.5)} />
            <text x={labelX} y={labelY} textAnchor={anchor}>
              {node.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function ArchitectureNode({ node, active, selectionActive }) {
  const className = [
    "architecture-node",
    `is-${node.layer}`,
    active ? "is-active" : "is-dimmed",
    selectionActive && active ? "is-traced" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <g className={className} transform={`translate(${node.x},${node.y})`}>
      <rect
        x={-node.width / 2}
        y={-node.height / 2}
        width={node.width}
        height={node.height}
        rx={
          node.layer === "leaf" || node.layer === "leaf-group" || node.layer === "root"
            ? node.height / 2
            : 7
        }
      />
      <text y={node.layer === "root" ? -2 : 4}>{node.label}</text>
      {node.layer === "root" && (
        <text y="13" className="architecture-root-index">
          INTERNAL {String(node.internalOrder).padStart(2, "0")}
        </text>
      )}
    </g>
  )
}

function positionArchitecture(rawNodes, plot) {
  const internalRoots = rawNodes.filter(
    (node) => node.layer === "root" && !spineConnectorSet.has(node.id),
  )
  const rootIndex = new Map(internalRoots.map((node, index) => [node.id, index]))

  return rawNodes.map((node) => {
    const size = nodeSize(node)
    const target = nodeTarget(node, plot.width, rootIndex)
    const internalOrder = rootIndex.has(node.id) ? rootIndex.get(node.id) + 1 : undefined
    return { ...node, ...size, x: target.x, y: target.y, internalOrder }
  })
}

function nodeTarget(node, width, rootIndex) {
  const clusterCenter = {
    xy: width * 0.16,
    ordinal: width * 0.34,
    network: width * 0.5,
    geo: width * 0.66,
    physics: width * 0.84,
  }

  if (spineConnectorSet.has(node.id)) {
    const index = SPINE_CONNECTOR_IDS.indexOf(node.id)
    return {
      x: width / 2 - 85 + index * 34,
      y: 688,
    }
  }
  if (node.layer === "fruit") return capabilityPosition(node.order, width)
  if (node.layer === "leaf" || node.layer === "leaf-group") {
    if (node.id === "hoc-big-number") return { x: width / 2 + 430, y: 555 }
    const offsets = [
      [-62, -70],
      [62, -92],
      [-91, -137],
      [88, -165],
      [-48, -213],
      [57, -247],
      [-92, -284],
      [5, -323],
      [94, -300],
    ]
    const [xOffset, yOffset] = offsets[node.order] ?? [0, -320]
    return { x: clusterCenter[node.cluster] + xOffset, y: 455 + yOffset }
  }
  if (node.layer === "frame") return { x: clusterCenter[node.cluster], y: 455 }
  if (node.id === "value-components") return { x: width / 2 + 260, y: 555 }
  if (node.id === "semiotic-core") return { x: width / 2, y: 555 }
  if (node.id === "semiotic-internals") return { x: width / 2, y: 820 }
  if (node.id === "input-push") return { x: width / 2 - 260, y: 820 }
  if (node.layer === "root") {
    const index = rootIndex.get(node.id) ?? 0
    const columnCount = 5
    const column = index % columnCount
    const row = Math.floor(index / columnCount)
    return {
      x: 100 + column * ((width - 200) / (columnCount - 1)),
      y: 925 + row * 88,
    }
  }
  return { x: width / 2, y: 640 }
}

function nodeSize(node) {
  if (node.id === "semiotic-core" || node.id === "semiotic-internals") {
    return { width: 282, height: 58 }
  }
  if (spineConnectorSet.has(node.id)) return { width: 28, height: 180 }
  if (node.layer === "frame") return { width: 146, height: 40 }
  if (node.id === "value-components") return { width: 146, height: 36 }
  if (node.id === "input-push") return { width: 136, height: 34 }
  if (node.layer === "fruit") return { width: 140, height: 28 }
  if (node.layer === "root") return { width: 190, height: 46 }
  return { width: 126, height: 30 }
}

function capabilityPosition(order, width) {
  const outer = order % 2 === 0
  const index = Math.floor(order / 2)
  const count = 8
  const angle = Math.PI + (index / (count - 1)) * Math.PI
  const radiusX = outer ? width / 2 - 42 : width / 2 - 122
  const radiusY = outer ? 365 : 286
  return {
    x: width / 2 + Math.cos(angle) * radiusX,
    y: 414 + Math.sin(angle) * radiusY,
  }
}

function verticalRibbonPath(source, target, sourceWidth, targetWidth) {
  const upward = target.y < source.y
  const sourceY = source.y + (upward ? -source.height / 2 : source.height / 2)
  const targetY = target.y + (upward ? target.height / 2 : -target.height / 2)
  const middleY = (sourceY + targetY) / 2
  return `M${source.x - sourceWidth / 2},${sourceY}
    C${source.x - sourceWidth / 2},${middleY}
      ${target.x - targetWidth / 2},${middleY}
      ${target.x - targetWidth / 2},${targetY}
    L${target.x + targetWidth / 2},${targetY}
    C${target.x + targetWidth / 2},${middleY}
      ${source.x + sourceWidth / 2},${middleY}
      ${source.x + sourceWidth / 2},${sourceY} Z`
}

function spineRibbonPath(visible, internals, x, ribbonWidth) {
  const sourceY = visible.y + visible.height / 2
  const targetY = internals.y - internals.height / 2
  return `M${x - ribbonWidth / 2},${sourceY}
    L${x - ribbonWidth / 2},${targetY}
    L${x + ribbonWidth / 2},${targetY}
    L${x + ribbonWidth / 2},${sourceY} Z`
}

function horizontalRibbonPath(source, target, sourceWidth, targetWidth) {
  const targetIsRight = target.x >= source.x
  const sourceX = source.x + (targetIsRight ? source.width / 2 : -source.width / 2)
  const targetX = target.x + (targetIsRight ? -target.width / 2 : target.width / 2)
  if (Math.abs(source.y - target.y) < 0.5) {
    return `M${sourceX},${source.y - sourceWidth / 2}
      L${targetX},${target.y - targetWidth / 2}
      L${targetX},${target.y + targetWidth / 2}
      L${sourceX},${source.y + sourceWidth / 2} Z`
  }
  const middleX = (sourceX + targetX) / 2
  return `M${sourceX},${source.y - sourceWidth / 2}
    C${middleX},${source.y - sourceWidth / 2}
      ${middleX},${target.y - targetWidth / 2}
      ${targetX},${target.y - targetWidth / 2}
    L${targetX},${target.y + targetWidth / 2}
    C${middleX},${target.y + targetWidth / 2}
      ${middleX},${source.y + sourceWidth / 2}
      ${sourceX},${source.y + sourceWidth / 2} Z`
}

function starPath(cx, cy, outerRadius, innerRadius) {
  const points = []
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    const angle = -Math.PI / 2 + (index * Math.PI) / 5
    points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`)
  }
  return `M${points.join("L")}Z`
}

function renderArchitectureTooltip(datum) {
  const node = unwrapDatum(datum)
  if (!node?.label) return null
  return (
    <div className="semiotic-tooltip architecture-tooltip">
      <strong>{node.label}</strong>
      <span>{node.detail}</span>
    </div>
  )
}

function layerLabel(layer) {
  if (layer === "leaf" || layer === "leaf-group") return "Visible leaf"
  if (layer === "fruit") return "Shared capability"
  if (layer === "root") return "Implementation root"
  if (layer === "frame") return "Frame model"
  if (layer === "input") return "Data path"
  if (layer === "internal-core") return "Runtime core"
  return layer === "trunk" ? "Core trunk" : "Public branch"
}
