import React, { useCallback, useMemo, useState } from "react"
import { NetworkCustomChart } from "semiotic/network"
import { PerspectiveToggle } from "semiotic/network/perspective"
import { ThemeProvider } from "semiotic/themes/react"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import CodeBlock from "../../components/CodeBlock"
import ExamplePageLayout from "./ExamplePageLayout"
import { HOSTS, LINKS, PALETTE } from "./data/isometricInfrastructureData"
import {
  cellSize,
  infrastructureLayout,
  infrastructurePerspective
} from "./data/isometricInfrastructureScene"

const HEIGHT = 560
const HOST_BY_ID = new Map(HOSTS.map((host) => [host.id, host]))

// Custom-chart tooltips receive the authored host or link object.
function tooltip(hover) {
  const datum = hover?.id != null || hover?.source != null ? hover : hover?.data ?? {}
  if (datum.source != null) {
    const link = datum
    const from = HOST_BY_ID.get(link.source?.id ?? link.source)
    const to = HOST_BY_ID.get(link.target?.id ?? link.target)
    return (
      <div>
        <strong>{link.protocol}</strong>
        <div>{from?.label} → {to?.label}</div>
        {link.status === "alert" && <div style={{ color: PALETTE.linkAlert }}>Failing health check</div>}
      </div>
    )
  }
  const host = HOST_BY_ID.get(datum.id)
  if (!host) return null
  return (
    <div>
      <strong>{host.label}</strong>
      <div>{host.role}</div>
      {host.kind !== "cloud" && <div>CPU {host.cpu}%</div>}
      {host.status === "alert" && <div style={{ color: PALETTE.linkAlert }}>Needs attention</div>}
    </div>
  )
}

// Alert badges are widget annotations anchored to host ids, so they follow the
// projected pictograms through every view, transition and resize.
const ALERTS = HOSTS.filter((host) => host.status === "alert").map((host) => ({
  type: "widget",
  nodeId: host.id,
  dx: 58,
  dy: -34,
  width: 104,
  height: 22,
  content: (
    <span
      style={{
        background: PALETTE.linkAlert,
        color: "#1a0610",
        borderRadius: 11,
        padding: "2px 8px",
        font: "600 11px/18px var(--semiotic-font-family, sans-serif)",
        whiteSpace: "nowrap"
      }}
    >
      {host.cpu > 70 ? `⚠ CPU ${host.cpu}%` : "⚠ Health check"}
    </span>
  )
}))

const VIEWS = ["flat", "isometric", "pixel", "military"]

export default function IsometricInfrastructureExamplePage() {
  const [width, containerRef] = useResponsiveWidth(320, 1100, { bucket: 20 })
  const chartWidth = width
  const [view, setView] = useState("isometric")
  const [lift, setLift] = useState("none")
  const [route, setRoute] = useState("orthogonal-rounded")
  const [hovered, setHovered] = useState(null)
  const cell = cellSize(chartWidth - 20, HEIGHT - 20)

  const perspective = useMemo(
    () => infrastructurePerspective({ view, cell, route, lift, transition: true }),
    [view, cell, route, lift]
  )
  const layoutConfig = useMemo(() => ({ hovered }), [hovered])
  const onObservation = useCallback((observation) => {
    if (observation.type === "hover") {
      const id = observation.datum?.data?.id ?? observation.datum?.id
      setHovered(HOST_BY_ID.has(id) ? id : null)
    } else if (observation.type === "hover-end") {
      setHovered(null)
    }
  }, [])

  return (
    <ExamplePageLayout title="Isometric Infrastructure">
      <div ref={containerRef} style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p>
          Architecture diagrams are drawn in isometric perspective for a reason: zones read as
          surfaces, hosts stand on them, and routes run along the floor. This page is an ordinary
          network chart — a layout that places hosts on grid cells and draws straight links — with
          one prop, <code>perspective</code>, doing everything else. Hover a host to trace its
          links; switch the view to see the same layout flat.
        </p>

        <div
          role="group"
          aria-label="Diagram controls"
          style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", margin: "16px 0" }}
        >
          <PerspectiveToggle value={view} onChange={setView} options={VIEWS} label="View" />
          <label>
            Lift hosts by{" "}
            <select value={lift} onChange={(event) => setLift(event.target.value)}>
              <option value="none">nothing</option>
              <option value="cpu">CPU load</option>
            </select>
          </label>
          <label>
            Routes{" "}
            <select value={route} onChange={(event) => setRoute(event.target.value)}>
              <option value="orthogonal-rounded">orthogonal, rounded</option>
              <option value="orthogonal">orthogonal</option>
              <option value="layout">straight</option>
            </select>
          </label>
        </div>

        <div style={{ background: PALETTE.background, borderRadius: 12, padding: 10 }}>
          <ThemeProvider theme="dark">
            <NetworkCustomChart
              nodes={HOSTS}
              edges={LINKS}
              layout={infrastructureLayout}
              layoutConfig={layoutConfig}
              perspective={perspective}
              width={chartWidth - 20}
              height={HEIGHT - 20}
              margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              frameProps={{ background: PALETTE.background }}
              tooltip={tooltip}
              onObservation={onObservation}
              annotations={ALERTS}
              title="Production footprint"
              description="Isometric architecture diagram: an internet-facing zone and a raised private subnet, with hosts, storage and the links between them."
              summary="Two hosts need attention: web-prd-1 runs at 81% CPU and demo-bastion fails its health check. The S3 sync link from the internet to Web Storage is failing."
              accessibleTable
            />
          </ThemeProvider>
        </div>

        <h2>One prop</h2>
        <p>
          The layout above never changes when you switch views: it returns flat ground positions.
          The chart projects them after layout, keeps the pictograms upright and depth-sorted,
          lays the zone plates and routes on the ground, and seats each zone's hosts on its plate.
          Tooltips, keyboard focus, the alert callouts and the accessible table all follow the
          projected marks.
        </p>
        <CodeBlock
          language="jsx"
          code={`import { NetworkCustomChart } from "semiotic/network"
import { isometricGlyphs } from "semiotic/network/perspective"

<NetworkCustomChart
  nodes={hosts}
  edges={links}
  layout={gridLayout}            // flat ground positions + glyph nodes
  perspective={{
    type: "isometric",
    ground: { grid: { step: 40 } },
    regions: [
      { id: "dmz", label: "INTERNET FACING", nodes: ["web-prd-1", "web-storage", "bastion"], depth: 10 },
      { id: "private", label: "PRIVATE SUBNET", nodes: ["web-prd-2", "web-storage-2"], elevation: 34, depth: 8 }
    ],
    edges: { route: "orthogonal-rounded" },
    labels: { mode: "ground" },
    elevation: "cpu",            // optional: lift hosts by a data field
    transition: { duration: 700 }
  }}
/>`}
        />
        <p>
          Elevation is the only thing perspective adds to the encoding. Here it can lift hosts by
          CPU load, drawn with drop lines to their ground point so the position stays readable.
          Everything else is presentation: a flat chart and an isometric one say the same thing.
          That is also the honest limit of the technique — use it where position is topological or
          categorical, as in this diagram, not where distance encodes a measured quantity.
        </p>
      </div>
    </ExamplePageLayout>
  )
}
