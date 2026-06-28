import React, { useCallback, useMemo, useState } from "react"
import { ChartContainer, NetworkCustomChart } from "semiotic"
// Custom-network kit: the hit-target node (accessibility + annotation anchoring),
// the datum unwrapper, and the cubic-Bézier helpers that let us sample a point /
// tangent along each authority trunk to seat station and crew nodes on the curve.
import {
  networkHitTarget,
  unwrapDatum,
  cubicPoint,
  cubicTangent,
  cubicPath,
  normalizePoint,
} from "semiotic/recipes"
import CodeBlock from "../../components/CodeBlock"
import { StatStrip } from "../../components/StatStrip"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  ERIE_DIVISIONS,
  ERIE_EDGES,
  ERIE_EMPLOYEE_CLASSES,
  ERIE_INTERACTIVE_ROLE_COUNT,
  ERIE_NODES,
  ERIE_REPRESENTATIVE_TOTAL,
  ERIE_SERVICE_OFFICES,
} from "./data/erieOrganization"

const INK = "#28251f"
const INK_SOFT = "#665f52"
const PAPER = "#eee9dc"
const PAPER_DEEP = "#ded5c2"
const RUST = "#943f2f"
const GOLD = "#a77c38"
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Georgia, serif"
const MIN_CHART_WIDTH = 900
const CHART_HEIGHT = 1120

const CLASS_BY_ID = new Map(ERIE_EMPLOYEE_CLASSES.map((item) => [item.id, item]))

const implementationCode = `import { NetworkCustomChart } from "semiotic"
import { networkHitTarget } from "semiotic/recipes"

function railroadOrganizationLayout(ctx) {
  const { plot } = ctx.dimensions
  const root = { x: plot.width / 2, y: plot.height - 185 }
  const positions = new Map()

  divisions.forEach((division, i) => {
    // Five cubic trunks radiate from the general superintendent.
    const end = divisionEndpoint(i, plot)
    const trunk = cubicFrom(root, end)

    division.stations.forEach((station, j) => {
      const p = cubicPoint(trunk, 0.23 + j * 0.15)
      positions.set(station.id, p)

      // Workforce boughs grow normal to the trunk. Their leaf count and
      // color come from the crew datum, never from hand-authored x/y.
      station.crews.forEach((crew, k) => {
        positions.set(crew.id, growBough(p, cubicTangent(trunk, j), k))
      })
    })
  })

  return {
    sceneNodes: ctx.nodes.map((wrapped) => {
      const d = wrapped.data ?? wrapped
      const p = positions.get(d.id)
      return networkHitTarget({ x: p.x, y: p.y, r: hitRadius(d), datum: d, id: d.id })
    }),
    overlays: <RailroadPlate positions={positions} config={ctx.config} />
  }
}

<NetworkCustomChart
  nodes={nodes}
  edges={edges}
  layout={railroadOrganizationLayout}
  layoutConfig={{ view, activeId, employeeFilter }}
  annotations={editorialNotes}       // anchored to computed node positions
  enableHover
  onObservation={handleObservation}  // hover, click, keyboard focus
  accessibleTable
/>`

export default function ErieRailroadOrganizationExamplePage() {
  const [hovered, setHovered] = useState(null)
  const [locked, setLocked] = useState(null)
  const [view, setView] = useState("structure")
  const [employeeFilter, setEmployeeFilter] = useState(null)
  const [showNotes, setShowNotes] = useState(true)
  const [chartWidth, hostRef] = useResponsiveWidth(MIN_CHART_WIDTH)

  const active = hovered || locked

  const handleObservation = useCallback((observation) => {
    if (observation.type === "hover" && observation.datum) {
      setHovered(unwrapDatum(observation.datum))
    } else if (observation.type === "hover-end") {
      setHovered(null)
    }
  }, [])

  const handleClick = useCallback((datum) => {
    const raw = unwrapDatum(datum)
    setLocked((current) => (current?.id === raw?.id ? null : raw))
  }, [])

  const layoutConfig = useMemo(
    () => ({
      activeId: active?.id ?? null,
      employeeFilter,
      view,
    }),
    [active, employeeFilter, view],
  )

  const annotations = useMemo(() => (showNotes ? ERIE_NOTES : []), [showNotes])

  return (
    <ExamplePageLayout
      title="The New York & Erie Railroad"
      prevPage={{ title: "The Wheel of Urines", path: "/examples/urine-wheel" }}
      nextPage={{ title: "Wikipedia, as it happens", path: "/examples/wikipedia-realtime" }}
    >
      <style>{`
        @media (max-width: 720px) {
          .erie-toolbar { align-items: stretch !important; flex-direction: column !important; }
          .erie-readout { text-align: left !important; }
        }
      `}</style>

      <p style={styles.lede}>
        In 1855, Daniel McCallum and George Holt Henshaw turned a railroad into a tree. Authority
        rises from the directors at the roots, operating divisions fan out as tracks, and the
        workforce blooms around each station. This reconstruction keeps that visual argument but
        makes the organization computable: every branch is generated from role, station, division,
        and headcount data.
      </p>

      <StatStrip
        items={[
          { value: "5", label: "operating divisions" },
          { value: ERIE_INTERACTIVE_ROLE_COUNT, label: "navigable offices & crews" },
          { value: "0", label: "hand-authored x/y positions" },
        ]}
      />

      <ChartContainer
        title="Diagram Representing a Plan of Organization"
        subtitle="New York & Erie Railroad · an interactive reconstruction after McCallum and Henshaw, 1855"
        height={CHART_HEIGHT + 190}
        actions={{ export: true, fullscreen: true }}
        style={styles.chartContainer}
        controls={<ActiveReadout active={active} locked={locked} />}
      >
        <div style={styles.chartBody}>
          <div className="erie-toolbar" style={styles.toolbar}>
            <div style={styles.controlBlock}>
              <span style={styles.controlLabel}>Read the diagram as</span>
              <div style={styles.segmented} role="group" aria-label="Diagram view">
                <ToggleButton
                  active={view === "structure"}
                  onClick={() => {
                    setView("structure")
                    setEmployeeFilter(null)
                  }}
                >
                  Authority
                </ToggleButton>
                <ToggleButton active={view === "workforce"} onClick={() => setView("workforce")}>
                  Workforce
                </ToggleButton>
              </div>
            </div>

            <button
              type="button"
              style={{ ...styles.noteButton, ...(showNotes ? styles.noteButtonActive : {}) }}
              onClick={() => setShowNotes((current) => !current)}
              aria-pressed={showNotes}
            >
              Editorial notes
            </button>

            <div className="erie-readout" style={styles.toolbarNote}>
              Hover to trace · click to hold · click again to release
            </div>
          </div>

          <div ref={hostRef} style={styles.scroller}>
            <div style={{ width: chartWidth, minWidth: chartWidth }}>
              <NetworkCustomChart
                chartId="erie-organization"
                nodes={ERIE_NODES}
                edges={ERIE_EDGES}
                layout={railroadOrganizationLayout}
                layoutConfig={layoutConfig}
                annotations={annotations}
                width={chartWidth}
                height={CHART_HEIGHT}
                margin={{ top: 12, right: 12, bottom: 12, left: 12 }}
                enableHover
                onObservation={handleObservation}
                onClick={handleClick}
                description="An interactive reconstruction of the New York and Erie Railroad organization diagram of 1855. The board of directors and president form the roots at the bottom. Five operating divisions radiate upward as rail lines, with stations and aggregated employee crews growing from them as botanical branches."
                summary={`The chart contains five representative operating divisions, twenty-five stations, and ${ERIE_REPRESENTATIVE_TOTAL.toLocaleString()} representative employees grouped into station, train, track, and shop crews. Positions are generated from hierarchy and station order; the values are illustrative rather than a transcription of the original plate's statistical table.`}
                accessibleTable
                frameProps={{
                  background: "transparent",
                  tooltipContent: renderRailroadTooltip,
                }}
              />
            </div>
          </div>

          <WorkforceLegend
            active={employeeFilter}
            visible={view === "workforce"}
            onChange={setEmployeeFilter}
          />
        </div>
      </ChartContainer>

      <section style={styles.editorial}>
        <h2>Two diagrams occupy the same tree</h2>
        <p>
          Choose <strong>Authority</strong> and the page reads like McCallum&apos;s management
          system: power begins with the directors, concentrates in the president and general
          superintendent, then follows five operating lines to local stations. Choose{" "}
          <strong>Workforce</strong> and the same geometry becomes a distribution display. Leaf
          color identifies work and leaf quantity reflects the representative crew count. The
          chart does not swap components; <code>layoutConfig</code> cheaply re-runs one custom
          layout against the same graph.
        </p>

        <h2>Railroad geometry, botanical grammar</h2>
        <p>
          A generic tree layout would preserve the reporting hierarchy but erase the thing that
          makes the original memorable. Here each division receives a computed cubic trunk.
          Stations are sampled along it in route order; crew branches grow from the local tangent;
          and employee dots settle into deterministic phyllotactic clusters. Add a station or
          change a headcount and the branch re-grows without touching a coordinate.
        </p>

        <CodeBlock language="jsx" showCopyButton code={implementationCode} />

        <h2>Why this remains a Semiotic chart</h2>
        <p>
          The visible plate is art-directed SVG, but a transparent <code>networkHitTarget</code>{" "}
          sits behind every meaningful office and crew. Semiotic supplies pointer and keyboard
          observation, tooltips, focus geometry, click locking, the accessible data table,
          point-id annotation anchoring, and export. The custom layout owns the unusual geometry;
          the frame continues to own chart behavior.
        </p>

        <p style={styles.sourceNote}>
          Historical structure and wording are based on Daniel C. McCallum and G. H. Henshaw&apos;s{" "}
          <a
            href="https://www.loc.gov/item/2017586274/"
            target="_blank"
            rel="noreferrer"
          >
            1855 diagram in the Library of Congress
          </a>
          . The Library describes the straight branches as railroad trackage radiating from the
          general superintendent and the botanical branches as named functional offices. Station
          names follow the historical route; crew counts on this page are deterministic,
          representative values and are not a transcription of the plate&apos;s statistical table.
        </p>
      </section>
    </ExamplePageLayout>
  )
}

function railroadOrganizationLayout(ctx) {
  const { plot } = ctx.dimensions
  const rawNodes = ctx.nodes.map((node) => node.data ?? node)
  // NetworkCustomChart can ask for an initial empty scene before bounded
  // ingestion commits the supplied graph.
  if (rawNodes.length === 0) return { sceneNodes: [], sceneEdges: [], overlays: null }
  const byId = new Map(rawNodes.map((node) => [node.id, node]))
  const position = new Map()
  const centerX = plot.width / 2
  const board = { x: centerX, y: plot.height - 34 }
  const president = { x: centerX, y: plot.height - 104 }
  const superintendent = { x: centerX, y: plot.height - 202 }
  position.set("board-of-directors", board)
  position.set("president", president)
  position.set("general-superintendent", superintendent)

  ERIE_SERVICE_OFFICES.forEach((service) => {
    const reach = 116 + service.order * 83
    position.set(service.id, {
      x: centerX + service.side * reach,
      y: plot.height - 128 - service.order * 37,
    })
  })

  const trunks = []
  const stationBranches = []
  ERIE_DIVISIONS.forEach((division, divisionIndex) => {
    const targetX = 78 + divisionIndex * ((plot.width - 156) / (ERIE_DIVISIONS.length - 1))
    const targetY = 56 + Math.abs(divisionIndex - 2) * 44
    const deltaX = targetX - centerX
    const curve = {
      p0: superintendent,
      p1: {
        x: centerX + deltaX * 0.15,
        y: superintendent.y - 160,
      },
      p2: {
        x: targetX - deltaX * 0.08,
        y: targetY + 190,
      },
      p3: { x: targetX, y: targetY },
    }
    trunks.push({ division, curve })

    const divisionNode = byId.get(`${division.id}-division`)
    position.set(divisionNode.id, cubicPoint(curve, 0.11))

    division.stations.forEach((stationLabel, stationIndex) => {
      const station = byId.get(`${division.id}-station-${stationIndex}`)
      const t = 0.24 + stationIndex * 0.145
      const point = cubicPoint(curve, t)
      const tangent = normalizePoint(cubicTangent(curve, t))
      position.set(station.id, point)

      const crews = rawNodes.filter(
        (node) => node.kind === "crew" && node.division === division.id && node.stationIndex === stationIndex,
      )
      crews.forEach((crew) => {
        const pair = crew.crewIndex % 2
        const side = crew.crewIndex < 2 ? -1 : 1
        const normal = { x: -tangent.y * side, y: tangent.x * side }
        const reach = 54 + pair * 42 + ((divisionIndex + stationIndex) % 3) * 8
        const along = pair ? 9 : -8
        const crewPoint = {
          x: point.x + normal.x * reach + tangent.x * along,
          y: point.y + normal.y * reach + tangent.y * along,
        }
        position.set(crew.id, crewPoint)
        stationBranches.push({
          station,
          crew,
          from: point,
          to: crewPoint,
          normal,
          tangent,
          reach,
        })
      })
    })
  })

  const active = ctx.config.activeId ? byId.get(ctx.config.activeId) : null
  const activeDivision = active?.division ?? null
  const { employeeFilter, view } = ctx.config

  const isDimmed = (node) => {
    if (activeDivision && node.division && node.division !== activeDivision) return true
    if (
      view === "workforce" &&
      employeeFilter &&
      node.kind === "crew" &&
      node.employeeClass !== employeeFilter
    ) {
      return true
    }
    return false
  }

  const sceneNodes = rawNodes
    .map((node) => {
      const p = position.get(node.id)
      if (!p) return null
      const radius =
        node.kind === "authority" ? 27 : node.kind === "division" ? 18 : node.kind === "crew" ? 16 : 11
      return networkHitTarget({
        x: p.x,
        y: p.y,
        r: radius,
        datum: node,
        id: node.id,
        label: `${node.label}${node.count ? `, ${node.count} employees` : ""}`,
      })
    })
    .filter(Boolean)

  const overlays = (
    <g pointerEvents="none" fontFamily={SERIF}>
      <defs>
        <filter id="erie-soft-ink" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence baseFrequency="0.85" numOctaves="1" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.38" />
        </filter>
        <radialGradient id="erie-medallion" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fbf8ef" />
          <stop offset="100%" stopColor={PAPER_DEEP} />
        </radialGradient>
      </defs>

      <rect
        x={1}
        y={1}
        width={plot.width - 2}
        height={plot.height - 2}
        fill="none"
        stroke={INK}
        strokeWidth="1.3"
      />
      <rect
        x={7}
        y={7}
        width={plot.width - 14}
        height={plot.height - 14}
        fill="none"
        stroke={INK_SOFT}
        strokeWidth="0.45"
      />

      <text
        x={centerX}
        y={31}
        textAnchor="middle"
        fill={INK}
        fontSize="10"
        fontWeight="700"
        letterSpacing="0.22em"
      >
        OPERATING DIVISIONS · RETURNS OF SEPTEMBER 1855
      </text>

      <g filter="url(#erie-soft-ink)">
        {trunks.map(({ division, curve }) => {
          const divisionDimmed = Boolean(activeDivision && division.id !== activeDivision)
          return (
            <g key={division.id} opacity={divisionDimmed ? 0.12 : 1}>
              <path
                d={cubicPath(curve)}
                fill="none"
                stroke={view === "workforce" ? INK_SOFT : INK}
                strokeWidth={view === "workforce" ? 1.2 : 1.75}
              />
              {Array.from({ length: 24 }, (_, index) => {
                const t = 0.09 + index * 0.037
                const p = cubicPoint(curve, t)
                const tangent = normalizePoint(cubicTangent(curve, t))
                const normal = { x: -tangent.y, y: tangent.x }
                return (
                  <line
                    key={index}
                    x1={p.x - normal.x * 3.2}
                    y1={p.y - normal.y * 3.2}
                    x2={p.x + normal.x * 3.2}
                    y2={p.y + normal.y * 3.2}
                    stroke={INK_SOFT}
                    strokeWidth="0.65"
                    opacity={view === "workforce" ? 0.4 : 0.72}
                  />
                )
              })}
              <DivisionTitle
                division={division}
                point={curve.p3}
                active={active?.division === division.id}
              />
            </g>
          )
        })}

        {stationBranches.map((branch) => {
          const dimmed = isDimmed(branch.crew)
          const color =
            view === "workforce"
              ? CLASS_BY_ID.get(branch.crew.employeeClass)?.color ?? INK
              : INK
          const control = {
            x: branch.from.x + (branch.to.x - branch.from.x) * 0.62 + branch.tangent.x * 9,
            y: branch.from.y + (branch.to.y - branch.from.y) * 0.62 + branch.tangent.y * 9,
          }
          return (
            <g key={branch.crew.id} opacity={dimmed ? 0.09 : 0.78}>
              <path
                d={`M${branch.from.x},${branch.from.y} Q${control.x},${control.y} ${branch.to.x},${branch.to.y}`}
                fill="none"
                stroke={color}
                strokeWidth={view === "workforce" ? 1.05 : 0.86}
              />
              <CrewCluster
                crew={branch.crew}
                point={branch.to}
                direction={branch.normal}
                color={color}
                view={view}
                active={active?.id === branch.crew.id}
              />
            </g>
          )
        })}
      </g>

      {rawNodes
        .filter((node) => node.kind === "station")
        .map((station) => {
          const p = position.get(station.id)
          const dimmed = isDimmed(station)
          const focused = active?.id === station.id
          return (
            <g key={station.id} opacity={dimmed ? 0.12 : 1}>
              <circle
                cx={p.x}
                cy={p.y}
                r={focused ? 5.5 : 4}
                fill={focused ? RUST : PAPER}
                stroke={INK}
                strokeWidth={focused ? 1.6 : 1}
              />
              <text
                x={p.x + 7}
                y={p.y - 5}
                fill={INK}
                fontSize={focused ? 9.5 : 7.3}
                fontWeight={focused ? "700" : "500"}
                paintOrder="stroke"
                stroke={PAPER}
                strokeWidth="3"
                strokeLinejoin="round"
              >
                {station.label}
              </text>
            </g>
          )
        })}

      {rawNodes
        .filter((node) => node.kind === "division")
        .map((division) => {
          const p = position.get(division.id)
          const dimmed = isDimmed(division)
          return (
            <g key={division.id} opacity={dimmed ? 0.12 : 1}>
              <Medallion
                x={p.x}
                y={p.y}
                radius={13}
                label={String(division.order + 1)}
                active={active?.division === division.division}
              />
            </g>
          )
        })}

      <LeadershipRoots
        position={position}
        nodes={rawNodes}
        activeId={active?.id}
        view={view}
      />
    </g>
  )

  return { sceneNodes, sceneEdges: [], overlays }
}

function CrewCluster({ crew, point, direction, color, view, active }) {
  const glyphCount = Math.max(4, Math.min(18, Math.ceil(crew.count / 4)))
  const stemEnd = {
    x: point.x + direction.x * 15,
    y: point.y + direction.y * 15,
  }
  return (
    <g>
      <line
        x1={point.x - direction.x * 9}
        y1={point.y - direction.y * 9}
        x2={stemEnd.x}
        y2={stemEnd.y}
        stroke={color}
        strokeWidth="0.65"
      />
      {Array.from({ length: glyphCount }, (_, index) => {
        const angle = index * 2.39996 + crew.crewIndex * 0.41
        const radius = 3.8 * Math.sqrt(index + 1)
        const x = stemEnd.x + Math.cos(angle) * radius
        const y = stemEnd.y + Math.sin(angle) * radius
        return (
          <g key={index}>
            {index > 2 && (
              <line
                x1={stemEnd.x}
                y1={stemEnd.y}
                x2={x}
                y2={y}
                stroke={color}
                strokeWidth="0.32"
                opacity="0.48"
              />
            )}
            <circle
              cx={x}
              cy={y}
              r={active ? 2.8 : view === "workforce" ? 2.35 : 1.85}
              fill={view === "workforce" ? color : index % 3 === 0 ? PAPER : INK_SOFT}
              stroke={color}
              strokeWidth="0.55"
            />
          </g>
        )
      })}
      {active && (
        <text
          x={point.x}
          y={point.y - 22}
          textAnchor="middle"
          fill={INK}
          fontSize="8"
          fontWeight="700"
          paintOrder="stroke"
          stroke={PAPER}
          strokeWidth="4"
        >
          {crew.count} · {CLASS_BY_ID.get(crew.employeeClass)?.label}
        </text>
      )}
    </g>
  )
}

function LeadershipRoots({ position, nodes, activeId, view }) {
  const board = position.get("board-of-directors")
  const president = position.get("president")
  const superintendent = position.get("general-superintendent")
  return (
    <g>
      <path
        d={`M${board.x},${board.y - 9} C${board.x},${president.y + 28} ${president.x},${president.y + 20} ${president.x},${president.y}`}
        fill="none"
        stroke={INK}
        strokeWidth="1.5"
      />
      <path
        d={`M${president.x},${president.y - 21} C${president.x},${superintendent.y + 52} ${superintendent.x},${superintendent.y + 35} ${superintendent.x},${superintendent.y}`}
        fill="none"
        stroke={INK}
        strokeWidth="1.7"
      />

      {ERIE_SERVICE_OFFICES.map((service) => {
        const p = position.get(service.id)
        const active = activeId === service.id
        return (
          <g key={service.id}>
            <path
              d={`M${president.x},${president.y - 10} Q${(president.x + p.x) / 2},${p.y + 20} ${p.x},${p.y}`}
              fill="none"
              stroke={INK_SOFT}
              strokeWidth="0.9"
            />
            <Medallion x={p.x} y={p.y} radius={active ? 12 : 9} label="" active={active} />
            <text
              x={p.x}
              y={p.y - 15}
              textAnchor="middle"
              fill={INK}
              fontSize={active ? 9 : 7.3}
              fontWeight={active ? "700" : "500"}
            >
              {service.label}
            </text>
          </g>
        )
      })}

      <g opacity={view === "workforce" ? 0.72 : 1}>
        {Array.from({ length: 13 }, (_, index) => {
          const angle = Math.PI + (index / 12) * Math.PI
          const x = board.x + Math.cos(angle) * 73
          const y = board.y + Math.sin(angle) * 38
          return (
            <g key={index}>
              <line x1={board.x} y1={board.y} x2={x} y2={y} stroke={INK_SOFT} strokeWidth="0.65" />
              <circle cx={x} cy={y} r="9" fill="url(#erie-medallion)" stroke={INK} strokeWidth="0.75" />
              <text x={x} y={y + 3} textAnchor="middle" fill={GOLD} fontSize="9">★</text>
            </g>
          )
        })}
      </g>

      <Medallion
        x={board.x}
        y={board.y}
        radius={activeId === "board-of-directors" ? 19 : 16}
        label="★"
        active={activeId === "board-of-directors"}
      />
      <AuthorityLabel point={board} label="BOARD OF DIRECTORS" dy={31} />

      <Medallion
        x={president.x}
        y={president.y}
        radius={activeId === "president" ? 25 : 21}
        label="P"
        active={activeId === "president"}
      />
      <AuthorityLabel point={president} label="PRESIDENT" dy={4} />

      <g>
        {Array.from({ length: 24 }, (_, index) => {
          const angle = (index / 24) * Math.PI * 2
          const inner = 27
          const outer = index % 2 ? 35 : 39
          return (
            <line
              key={index}
              x1={superintendent.x + Math.cos(angle) * inner}
              y1={superintendent.y + Math.sin(angle) * inner}
              x2={superintendent.x + Math.cos(angle) * outer}
              y2={superintendent.y + Math.sin(angle) * outer}
              stroke={activeId === "general-superintendent" ? RUST : INK_SOFT}
              strokeWidth="0.8"
            />
          )
        })}
        <Medallion
          x={superintendent.x}
          y={superintendent.y}
          radius={activeId === "general-superintendent" ? 28 : 25}
          label="★"
          active={activeId === "general-superintendent"}
        />
        <text
          x={superintendent.x}
          y={superintendent.y - 3}
          textAnchor="middle"
          fill={INK}
          fontSize="7"
          fontWeight="700"
        >
          GEN&apos;L
        </text>
        <text
          x={superintendent.x}
          y={superintendent.y + 8}
          textAnchor="middle"
          fill={INK}
          fontSize="7"
          fontWeight="700"
        >
          SUP&apos;T
        </text>
      </g>
    </g>
  )
}

function Medallion({ x, y, radius, label, active }) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={active ? "rgba(148,63,47,0.16)" : "url(#erie-medallion)"}
        stroke={active ? RUST : INK}
        strokeWidth={active ? 2 : 0.9}
      />
      <circle cx={x} cy={y} r={Math.max(2, radius - 3)} fill="none" stroke={INK_SOFT} strokeWidth="0.45" />
      {label && (
        <text
          x={x}
          y={y + 3}
          textAnchor="middle"
          fill={active ? RUST : INK}
          fontSize={Math.max(8, radius * 0.62)}
          fontWeight="700"
        >
          {label}
        </text>
      )}
    </g>
  )
}

function DivisionTitle({ division, point, active }) {
  return (
    <g>
      <text
        x={point.x}
        y={point.y - 14}
        textAnchor="middle"
        fill={active ? RUST : INK}
        fontSize={active ? 12 : 9.5}
        fontWeight="700"
        letterSpacing="0.08em"
        paintOrder="stroke"
        stroke={PAPER}
        strokeWidth="4"
      >
        {division.short.toUpperCase()}
      </text>
      <text
        x={point.x}
        y={point.y - 3}
        textAnchor="middle"
        fill={active ? RUST : INK_SOFT}
        fontSize="7"
        letterSpacing="0.12em"
      >
        DIVISION
      </text>
    </g>
  )
}

function AuthorityLabel({ point, label, dy }) {
  return (
    <text
      x={point.x}
      y={point.y + dy}
      textAnchor="middle"
      fill={INK}
      fontSize="7.5"
      fontWeight="700"
      letterSpacing="0.12em"
    >
      {label}
    </text>
  )
}

function WorkforceLegend({ active, visible, onChange }) {
  return (
    <div style={{ ...styles.legendWrap, opacity: visible ? 1 : 0.48 }}>
      <div style={styles.legendTitle}>
        {visible ? "Employee leaves · select a class" : "Switch to Workforce to color the leaves"}
      </div>
      <div style={styles.legend}>
        {ERIE_EMPLOYEE_CLASSES.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={!visible}
            onClick={() => onChange(active === item.id ? null : item.id)}
            aria-pressed={active === item.id}
            style={{
              ...styles.legendChip,
              ...(active === item.id ? styles.legendChipActive : {}),
            }}
          >
            <span style={{ ...styles.legendDot, background: item.color }} />
            {item.label}
          </button>
        ))}
      </div>
      <div style={styles.legendScale}>One drawn leaf represents up to four employees.</div>
    </div>
  )
}

function ActiveReadout({ active, locked }) {
  if (!active) {
    return (
      <div style={styles.readout}>
        <strong>Trace the line of authority</strong>
        <span>Hover any office, station, or crew.</span>
      </div>
    )
  }
  return (
    <div style={styles.readout} aria-live="polite">
      <strong>{active.label}</strong>
      <span>
        {[active.divisionLabel, active.station, active.count ? `${active.count} employees` : active.role]
          .filter(Boolean)
          .join(" · ")}
        {locked?.id === active.id ? " · held" : ""}
      </span>
    </div>
  )
}

function ToggleButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{ ...styles.toggle, ...(active ? styles.toggleActive : {}) }}
    >
      {children}
    </button>
  )
}

function renderRailroadTooltip(hoverData) {
  const datum = hoverData?.data ?? hoverData
  if (!datum?.kind) return null
  const employeeClass = CLASS_BY_ID.get(datum.employeeClass)
  return (
    <>
      <div style={{ fontWeight: 700 }}>{datum.label}</div>
      <div style={{ marginTop: 3, opacity: 0.82 }}>
        {[datum.divisionLabel, datum.station, employeeClass?.label, datum.role]
          .filter(Boolean)
          .join(" · ")}
      </div>
      {datum.count && (
        <div style={{ marginTop: 3, color: GOLD, fontWeight: 700 }}>
          {datum.count} representative employees
        </div>
      )}
    </>
  )
}

const ERIE_NOTES = [
  {
    type: "callout",
    pointId: "general-superintendent",
    label: "All five operating divisions report through this single office.",
    dx: 92,
    dy: 26,
    wrap: 155,
    color: RUST,
    connector: { end: "arrow" },
    provenance: { authorKind: "human", source: "user", basis: "historical-reading" },
  },
  {
    type: "callout",
    pointId: "susquehanna-division",
    label: "A straight rail is both route and reporting line.",
    dx: 78,
    dy: -28,
    wrap: 142,
    color: RUST,
    connector: { end: "arrow" },
    provenance: { authorKind: "human", source: "user", basis: "visual-analysis" },
  },
]

const styles = {
  lede: {
    maxWidth: "850px",
    margin: "0 0 30px",
    color: "var(--text-secondary)",
    fontSize: "19px",
    lineHeight: 1.6,
  },
  chartContainer: {
    "--semiotic-text": INK,
    "--semiotic-text-muted": INK_SOFT,
    "--semiotic-border": "#8e8676",
    "--semiotic-surface": PAPER,
    "--semiotic-surface-alt": PAPER_DEEP,
    background: PAPER,
    color: INK,
    fontFamily: SERIF,
  },
  chartBody: {
    height: "100%",
    padding: "0 12px 12px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    color: INK,
  },
  toolbar: {
    minHeight: "72px",
    padding: "10px 8px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    borderBottom: "1px solid rgba(40,37,31,0.22)",
  },
  controlBlock: {
    display: "grid",
    gap: "4px",
  },
  controlLabel: {
    color: INK_SOFT,
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  segmented: {
    display: "inline-flex",
  },
  toggle: {
    border: "1px solid rgba(40,37,31,0.36)",
    background: "rgba(255,255,255,0.25)",
    color: INK,
    padding: "6px 12px",
    fontFamily: "inherit",
    fontSize: "12px",
    cursor: "pointer",
  },
  toggleActive: {
    background: INK,
    color: PAPER,
  },
  noteButton: {
    border: "1px solid rgba(40,37,31,0.35)",
    borderRadius: "999px",
    background: "transparent",
    color: INK_SOFT,
    padding: "6px 12px",
    fontFamily: "inherit",
    fontSize: "12px",
    cursor: "pointer",
  },
  noteButtonActive: {
    borderColor: RUST,
    background: "rgba(148,63,47,0.1)",
    color: RUST,
    fontWeight: 700,
  },
  toolbarNote: {
    marginLeft: "auto",
    color: INK_SOFT,
    fontSize: "11px",
    textAlign: "right",
  },
  scroller: {
    flex: "1 1 auto",
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    backgroundColor: PAPER,
    backgroundImage:
      "radial-gradient(circle at 19% 13%, rgba(112,94,61,.06), transparent 26%), radial-gradient(circle at 81% 71%, rgba(100,75,44,.07), transparent 31%), repeating-linear-gradient(1deg, rgba(255,255,255,.03) 0 1px, rgba(58,48,34,.012) 1px 3px)",
  },
  readout: {
    minWidth: "240px",
    display: "grid",
    color: INK,
    fontSize: "11px",
    textAlign: "right",
  },
  legendWrap: {
    minHeight: "74px",
    padding: "9px 8px 0",
    borderTop: "1px solid rgba(40,37,31,0.22)",
    textAlign: "center",
    transition: "opacity 160ms ease",
  },
  legendTitle: {
    marginBottom: "6px",
    color: INK_SOFT,
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "6px",
  },
  legendChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "1px solid rgba(40,37,31,0.25)",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.22)",
    color: INK,
    padding: "4px 9px",
    fontFamily: "inherit",
    fontSize: "11px",
    cursor: "pointer",
  },
  legendChipActive: {
    borderColor: RUST,
    boxShadow: `inset 0 0 0 1px ${RUST}`,
  },
  legendDot: {
    width: "9px",
    height: "9px",
    borderRadius: "50%",
  },
  legendScale: {
    marginTop: "5px",
    color: INK_SOFT,
    fontSize: "9.5px",
    fontStyle: "italic",
  },
  editorial: {
    maxWidth: "790px",
    margin: "48px auto 0",
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
