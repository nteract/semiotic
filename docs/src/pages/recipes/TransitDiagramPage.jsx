import React, { useMemo, useState } from "react"
import { NetworkCustomChart } from "semiotic/network"
import { transitDiagramLayout } from "semiotic/recipes"
import RecipeLayout from "../../components/RecipeLayout"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"

const NODES = [
  {
    id: "orders",
    label: "Orders",
    kind: "source",
    glyph: "O",
    stationColor: "#9f2d3f",
    lineColor: "#d1495b",
    x: 0,
    y: 0,
  },
  {
    id: "customers",
    label: "Customers",
    kind: "source",
    glyph: "C",
    stationColor: "#176b87",
    lineColor: "#277da1",
    x: 0,
    y: 2,
  },
  {
    id: "rules",
    label: "Rules",
    kind: "source",
    glyph: "R",
    stationColor: "#527a3b",
    lineColor: "#43aa8b",
    x: 0,
    y: 4,
  },
  {
    id: "join",
    label: "Join",
    kind: "processor",
    glyph: "+",
    stationColor: "#6d4c91",
    x: 2,
    y: 1,
  },
  {
    id: "publish",
    label: "Publish",
    kind: "processor",
    glyph: "P",
    stationColor: "#6d4c91",
    transfer: true,
    x: 4,
    y: 2,
  },
  {
    id: "warehouse",
    label: "Warehouse",
    kind: "sink",
    glyph: "W",
    stationColor: "#315a75",
    x: 6,
    y: 2,
  },
]

const EDGES = [
  { source: "orders", target: "join" },
  { source: "customers", target: "join" },
  { source: "join", target: "publish" },
  { source: "rules", target: "publish" },
  { source: "publish", target: "warehouse" },
]

const LINES = [
  { id: "orders", label: "Orders", color: "#d1495b" },
  { id: "customers", label: "Customers", color: "#277da1" },
  { id: "rules", label: "Rules", color: "#43aa8b" },
]

function renderStation({ station, x, y, radius, interchange, mode }) {
  const glyphRadius = radius + 2
  return (
    <g transform={`translate(${x} ${y})`} data-transit-station={station.id}>
      <circle
        r={glyphRadius}
        fill={station.stationColor}
        stroke="var(--semiotic-bg, white)"
        strokeWidth={interchange ? 2.5 : 1.5}
      />
      <text
        y="0.5"
        fill="white"
        fontSize={mode === "primary" ? 9 : 7}
        fontWeight="900"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {station.glyph}
      </text>
    </g>
  )
}

const fullSourceCode = `import { NetworkCustomChart } from "semiotic/network"
import { transitDiagramLayout } from "semiotic/recipes"

const nodes = [
  { id: "orders", label: "Orders", lineColor: "#d1495b" },
  { id: "customers", label: "Customers", lineColor: "#277da1" },
  { id: "join", label: "Join" },
  { id: "warehouse", label: "Warehouse" }
]

const edges = [
  { source: "orders", target: "join" },
  { source: "customers", target: "join" },
  { source: "join", target: "warehouse" }
]

<NetworkCustomChart
  nodes={nodes}
  edges={edges}
  layout={transitDiagramLayout}
  layoutConfig={{
    mode: "primary", // "compact" | "minimap"
    lineMode: "source-rooted",
    sourceColorAccessor: "lineColor",
    renderStation: ({ station, x, y, radius }) => (
      <StationGlyph station={station} x={x} y={y} radius={radius} />
    )
  }}
  description="Three source-rooted lines merge into one shared trunk."
  accessibleTable
/>
`

function ToggleButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{ ...styles.button, ...(active ? styles.buttonActive : null) }}
    >
      {children}
    </button>
  )
}

export default function TransitDiagramPage() {
  const [mode, setMode] = useState("primary")
  const [layoutMode, setLayoutMode] = useState("authored")
  const [width, hostRef] = useResponsiveWidth(640, 860)
  const config = useMemo(
    () => ({
      mode,
      layoutMode,
      lineMode: "source-rooted",
      sourceColorAccessor: "lineColor",
      renderStation,
      lineOrder: ["orders", "customers", "rules"],
      padding: 48,
      cornerRadius: 9,
    }),
    [layoutMode, mode],
  )

  return (
    <RecipeLayout
      title="Transit Diagram"
      breadcrumbs={[
        { label: "Recipes", path: "/recipes" },
        { label: "Transit Diagram", path: "/recipes/transit-diagram" },
      ]}
      prevPage={{ title: "Adjacency Flow", path: "/recipes/adjacency-flow" }}
      dependencies={["semiotic/network", "semiotic/recipes", "react"]}
      fullSourceCode={fullSourceCode}
    >
      <p>
        <code>transitDiagramLayout</code> turns a network into a schematic map with octilinear
        tracks, parallel line bundles, interchange stations, and fitted labels. Supply complete
        coordinates for an authored diagram, or let the deterministic topology layout position a
        plain graph.
      </p>

      <h2 id="interactive-preview">Interactive preview</h2>
      <p>
        The data below is one directed graph. Change its geometry and level of detail without
        rewriting nodes or edges.
      </p>
      <div style={styles.controls}>
        <div>
          <strong style={styles.controlLabel}>Geometry</strong>
          <div style={styles.buttonGroup} role="group" aria-label="Transit geometry">
            <ToggleButton
              active={layoutMode === "authored"}
              onClick={() => setLayoutMode("authored")}
            >
              Authored coordinates
            </ToggleButton>
            <ToggleButton
              active={layoutMode === "automatic"}
              onClick={() => setLayoutMode("automatic")}
            >
              Automatic topology
            </ToggleButton>
          </div>
        </div>
        <div>
          <strong style={styles.controlLabel}>Detail</strong>
          <div style={styles.buttonGroup} role="group" aria-label="Transit detail">
            {[
              ["primary", "Primary"],
              ["compact", "Compact"],
              ["minimap", "Minimap"],
            ].map(([value, label]) => (
              <ToggleButton key={value} active={mode === value} onClick={() => setMode(value)}>
                {label}
              </ToggleButton>
            ))}
          </div>
        </div>
      </div>

      <div ref={hostRef} style={styles.chartHost}>
        <NetworkCustomChart
          chartId="transit-diagram-recipe-preview"
          nodes={NODES}
          edges={EDGES}
          layout={transitDiagramLayout}
          layoutConfig={config}
          width={width}
          height={430}
          margin={{ top: 12, right: 12, bottom: 12, left: 12 }}
          enableHover
          description={`A ${mode} transit diagram using ${layoutMode} geometry. Orders, customers, and rules are source-rooted lines that merge before the warehouse.`}
          summary="Three source-colored lines merge into a shared trunk. Primary and compact modes use typed station glyphs; minimap mode uses segmented line-membership circles."
          accessibleTable
          frameProps={{ background: "transparent" }}
        />
      </div>
      <div style={styles.legend} aria-label="Source-rooted line colors">
        {LINES.map((line) => (
          <span key={line.id} style={styles.legendItem}>
            <span style={{ ...styles.swatch, background: line.color }} />
            {line.label}
          </span>
        ))}
      </div>

      <h2 id="geometry">Authored and automatic geometry</h2>
      <p>
        When every node has finite x and y values, the recipe fits those coordinates into the plot.
        Set <code>layoutMode: "automatic"</code> to ignore them. Automatic layout uses stable
        node-id tie breaks for component order, layering, and crossing-reduction sweeps, so repeated
        server renders produce the same SVG bytes.
      </p>

      <h2 id="source-rooted-lines">Source-rooted lines</h2>
      <p>
        With <code>lineMode: "source-rooted"</code>, every in-degree-zero node defines a line. Its
        membership propagates forward through the DAG, so shared downstream edges become parallel
        bundles. <code>sourceColorAccessor</code> reads each line color from the source datum.
        Without this mode, use <code>lineAccessor</code> for explicit edge line ids or descriptors.
      </p>

      <h2 id="detail-modes">Detail modes</h2>
      <table className="recipe-customization-table">
        <thead>
          <tr>
            <th>Mode</th>
            <th>Rendering</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>primary</code>
            </td>
            <td>Full station and interchange radii, labels, and normal track weight.</td>
          </tr>
          <tr>
            <td>
              <code>compact</code>
            </td>
            <td>Smaller stations and thinner tracks with labels suppressed.</td>
          </tr>
          <tr>
            <td>
              <code>minimap</code>
            </td>
            <td>Minimal tracks and one segmented line-color circle per fitted stop.</td>
          </tr>
        </tbody>
      </table>

      <h2 id="station-glyphs">Custom station glyphs</h2>
      <p>
        <code>renderStation</code> replaces the primary and compact station circle in the SVG
        station layer. The callback receives the raw <code>station</code> datum, fitted{" "}
        <code>x</code>
        and <code>y</code>, resolved <code>radius</code>, ordered <code>lineIds</code>, interchange
        state, and active mode. Minimap markers stay recipe-owned so their segments always match
        derived line membership.
      </p>

      <h2 id="configuration">Core configuration</h2>
      <table className="recipe-customization-table">
        <thead>
          <tr>
            <th>Option</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>lineWidth</code>, <code>lineGap</code>
            </td>
            <td>Track and bundle spacing.</td>
          </tr>
          <tr>
            <td>
              <code>stationRadius</code>, <code>interchangeRadius</code>
            </td>
            <td>Marker sizing within the selected detail mode.</td>
          </tr>
          <tr>
            <td>
              <code>lineOrder</code>
            </td>
            <td>Stable preferred order for parallel tracks.</td>
          </tr>
          <tr>
            <td>
              <code>pointsAccessor</code>
            </td>
            <td>Authored intermediate x/y waypoints on an edge.</td>
          </tr>
          <tr>
            <td>
              <code>rootId</code>, <code>direction</code>
            </td>
            <td>Orient the automatic topology layout.</td>
          </tr>
          <tr>
            <td>
              <code>showLabels</code>, <code>labelAccessor</code>
            </td>
            <td>Primary-mode label visibility and text.</td>
          </tr>
        </tbody>
      </table>
    </RecipeLayout>
  )
}

const styles = {
  controls: {
    display: "flex",
    flexWrap: "wrap",
    gap: 20,
    justifyContent: "space-between",
    padding: 16,
    border: "1px solid var(--surface-3)",
    borderRadius: 10,
    background: "var(--surface-1)",
  },
  controlLabel: { display: "block", marginBottom: 8, fontSize: 13 },
  buttonGroup: { display: "flex", flexWrap: "wrap", gap: 6 },
  button: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--surface-3)",
    borderRadius: 6,
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    cursor: "pointer",
    padding: "7px 10px",
    fontWeight: 650,
  },
  buttonActive: { background: "var(--accent)", color: "white", borderColor: "var(--accent)" },
  chartHost: {
    marginTop: 12,
    overflowX: "auto",
    border: "1px solid var(--surface-3)",
    borderRadius: 10,
  },
  legend: { display: "flex", flexWrap: "wrap", gap: 14, margin: "12px 0 28px" },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
  },
  swatch: { display: "inline-block", width: 24, height: 5, borderRadius: 4 },
}
