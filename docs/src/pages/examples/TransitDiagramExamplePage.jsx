import React, { useMemo, useState } from "react"
import { NetworkCustomChart } from "semiotic/network"
import { transitDiagramLayout, unwrapDatum } from "semiotic/recipes"
import CodeBlock from "../../components/CodeBlock"
import { StatStrip } from "../../components/StatStrip"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  AUTHORED_CONNECTIONS,
  AUTHORED_STATIONS,
  TRANSIT_LINE_LEGEND,
  WATERSHED_CONNECTIONS,
  WATERSHED_LINE_LEGEND,
  WATERSHED_STATIONS,
} from "./data/transitDiagramExamples"
import "./TransitDiagramExamplePage.css"

const CHART_HEIGHT = 470
const MIN_CHART_WIDTH = 700

const implementationCode = `import { NetworkCustomChart } from "semiotic/network"
import { transitDiagramLayout } from "semiotic/recipes"

// Complete x/y positions are fitted to the available plot.
// Optional edge points and lineOrder values provide art direction.
<NetworkCustomChart
  nodes={stations}
  edges={connections}
  layout={transitDiagramLayout}
  layoutConfig={{
    lineAccessor: "line",
    cornerRadius: 10,
    lineOrder: ["ember", "blue", "green"]
  }}
  accessibleTable
/>
`

const combinedCode = `// These nodes have ids and labels, but no x/y coordinates.
const watershedNodes = [
  { id: "Snowfield", label: "Snowfield headwater" },
  { id: "North Fork", label: "North Fork" },
  { id: "Delta", label: "Delta / ocean" }
]

<NetworkCustomChart
  nodes={watershedNodes}
  edges={watershedEdges}
  layout={transitDiagramLayout}
  layoutConfig={{
    rootId: "Delta",
    direction: "right-to-left"
  }}
  accessibleTable
/>
// Missing positions trigger a deterministic topology layout,
// crossing-reduction sweeps, and octilinear connection routing.
`

export default function TransitDiagramExamplePage() {
  const [layoutMode, setLayoutMode] = useState("authored")
  const [cornerRadius, setCornerRadius] = useState(10)
  const [showLabels, setShowLabels] = useState(true)
  const [active, setActive] = useState(null)
  const [authoredWidth, authoredHostRef] = useResponsiveWidth(MIN_CHART_WIDTH)
  const [watershedWidth, watershedHostRef] = useResponsiveWidth(MIN_CHART_WIDTH)

  const authoredConfig = useMemo(
    () => ({
      layoutMode,
      cornerRadius,
      showLabels,
      lineOrder: ["ember", "blue", "green"],
      padding: 52,
    }),
    [cornerRadius, layoutMode, showLabels],
  )
  const watershedConfig = useMemo(
    () => ({
      cornerRadius,
      showLabels,
      rootId: "Delta",
      direction: "right-to-left",
      padding: 52,
      lineWidth: 5,
      lineGap: 1.5,
    }),
    [cornerRadius, showLabels],
  )

  const handleObservation = (observation) => {
    if (observation.type === "hover" && observation.datum) {
      setActive(unwrapDatum(observation.datum))
    } else if (observation.type === "hover-end") {
      setActive(null)
    }
  }

  return (
    <ExamplePageLayout title="Lines of Thought">
      <div className="transit-story">
        <p className="transit-story__lede">
          A subway diagram makes a bargain: sacrifice literal distance so connections become easy
          to follow. That bargain works for trains, but also for any network whose paths, junctions,
          and shared passages matter more than its native coordinates.
        </p>

        <StatStrip
          items={[
            { value: "8", label: "permitted segment directions" },
            { value: "2", label: "layout entry points" },
            { value: "0", label: "coordinates in the watershed" },
          ]}
        />

        <section className="transit-story__history" aria-labelledby="transit-history-title">
          <span className="transit-story__kicker">A short history of useful distortion</span>
          <h2 id="transit-history-title">The diagram escaped the city</h2>
          <div className="transit-story__history-grid">
            <HistoryEra year="1909 → 1933" color="#2775a8">
              Linear carriage diagrams had already regularized stops. Harry Beck&apos;s London
              Underground design made the larger conceptual leap: preserve the system and simplify
              its geometry into horizontal, vertical, and 45-degree paths.
            </HistoryEra>
            <HistoryEra year="1958 → 1979" color="#d94a3a">
              New York repeatedly negotiated the same tension. Its Beckian and Vignelli-era maps
              privileged service structure; the 1979 map restored more geography. Neither answer is
              universal—the task decides which distortion is honest.
            </HistoryEra>
            <HistoryEra year="2000s → now" color="#27845e">
              Researchers and designers carried the grammar into course maps, news summaries, set
              systems, waterways, and other abstract information spaces. “Station” became a node;
              “line” became a continuing idea, source, category, or path.
            </HistoryEra>
          </div>
          <p>
            Read the design history in the New York Transit Museum&apos;s{" "}
            <a href="https://www.nytransitmuseum.org/vignelli/" target="_blank" rel="noreferrer">
              Vignelli at 50 exhibit
            </a>
            ; see the formal design rules in the{" "}
            <a
              href="https://link.springer.com/article/10.1007/s00450-007-0036-y"
              target="_blank"
              rel="noreferrer"
            >
              survey of automated metro-map layouts
            </a>
            , and the metaphor&apos;s expansion in{" "}
            <a href="https://arxiv.org/abs/2008.09367" target="_blank" rel="noreferrer">
              MetroSets
            </a>
            .
          </p>
        </section>

        <section className="transit-story__plate" aria-labelledby="authored-title">
          <div className="transit-story__plate-header">
            <div>
              <span className="transit-story__kicker">Approach one · art-directed</span>
              <h2 id="authored-title">The diagram you can defend station by station</h2>
            </div>
            <div className="transit-story__mode-buttons" role="group" aria-label="Layout geometry">
              <ModeButton active={layoutMode === "authored"} onClick={() => setLayoutMode("authored")}>
                Honor coordinates
              </ModeButton>
              <ModeButton active={layoutMode === "automatic"} onClick={() => setLayoutMode("automatic")}>
                Ignore coordinates
              </ModeButton>
            </div>
          </div>

          <p>
            This fictional system has normalized station positions. Semiotic fits them to the plot,
            keeps the shared trunks parallel, and uses the supplied line order. Toggle the fallback
            to see the same data treated as an undecorated graph.
          </p>

          <DiagramControls
            cornerRadius={cornerRadius}
            setCornerRadius={setCornerRadius}
            showLabels={showLabels}
            setShowLabels={setShowLabels}
          />

          <div ref={authoredHostRef} className="transit-story__chart-host">
            <NetworkCustomChart
              chartId="authored-transit-diagram"
              nodes={AUTHORED_STATIONS}
              edges={AUTHORED_CONNECTIONS}
              layout={transitDiagramLayout}
              layoutConfig={authoredConfig}
              width={authoredWidth}
              height={CHART_HEIGHT}
              margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
              enableHover
              onObservation={handleObservation}
              description="A fictional three-line transit diagram with authored station positions, two shared trunks, and automatic station labels."
              summary="The Ember, Blue, and Garden lines share track through Union, Market, and Foundry. Toggle the geometry control to compare authored and automatic topology layouts."
              accessibleTable
              frameProps={{ background: "transparent" }}
            />
          </div>
          <LineLegend items={TRANSIT_LINE_LEGEND} />
          <p aria-live="polite">
            <strong>Trace:</strong>{" "}
            {active?.lineId
              ? `${active.lineLabel}: ${active.source} → ${active.target}`
              : active?.label ?? active?.id ?? "Hover a station or line segment."}
          </p>
          <CodeBlock language="jsx" showCopyButton code={implementationCode} />
        </section>

        <section className="transit-story__plate" aria-labelledby="watershed-title">
          <div className="transit-story__plate-header">
            <div>
              <span className="transit-story__kicker">Approach two · topology first</span>
              <h2 id="watershed-title">A watershed arrives with no station positions</h2>
            </div>
            <strong>automatic · deterministic · octilinear</strong>
          </div>

          <div className="transit-story__comparison">
            <div>
              <p>
                Headwaters behave like origins, confluences like interchanges, and the reservoir
                like a shared trunk. Each colored line follows water from one source after streams
                merge. The metaphor reveals provenance and convergence; it intentionally does not
                claim geographic distance, direction, or stream volume.
              </p>
              <div ref={watershedHostRef} className="transit-story__chart-host">
                <NetworkCustomChart
                  chartId="automatic-watershed-diagram"
                  nodes={WATERSHED_STATIONS}
                  edges={WATERSHED_CONNECTIONS}
                  layout={transitDiagramLayout}
                  layoutConfig={watershedConfig}
                  width={watershedWidth}
                  height={CHART_HEIGHT}
                  margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  enableHover
                  onObservation={handleObservation}
                  description="A schematic watershed drawn from nodes and edges without coordinates. Four source-water lines merge into a reservoir and delta."
                  summary="Semiotic places the outlet at the right, layers upstream junctions by graph distance, reduces crossings, and routes connections with horizontal, vertical, and diagonal segments."
                  accessibleTable
                  frameProps={{ background: "transparent" }}
                />
              </div>
              <LineLegend items={WATERSHED_LINE_LEGEND} />
            </div>
            <div>
              <div className="transit-story__plain-data" aria-label="Plain watershed data shape">
                <strong>nodes</strong>
                <br />
                id · label · kind
                <br />
                <br />
                <strong>edges</strong>
                <br />
                source · target · lines
                <br />
                <br />
                no x<br />
                no y<br />
                no rank<br />
                no waypoints
              </div>
              <p>
                The only layout hint is <code>rootId: &quot;Delta&quot;</code>, supplied as chart
                configuration rather than written into every row. Remove it and the layout selects
                a deterministic peripheral endpoint itself.
              </p>
            </div>
          </div>
          <CodeBlock language="jsx" showCopyButton code={combinedCode} />
        </section>

        <section className="transit-story__decision" aria-labelledby="transit-options-title">
          <span className="transit-story__kicker">The contract</span>
          <h2 id="transit-options-title">Experiment freely; art-direct deliberately</h2>
          <p>
            Automatic layout is an invitation, not a certification. It gives an unfamiliar graph a
            stable first diagram so you can decide whether the metaphor has explanatory power. If it
            does, add coordinates, waypoints, and line ordering where editorial judgment matters.
          </p>
          <div className="transit-story__options">
            <Option title="Geometry">
              <code>layoutMode</code> detects complete x/y automatically. Use <code>automatic</code>{" "}
              to ignore them, or <code>authored</code> to request them and fall back safely when they
              are incomplete.
            </Option>
            <Option title="Network meaning">
              <code>lineAccessor</code> accepts one line or several line descriptors per edge.
              <code> lineOrder</code> stabilizes parallel trunks; <code>rootId</code> and{" "}
              <code>direction</code> orient fallback layouts.
            </Option>
            <Option title="Drawing">
              Tune <code>lineWidth</code>, <code>lineGap</code>, <code>cornerRadius</code>, station
              radii, labels, padding, colors, and authored intermediate <code>points</code> without
              replacing the layout.
            </Option>
          </div>
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function HistoryEra({ year, color, children }) {
  return (
    <div className="transit-story__era" style={{ "--era-color": color }}>
      <span className="transit-story__era-year">{year}</span>
      <div>{children}</div>
    </div>
  )
}

function ModeButton({ active, onClick, children }) {
  return (
    <button
      className="transit-story__mode-button"
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function DiagramControls({ cornerRadius, setCornerRadius, showLabels, setShowLabels }) {
  return (
    <div className="transit-story__controls">
      <label>
        Corner radius {cornerRadius}px{" "}
        <input
          type="range"
          min="0"
          max="24"
          value={cornerRadius}
          onChange={(event) => setCornerRadius(Number(event.target.value))}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={showLabels}
          onChange={(event) => setShowLabels(event.target.checked)}
        />{" "}
        Station labels
      </label>
    </div>
  )
}

function LineLegend({ items }) {
  return (
    <div className="transit-story__legend" aria-label="Line legend">
      {items.map((item) => (
        <span className="transit-story__legend-item" key={item.id}>
          <span className="transit-story__swatch" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function Option({ title, children }) {
  return (
    <div className="transit-story__option">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  )
}
