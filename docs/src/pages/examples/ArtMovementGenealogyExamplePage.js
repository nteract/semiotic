import React, { useCallback, useMemo, useState } from "react"
import { NetworkCustomChart } from "semiotic"
// Custom-network kit: the axis-fixed force positioner (year → y, relax x with
// rect-aware collision), the edge-router builders that fan parallel influence
// arcs apart, the transparent hit-target node, and the datum unwrapper.
import {
  axisFixedForcePositions,
  boxEdgeAnchors,
  curvedEdgePath,
  fanOutBend,
  networkHitTarget,
  unwrapDatum,
  useCustomLayoutSelection,
} from "semiotic/recipes"
import CodeBlock from "../../components/CodeBlock"
import { StatStrip } from "../../components/StatStrip"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import { ART_MOVEMENT_EDGES, ART_MOVEMENT_NODES, ART_YEAR_DOMAIN } from "./data/artMovements"

// Art-directed palette from Alfred Barr's 1936 dust jacket. This example sits at
// the "override the theme" end of Semiotic's theming spectrum (the Climate
// Anomaly example sits at the "lean entirely on theme tokens" end): the frame
// background is transparent and the layout paints these fixed editorial colors
// rather than --semiotic-* tokens. Both are first-class uses of the theme system.
const INK = "#25211d"
const RED = "#a52928"
const PAPER = "#d5d0bc"
const MIN_CHART_WIDTH = 820
const CHART_HEIGHT = 1010

const implementationCode = `import { axisFixedForcePositions, networkHitTarget } from "semiotic/recipes"

function chronologicalInfluenceLayout(ctx) {
  // year pins y; edge attraction + rect-aware collision relax x
  const { positioned } = axisFixedForcePositions(ctx.nodes, ctx.edges, ctx.dimensions.plot, {
    fixedAccessor: "year",
    fixedDomain: [1886, 1935],
    size: (d) => nodeGeometry(d),
  })

  return {
    // networkHitTarget → transparent, keyboard-navigable, anchorable hit node
    sceneNodes: positioned.map(node => networkHitTarget({
      x: node.x - node.width / 2,
      y: node.y - node.height / 2,
      width: node.width,
      height: node.height,
      datum: node,
      id: node.id,
    })),
    overlays: <InfluenceDiagram nodes={positioned} edges={ctx.edges} />
  }
}

<NetworkCustomChart
  nodes={movements}
  edges={influences}
  layout={chronologicalInfluenceLayout}
  width={width}
  height={1010}
  enableHover
/>`

export default function ArtMovementGenealogyExamplePage() {
  const [activeNode, setActiveNode] = useState(null)
  const [chartWidth, hostRef] = useResponsiveWidth(MIN_CHART_WIDTH)

  const connectedCount = useMemo(() => {
    if (!activeNode) return 0
    return ART_MOVEMENT_EDGES.filter(
      (edge) => edge.source === activeNode.id || edge.target === activeNode.id,
    ).length
  }, [activeNode])

  const handleObservation = useCallback((observation) => {
    if (observation.type === "hover" && observation.datum) {
      // unwrapDatum collapses the wrapped-vs-raw datum split from onObservation.
      const node = unwrapDatum(observation.datum)
      setActiveNode(node?.year ? node : null)
    } else if (observation.type === "hover-end") {
      setActiveNode(null)
    }
  }, [])

  return (
    <ExamplePageLayout title="A Genealogy of Cubism and Abstract Art">
      <p style={styles.lede}>
        An dynamic map of artistic influence inspired by the diagram from Alfred H. Barr Jr.&apos;s
        1936 dust jacket. Time provides the vertical structure; graph relationships and collision
        constraints determine the horizontal arrangement.
      </p>

      <StatStrip
        items={[
          { value: "26", label: "artists, movements, and ideas" },
          { value: "50", label: "directed influences" },
          { value: "0", label: "hand-authored x/y positions" },
        ]}
      />

      <section style={styles.coverShell} aria-label="Genealogy of cubism and abstract art">
        <div style={styles.coverHeader}>
          <div style={styles.coverKicker}>Automatic chronological network</div>
          <div style={styles.activeReadout} aria-live="polite">
            {activeNode ? (
              <>
                <strong data-testid="active-art-node">{activeNode.id}</strong>
                <span>
                  {activeNode.qualifier || ""}
                  {activeNode.year}
                  {activeNode.place ? ` · ${activeNode.place}` : ""}
                  {` · ${connectedCount} direct ${connectedCount === 1 ? "connection" : "connections"}`}
                </span>
              </>
            ) : (
              <>
                <strong data-testid="active-art-node">Trace an influence</strong>
                <span>Hover a label to isolate its incoming and outgoing paths.</span>
              </>
            )}
          </div>
        </div>

        <div ref={hostRef} style={styles.chartScroller}>
          <div style={{ width: chartWidth, minWidth: chartWidth }}>
            <NetworkCustomChart
              nodes={ART_MOVEMENT_NODES}
              edges={ART_MOVEMENT_EDGES}
              layout={chronologicalInfluenceLayout}
              chartId="art-genealogy"
              // Hover rides the shared selection store; the overlay re-renders
              // through the selection context while the force-settled geometry
              // and hit-test quadtree stay untouched (no relayout per hover).
              selection={{ name: "art-genealogy-hover" }}
              linkedHover={{ name: "art-genealogy-hover", fields: ["id"] }}
              width={chartWidth}
              height={CHART_HEIGHT}
              margin={{ top: 26, right: 62, bottom: 18, left: 62 }}
              enableHover
              onObservation={handleObservation}
              description="A chronological influence network of artists, movements, and ideas associated with Cubism and abstract art from 1886 to 1935."
              summary="Red boxes denote external or technological influences; black arcs denote artists and movements. Horizontal positions are computed from graph attraction and label collision constraints."
              accessibleTable
              frameProps={{ background: "transparent" }}
            />
            <div style={styles.titleBand}>CUBISM AND ABSTRACT ART</div>
          </div>
        </div>
      </section>

      <section style={styles.editorial}>
        <h2>Constraint, not tracing</h2>
        <p>
          The year attached to each entity fixes only its vertical coordinate. Horizontal
          coordinates begin from a deterministic spread, then settle through repeated edge
          attraction, boundary pressure, and rectangular collision resolution. The same layout can
          accept another node or influence without adding a bespoke coordinate.
        </p>

        <h2>Borrowing the cover&apos;s visual grammar</h2>
        <p>
          Movement nodes receive the cover&apos;s curved underline treatment. External sources and
          the machine aesthetic are boxed in red. Solid and dashed arrows retain the source
          graph&apos;s distinction, while the paired red year axes and paper-like ground make
          chronology part of the composition rather than separate chart furniture.
        </p>

        <CodeBlock language="jsx" showCopyButton code={implementationCode} />

        <p style={styles.sourceNote}>
          Data adapted from Elijah Meeks&apos;{" "}
          <a
            href="https://blocks.roadtolarissa.com/emeeks/34cdccd1aebd04d09b35"
            target="_blank"
            rel="noopener noreferrer"
          >
            Edge Routing Issue
          </a>{" "}
          block. Visual direction follows the supplied cover of <cite>Cubism and Abstract Art</cite>
          ; dates are encoded as data and positions are generated at render time.
        </p>
      </section>
    </ExamplePageLayout>
  )
}

function chronologicalInfluenceLayout(ctx) {
  const { plot } = ctx.dimensions
  // Precompute each movement's wrapped label + box size, then settle x with
  // axisFixedForcePositions: the year pins y, while edge attraction, an anchor
  // spring, and rectangular (label-box) collision relax x. The bespoke
  // cover-styled boxes are still drawn by hand in `overlays`.
  const geomById = new Map(
    ctx.nodes.map((frameNode) => {
      const data = frameNode.data ?? frameNode
      return [data.id, nodeGeometry(data)]
    }),
  )
  const positioned = axisFixedForcePositions(ctx.nodes, ctx.edges, plot, {
    fixedAccessor: "year",
    fixedDomain: ART_YEAR_DOMAIN,
    fixedAxis: "y",
    fixedPadding: 16,
    edgePadding: 42,
    spread: 2,
    size: (data) => geomById.get(data.id),
  }).positioned.map((p) => ({ ...p.data, ...p, lines: geomById.get(p.id).lines }))

  // networkHitTarget: the transparent, keyboard-navigable, annotation-anchorable
  // hit node per movement (the visible box is the cover-styled overlay).
  const sceneNodes = positioned.map((node) =>
    networkHitTarget({
      x: node.x - node.width / 2,
      y: node.y - node.height / 2,
      width: node.width,
      height: node.height,
      datum: node,
      id: node.id,
    }),
  )

  return {
    sceneNodes,
    sceneEdges: [],
    // All visible marks live in the overlay; the scene nodes are invisible hit
    // targets. The no-op restyle opts the chart into the style-only selection
    // path, so a hover change swaps the overlay's selection context without
    // re-running the force settle or rebuilding the quadtree.
    restyle: () => undefined,
    overlays: (
      <GenealogyOverlay
        positioned={positioned}
        edges={ctx.edges}
        plotWidth={ctx.dimensions.plot.width}
        plotHeight={ctx.dimensions.plot.height}
      />
    ),
  }
}

function GenealogyOverlay({ positioned, edges, plotWidth, plotHeight }) {
  // Reads the shared hover selection from context — this component re-renders
  // on hover while the canvas scene (and the settled layout) stay put. The
  // selection carries only the hovered id; the ego set expands here.
  const selection = useCustomLayoutSelection()
  const focusedId = selection.isActive
    ? (positioned.find((node) => selection.predicate(node))?.id ?? null)
    : null
  const nodeById = new Map(positioned.map((node) => [node.id, node]))
  const connected = new Set()
  if (focusedId) {
    connected.add(focusedId)
    edges.forEach((edge) => {
      const e = unwrapDatum(edge)
      if (e.source === focusedId) connected.add(e.target)
      if (e.target === focusedId) connected.add(e.source)
    })
  }

  return (
    <g pointerEvents="none">
      <defs>
        <marker
          id="art-arrow-black"
          viewBox="0 -4 8 8"
          refX="7"
          refY="0"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M0,-4L8,0L0,4L1.5,0Z" fill={INK} />
        </marker>
        <marker
          id="art-arrow-red"
          viewBox="0 -4 8 8"
          refX="7"
          refY="0"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M0,-4L8,0L0,4L1.5,0Z" fill={RED} />
        </marker>
      </defs>

      <YearAxis x={8} align="start" height={plotHeight} />
      <YearAxis x={plotWidth - 8} align="end" height={plotHeight} />

      {edges.map((edge, index) => {
        // ctx.edges are RealtimeEdge wrappers — the raw {id, source, target, type}
        // live under .data, so unwrap before reading them (a bare edge.id is
        // undefined, which silently breaks both the React key and the dashed style).
        const e = unwrapDatum(edge)
        const source = nodeById.get(e.source)
        const target = nodeById.get(e.target)
        if (!source || !target) return null
        const sourceIsRed = source.type === "red"
        const isActive = !focusedId || e.source === focusedId || e.target === focusedId
        // boxEdgeAnchors resolves the box exit/entry points by direction;
        // curvedEdgePath draws the S-curve (with a side-bow for near-level
        // pairs); fanOutBend keeps parallel arcs from overlapping.
        const { from, to } = boxEdgeAnchors(
          { cx: source.x, cy: source.y, width: source.width, height: source.height },
          { cx: target.x, cy: target.y, width: target.width, height: target.height },
          { orientation: "vertical" },
        )
        const influencePath = curvedEdgePath(from, to, {
          orientation: "vertical",
          bend: fanOutBend(index, { modulo: 5, spread: 5 }),
        })
        return (
          <path
            key={e.id}
            d={influencePath}
            fill="none"
            stroke={sourceIsRed ? RED : INK}
            strokeWidth={sourceIsRed ? 1.8 : 1.45}
            strokeDasharray={e.type === "dashed" ? "5 4" : undefined}
            markerEnd={`url(#art-arrow-${sourceIsRed ? "red" : "black"})`}
            opacity={isActive ? 0.8 : 0.1}
          />
        )
      })}

      {positioned.map((node) => {
        const isActive = !focusedId || connected.has(node.id)
        return (
          <ArtMovementNode
            key={node.id}
            node={node}
            opacity={isActive ? 1 : 0.18}
            focused={focusedId === node.id}
          />
        )
      })}
    </g>
  )
}

function ArtMovementNode({ node, opacity, focused }) {
  const color = node.type === "red" ? RED : INK
  const lineHeight = 13
  const labelTop = node.y - ((node.lines.length - 1) * lineHeight) / 2 - 4
  const decorationTop = node.y - node.height / 2
  const decorationBottom = node.y + node.height / 2 - 2
  return (
    <g opacity={opacity}>
      {node.decoration === "box" ? (
        <rect
          x={node.x - node.width / 2}
          y={decorationTop}
          width={node.width}
          height={node.height}
          fill={focused ? "rgba(165,41,40,0.09)" : PAPER}
          stroke={color}
          strokeWidth={focused ? 2.3 : 1.4}
        />
      ) : (
        <path
          d={`M${node.x - node.width / 2},${node.y - 4}
              C${node.x - node.width * 0.42},${decorationBottom}
               ${node.x + node.width * 0.42},${decorationBottom}
               ${node.x + node.width / 2},${node.y - 4}`}
          fill={focused ? "rgba(37,33,29,0.06)" : "none"}
          stroke={color}
          strokeWidth={focused ? 2.2 : 1.35}
        />
      )}

      <text
        x={node.x}
        y={labelTop}
        textAnchor="middle"
        fill={color}
        fontFamily="'Arial Narrow', 'Helvetica Neue', sans-serif"
        fontSize="11"
        fontWeight={node.id === node.id.toUpperCase() ? "600" : "500"}
        letterSpacing={node.id === node.id.toUpperCase() ? "0.035em" : 0}
      >
        {node.lines.map((line, index) => (
          <tspan key={line} x={node.x} dy={index === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
      <text
        x={node.x}
        y={node.y + node.height / 2 + 11}
        textAnchor="middle"
        fill={color}
        fontFamily="Georgia, serif"
        fontSize="7.5"
        opacity="0.78"
      >
        {[node.qualifier ? `${node.qualifier}${node.year}` : node.year, node.place]
          .filter(Boolean)
          .join(" · ")}
      </text>
    </g>
  )
}

function YearAxis({ x, align, height }) {
  const ticks = [1890, 1895, 1900, 1905, 1910, 1915, 1920, 1925, 1930, 1935]
  const y = yearScale(height)
  return (
    <g>
      {ticks.map((year) => (
        <text
          key={year}
          x={x}
          y={y(year)}
          textAnchor={align}
          dominantBaseline="middle"
          fill={RED}
          fontFamily="Georgia, serif"
          fontSize="10"
          fontWeight="700"
          letterSpacing="0.08em"
          opacity="0.88"
        >
          {year}
        </text>
      ))}
    </g>
  )
}

// Each movement's wrapped label + box size — the label-box geometry the layout
// feeds to rect-aware collision, and that the cover-styled overlay renders.
// (The force settle + edge routing that used to live here are now the
// axisFixedForcePositions + edge-router helpers from semiotic/recipes.)
function nodeGeometry(node) {
  const lines = wrapMovementLabel(node.id)
  const maxChars = Math.max(...lines.map((line) => line.length))
  return {
    lines,
    width: Math.max(58, Math.min(154, maxChars * 6.5 + 20)),
    height: Math.max(34, lines.length * 13 + 19),
  }
}

function yearScale(height) {
  const top = 16
  // Symmetric inset to match axisFixedForcePositions' fixedPadding, so the node
  // y-positions line up exactly with these axis labels.
  const bottom = height - 16
  return (year) =>
    top + ((year - ART_YEAR_DOMAIN[0]) / (ART_YEAR_DOMAIN[1] - ART_YEAR_DOMAIN[0])) * (bottom - top)
}

function wrapMovementLabel(label) {
  if (label.length <= 17) return [label]
  const words = label.split(" ")
  const lines = []
  let line = ""
  words.forEach((word) => {
    if (`${line} ${word}`.trim().length > 19 && line) {
      lines.push(line)
      line = word
    } else {
      line = `${line} ${word}`.trim()
    }
  })
  if (line) lines.push(line)
  return lines.slice(0, 3)
}

const styles = {
  lede: {
    maxWidth: "820px",
    margin: "0 0 30px",
    color: "var(--text-secondary)",
    fontSize: "19px",
    lineHeight: 1.6,
  },
  coverShell: {
    width: "100%",
    maxWidth: "930px",
    margin: "0 auto",
    overflow: "hidden",
    border: "1px solid #827b69",
    borderRadius: "3px",
    backgroundColor: PAPER,
    backgroundImage:
      "radial-gradient(circle at 15% 18%, rgba(80,68,48,.08), transparent 28%), radial-gradient(circle at 82% 72%, rgba(90,65,45,.07), transparent 32%), repeating-linear-gradient(2deg, rgba(255,255,255,.035) 0 1px, rgba(70,55,35,.018) 1px 3px)",
    boxShadow: "0 18px 45px rgba(0,0,0,.22)",
  },
  coverHeader: {
    minHeight: "76px",
    padding: "15px 20px",
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    borderBottom: "1px solid rgba(37,33,29,.25)",
    color: INK,
  },
  coverKicker: {
    color: RED,
    fontFamily: "Georgia, serif",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  activeReadout: {
    minWidth: 0,
    display: "grid",
    justifyItems: "end",
    color: INK,
    fontSize: "11px",
    textAlign: "right",
  },
  chartScroller: {
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
  },
  titleBand: {
    marginTop: "-2px",
    padding: "18px 22px 21px",
    background: RED,
    color: "#eee9d8",
    fontFamily: "'Arial Narrow', 'Helvetica Neue', sans-serif",
    fontSize: "clamp(28px, 5vw, 58px)",
    fontWeight: 300,
    letterSpacing: "0.035em",
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
  editorial: {
    maxWidth: "790px",
    margin: "54px auto 0",
    color: "var(--text-primary)",
    fontSize: "16px",
    lineHeight: 1.7,
  },
  sourceNote: {
    marginTop: "28px",
    color: "var(--text-secondary)",
    fontSize: "13px",
  },
}
