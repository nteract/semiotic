import React, { useCallback, useEffect, useMemo, useState } from "react"
import { GeoCustomChart, geoHitTarget, resolveReferenceGeography } from "semiotic/geo"
import { NetworkCustomChart } from "semiotic/network"
import { networkHitTarget, unwrapDatum } from "semiotic/recipes"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import { SEMIOTIC_ARCHITECTURE_NODES } from "./data/semioticArchitecture"
import {
  ANIMALIA_ARTICLE_URL,
  FRAME_IDS,
  FRAME_META,
  HOC_SPLITS,
  IMPERIAL_POINTS,
  IMPERIAL_ROUTES,
  LONDON,
  OCTOPUS_MAPS_PAPER_URL,
  WASTE_EDGES,
  WASTE_NODES,
  WASTE_SYSTEM,
} from "./data/octopusMetaphor"
import "./OctopusMetaphorExamplePage.css"

const INK = "#191512"
const INK_SOFT = "#4f4438"
const PAPER = "#f4eddb"
const PAPER_DEEP = "#e8dcc0"
const RED = "#d63f33"
const RED_DARK = "#9f2a24"
const BLUE = "#284a6f"
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Georgia, 'Times New Roman', serif"

const GEO_MIN_WIDTH = 860
const SEMIOTIC_MIN_WIDTH = 760

export default function OctopusMetaphorExamplePage() {
  const [wasteWidth, wasteRef] = useResponsiveWidth(340, 860)
  const wasteHeight = Math.max(410, Math.min(560, Math.round(wasteWidth * 0.62)))
  const [worldWidth, worldRef] = useResponsiveWidth(GEO_MIN_WIDTH, 1120)
  const worldHeight = Math.round(worldWidth * 0.54)
  const [semioticWidth, semioticRef] = useResponsiveWidth(SEMIOTIC_MIN_WIDTH, 1120)
  const semioticHeight = Math.round(Math.max(540, Math.min(690, semioticWidth * 0.58)))
  const [worldAreas, setWorldAreas] = useState(null)
  const [activeWasteId, setActiveWasteId] = useState(null)
  const [activePlaceId, setActivePlaceId] = useState(null)
  const [activeSemioticId, setActiveSemioticId] = useState(null)

  useEffect(() => {
    let alive = true
    resolveReferenceGeography("world-110m").then((features) => {
      if (alive) setWorldAreas(features)
    })
    return () => {
      alive = false
    }
  }, [])

  const semioticData = useMemo(() => buildSemioticOctopusData(), [])

  const handleWasteObservation = useCallback((observation) => {
    if (observation.type === "hover" && observation.datum) {
      setActiveWasteId(unwrapDatum(observation.datum)?.id ?? null)
    } else if (observation.type === "hover-end") {
      setActiveWasteId(null)
    }
  }, [])

  const handlePlaceObservation = useCallback((observation) => {
    if (observation.type === "hover" && observation.datum) {
      setActivePlaceId(unwrapDatum(observation.datum)?.id ?? null)
    } else if (observation.type === "hover-end") {
      setActivePlaceId(null)
    }
  }, [])

  const handleSemioticObservation = useCallback((observation) => {
    if (observation.type === "hover" && observation.datum) {
      setActiveSemioticId(unwrapDatum(observation.datum)?.id ?? null)
    } else if (observation.type === "hover-end") {
      setActiveSemioticId(null)
    }
  }, [])

  return (
    <ExamplePageLayout title="The Octopus: It has its tentacles in everything">
      <section className="octo-hero">
        <p>
          The octopus is one of the oldest system diagrams that refuses to admit it is a
          diagram. A head names the actor, each arm names a channel of influence, and the
          viewer is asked to read reach as responsibility. That makes it a useful historical
          metaphor for information visualization, and a risky one: the same grammar that clarifies
          a system can also make every remote event look controlled by a single hidden body.
        </p>
        <p>
          This example turns that metaphor back into Semiotic data. It begins with the moral
          network from the old national-waste octopus, moves through the imperial octopus map,
          and ends with the joke from{" "}
          <a href={ANIMALIA_ARTICLE_URL} target="_blank" rel="noopener noreferrer">
            Animalia.js
          </a>{" "}
          made literal: Semiotic as a many-armed chart system.
        </p>
      </section>

      <section className="octo-section" aria-labelledby="waste-heading">
        <div className="octo-section-copy">
          <span className="octo-kicker">Network metaphor</span>
          <h2 id="waste-heading">A small system with a body</h2>
          <p>
            The first source image is not really a picture of an animal. It is a network:
            five named targets connected to one central cause. The custom layout keeps those
            targets as data nodes, draws the visible arms in SVG, and emits invisible hit targets
            so the sketch remains hoverable, keyboard navigable, and exportable.
          </p>
        </div>

        <figure className="octo-figure octo-figure--waste">
          <div className="octo-chart-shell" ref={wasteRef}>
            <NetworkCustomChart
              chartId="octopus-national-waste"
              nodes={WASTE_NODES}
              edges={WASTE_EDGES}
              layout={wasteOctopusLayout}
              layoutConfig={{ activeId: activeWasteId }}
              width={wasteWidth}
              height={wasteHeight}
              margin={0}
              enableHover
              onObservation={handleWasteObservation}
              description="A network remake of a historical octopus diagram. A central octopus labelled as national waste reaches five named targets: coffee, tea, war, liquor, and tobacco."
              summary="The diagram has one central system node and five target nodes. Each target is connected by a curved tentacle path rather than a straight line."
              accessibleTable
              frameProps={{
                background: "transparent",
                tooltipContent: renderOctopusTooltip,
              }}
            />
          </div>
          <figcaption>
            Data drives the targets and tentacle paths. The visible drawing changes if the nodes
            change, but the chart keeps the interaction model of a network diagram.
          </figcaption>
        </figure>
      </section>

      <section className="octo-section" aria-labelledby="map-heading">
        <div className="octo-section-copy">
          <span className="octo-kicker">Geographic metaphor</span>
          <h2 id="map-heading">The octopus map as persuasive cartography</h2>
          <p>
            Octopus maps turn geography into indictment: distance becomes reach, routes become
            grasp, and the map&apos;s empty water is filled with red arms. Recent visualization
            research has described the genre as a visual argument, not just a decorative map. This
            remake uses a <code>GeoCustomChart</code>: Natural Earth countries are projected by
            GeoFrame, while the red routes are generated from the dated possession list below.
          </p>
          <p className="octo-source-note">
            For a current research treatment, see{" "}
            <a href={OCTOPUS_MAPS_PAPER_URL} target="_blank" rel="noopener noreferrer">
              The Many Tendrils of the Octopus Map
            </a>
            .
          </p>
        </div>

        <figure className="octo-figure octo-figure--map">
          <div className="octo-scroll" ref={worldRef}>
            <div className="octo-world-frame" style={{ width: worldWidth }}>
              {worldAreas ? (
                <GeoCustomChart
                  chartId="octopus-freiheit-der-meere"
                  areas={worldAreas}
                  points={IMPERIAL_POINTS}
                  projection="equirectangular"
                  layout={imperialOctopusMapLayout}
                  layoutConfig={{ activeId: activePlaceId }}
                  width={worldWidth}
                  height={worldHeight}
                  margin={0}
                  enableHover
                  tooltip={renderMapTooltip}
                  onObservation={handlePlaceObservation}
                  description="A custom GeoFrame remake of the 1917 Freiheit der Meere octopus map. Black world landmasses sit under red tentacles radiating from London to dated imperial possessions and strategic ports."
                  summary={`The map draws ${IMPERIAL_ROUTES.length} red routes from London to named places, from Bermudas in 1609 through Archangelsk and Kronstadt in 1917.`}
                  accessibleTable
                  frameProps={{ fitPadding: 0.04, background: "transparent" }}
                />
              ) : (
                <div className="octo-map-loading">Loading world geography...</div>
              )}
            </div>
          </div>
          <ImperialTimeline />
          <figcaption>
            The German title is reproduced as source text, but the implementation is a modern
            geographic frame: country paths, route endpoints, labels, curls, and the chronology are
            all generated from arrays.
          </figcaption>
        </figure>
      </section>

      <section className="octo-section" aria-labelledby="semiotic-heading">
        <div className="octo-section-copy">
          <span className="octo-kicker">System portrait</span>
          <h2 id="semiotic-heading">Semiotic is an octopus</h2>
          <p>
            The closing diagram flips the metaphor. The central body is not a villainous power
            but a library with five frame arms. The new physics arm holds process-driven chart
            HOCs beside XY, Ordinal, Network, and Geo. Each arm holds a smaller frame-octopus,
            and each small octopus holds bars for the chart HOCs built on that frame. The data
            comes from the same architecture table used elsewhere in the examples section.
          </p>
        </div>

        <figure className="octo-figure octo-figure--semiotic">
          <div className="octo-scroll" ref={semioticRef}>
            <div className="octo-semiotic-frame" style={{ width: semioticWidth }}>
              <NetworkCustomChart
                chartId="semiotic-is-an-octopus"
                nodes={semioticData.nodes}
                edges={semioticData.edges}
                layout={semioticOctopusLayout}
                layoutConfig={{ activeId: activeSemioticId }}
                width={semioticWidth}
                height={semioticHeight}
                margin={0}
                enableHover
                onObservation={handleSemioticObservation}
                description="A system diagram saying Semiotic is an octopus. The central Semiotic octopus holds five smaller octopuses, one each for the XY, Ordinal, Network, Geo, and Physics frames. Each smaller octopus holds bars representing the HOCs built from that frame."
                summary={`${semioticData.frameCount} frame tendrils hold ${semioticData.hocCount} HOC bars in total. ${semioticData.frameSummary}.`}
                accessibleTable
                frameProps={{
                  background: "transparent",
                  tooltipContent: renderSemioticTooltip,
                }}
              />
            </div>
          </div>
          <figcaption>
            This is still a network custom layout: the visible octopuses and bars are overlays,
            while transparent scene nodes preserve hover, focus, tooltips, and the accessible data
            table.
          </figcaption>
        </figure>
      </section>
    </ExamplePageLayout>
  )
}

function wasteOctopusLayout(ctx) {
  const { plot } = ctx.dimensions
  const activeId = ctx.config.activeId
  const center = { x: plot.width * 0.5, y: plot.height * 0.47 }
  const rawNodes = ctx.nodes.map((node) => node.data ?? node)
  const targets = rawNodes.filter((node) => node.kind === "target")
  const positioned = targets.map((target) => ({
    ...target,
    x: target.x * plot.width,
    y: target.y * plot.height,
    r: Math.max(18, Math.min(48, target.r * (plot.width / 760))),
  }))

  const sceneNodes = [
    networkHitTarget({
      x: center.x,
      y: center.y - 8,
      r: 48,
      datum: WASTE_SYSTEM,
      id: WASTE_SYSTEM.id,
    }),
    ...positioned.map((target) =>
      networkHitTarget({
        x: target.x,
        y: target.y,
        r: target.r + 15,
        datum: target,
        id: target.id,
      }),
    ),
  ]

  return {
    sceneNodes,
    sceneEdges: [],
    overlays: (
      <WasteOctopusOverlay
        center={center}
        targets={positioned}
        width={plot.width}
        height={plot.height}
        activeId={activeId}
      />
    ),
  }
}

function WasteOctopusOverlay({ center, targets, width, height, activeId }) {
  const focused = !!activeId
  return (
    <g className="octo-waste-overlay" fontFamily={SERIF}>
      <rect x={8} y={8} width={width - 16} height={height - 16} fill={PAPER} stroke={INK} />
      <path
        d={`M${width * 0.08},${height * 0.33} C${width * 0.22},${height * 0.27} ${width * 0.32},${height * 0.35} ${width * 0.44},${height * 0.27} S${width * 0.67},${height * 0.18} ${width * 0.84},${height * 0.3}`}
        fill="none"
        stroke={INK_SOFT}
        strokeWidth="1.2"
        opacity="0.35"
      />
      {targets.map((target) => {
        const active = !focused || activeId === target.id || activeId === WASTE_SYSTEM.id
        return (
          <TentaclePath
            key={target.id}
            center={center}
            target={target}
            active={active}
          />
        )
      })}
      {targets.map((target) => {
        const active = !focused || activeId === target.id || activeId === WASTE_SYSTEM.id
        return <WasteTarget key={target.id} target={target} active={active} />
      })}
      <CentralOctopus
        x={center.x}
        y={center.y - 4}
        scale={Math.max(0.76, Math.min(1.08, width / 760))}
        label="Waste"
      />
    </g>
  )
}

function TentaclePath({ center, target, active }) {
  const dx = target.x - center.x
  const dy = target.y - center.y
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length
  const px = -uy
  const py = ux
  const start = { x: center.x + ux * 30, y: center.y + uy * 22 }
  const end = {
    x: target.x - ux * (target.r * 0.9),
    y: target.y - uy * (target.r * 0.9),
  }
  const bow = target.bow * Math.min(120, length * 0.38)
  const c1 = {
    x: center.x + dx * 0.28 + px * bow,
    y: center.y + dy * 0.28 + py * bow,
  }
  const c2 = {
    x: center.x + dx * 0.72 + px * bow * 0.82,
    y: center.y + dy * 0.72 + py * bow * 0.82,
  }
  const pathD = `M${start.x},${start.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`
  const curlR = Math.max(10, target.r * 0.32)
  const curlD = `M${end.x},${end.y} c${target.curl * curlR},${-curlR} ${target.curl * curlR * 2},${curlR} 0,${curlR * 1.15}`
  return (
    <g opacity={active ? 1 : 0.2}>
      <path d={pathD} fill="none" stroke={INK} strokeWidth="6.5" strokeLinecap="round" />
      <path d={pathD} fill="none" stroke={PAPER} strokeWidth="3.2" strokeLinecap="round" />
      <path d={curlD} fill="none" stroke={INK} strokeWidth="4.6" strokeLinecap="round" />
      <path d={curlD} fill="none" stroke={PAPER} strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

function WasteTarget({ target, active }) {
  const label = target.label.toUpperCase()
  const isLarge = target.r > 34
  const w = isLarge ? target.r * 1.52 : target.r * 1.18
  const h = isLarge ? target.r * 1.05 : target.r * 0.92
  return (
    <g opacity={active ? 1 : 0.22}>
      <path
        d={`M${target.x - w * 0.5},${target.y - h * 0.24} C${target.x - w * 0.54},${target.y - h * 0.78} ${target.x + w * 0.54},${target.y - h * 0.78} ${target.x + w * 0.5},${target.y - h * 0.24} L${target.x + w * 0.42},${target.y + h * 0.35} C${target.x + w * 0.12},${target.y + h * 0.58} ${target.x - w * 0.12},${target.y + h * 0.58} ${target.x - w * 0.42},${target.y + h * 0.35} Z`}
        fill={PAPER_DEEP}
        stroke={INK}
        strokeWidth="2.2"
      />
      <path
        d={`M${target.x - w * 0.3},${target.y - h * 0.55} c${w * 0.24},${-h * 0.18} ${w * 0.46},${-h * 0.18} ${w * 0.6},0`}
        fill="none"
        stroke={INK}
        strokeWidth="1.8"
      />
      <text
        x={target.x}
        y={target.y + 3}
        textAnchor="middle"
        fontSize={isLarge ? 12 : 10}
        fontWeight="800"
        fill={INK}
      >
        {label}
      </text>
    </g>
  )
}

function CentralOctopus({ x, y, scale = 1, label, color = INK, fill = PAPER }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="-20" rx="35" ry="47" fill={fill} stroke={color} strokeWidth="3" />
      <path
        d="M-34,9 C-22,22 -8,24 0,18 C8,24 22,22 34,9 C28,38 -28,38 -34,9Z"
        fill={fill}
        stroke={color}
        strokeWidth="3"
      />
      <circle cx="-10" cy="-17" r="2.8" fill={color} />
      <circle cx="10" cy="-17" r="2.8" fill={color} />
      <path d="M-4,-6 Q0,-2 4,-6" fill="none" stroke={color} strokeWidth="1.7" />
      {label && (
        <text x="0" y="53" textAnchor="middle" fontSize="13" fontWeight="800" fill={color}>
          {label.toUpperCase()}
        </text>
      )}
    </g>
  )
}

function imperialOctopusMapLayout(ctx) {
  const path = ctx.scales.geoPath
  const activeId = ctx.config.activeId
  const mapNodes = []
  for (const feature of ctx.areas) {
    const pathData = path(feature)
    if (!pathData) continue
    const bounds = path.bounds(feature)
    mapNodes.push({
      type: "geoarea",
      pathData,
      centroid: path.centroid(feature),
      bounds,
      screenArea: Math.abs((bounds[1][0] - bounds[0][0]) * (bounds[1][1] - bounds[0][1])),
      style: { fill: "#101010", stroke: "#101010", strokeWidth: 0.35 },
      datum: { name: feature.properties?.name || feature.id || "land" },
      group: "land",
      interactive: false,
    })
  }

  const placements = ctx.points
    .map((point) => {
      const raw = point.data ?? point
      const projected = ctx.scales.projectedPoint(raw.lon, raw.lat)
      if (!projected) return null
      return { ...raw, x: projected[0], y: projected[1] }
    })
    .filter(Boolean)
  const london = placements.find((point) => point.id === LONDON.id)
  const routePlacements = placements.filter((point) => point.kind === "possession")
  const nodes = [
    ...mapNodes,
    ...(london
      ? [
          geoHitTarget({
            x: london.x,
            y: london.y,
            r: 18,
            datum: london,
            id: london.id,
          }),
        ]
      : []),
    ...routePlacements.map((point) =>
      geoHitTarget({
        x: point.x,
        y: point.y,
        r: point.id === activeId ? 13 : 9,
        datum: point,
        id: point.id,
      }),
    ),
  ]

  return {
    nodes,
    overlays: london ? (
      <ImperialMapOverlay
        london={london}
        routes={routePlacements}
        width={ctx.dimensions.plot.width}
        height={ctx.dimensions.plot.height}
        activeId={activeId}
      />
    ) : null,
  }
}

function ImperialMapOverlay({ london, routes, width, height, activeId }) {
  const focused = !!activeId
  return (
    <g fontFamily={SERIF}>
      <defs>
        <filter id="octo-red-roughen">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.9" />
        </filter>
      </defs>
      <rect x="2" y="2" width={width - 4} height={height - 4} fill="none" stroke={INK} strokeWidth="2" />
      <text
        x={width / 2}
        y={38}
        textAnchor="middle"
        fontSize="36"
        fontWeight="900"
        letterSpacing="1.5"
        fill={INK}
      >
        FREIHEIT DER MEERE.
      </text>
      <g filter="url(#octo-red-roughen)">
        {routes.map((route) => {
          const active = !focused || activeId === route.id || activeId === LONDON.id
          return (
            <ImperialRoute
              key={route.id}
              source={london}
              target={route}
              active={active}
            />
          )
        })}
      </g>
      <BritishOctopusMark x={london.x} y={london.y} active={!focused || activeId === LONDON.id} />
      {routes.map((route) => {
        const active = !focused || activeId === route.id || activeId === LONDON.id
        return <RouteLabel key={`${route.id}-label`} route={route} active={active} />
      })}
    </g>
  )
}

function ImperialRoute({ source, target, active }) {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const length = Math.hypot(dx, dy) || 1
  const px = -dy / length
  const py = dx / length
  const bow = target.bend * Math.min(210, Math.max(48, length * 0.48))
  const c1 = {
    x: source.x + dx * 0.23 + px * bow,
    y: source.y + dy * 0.23 + py * bow,
  }
  const c2 = {
    x: source.x + dx * 0.78 + px * bow * 1.16,
    y: source.y + dy * 0.78 + py * bow * 1.16,
  }
  const d = `M${source.x},${source.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${target.x},${target.y}`
  const curl = Math.max(5, Math.min(15, length * 0.03))
  const dir = target.bend >= 0 ? 1 : -1
  const curlD = `M${target.x},${target.y} c${dir * curl},${-curl} ${dir * curl * 2},${curl * 0.9} 0,${curl * 1.4}`
  return (
    <g opacity={active ? 1 : 0.12}>
      <path d={d} fill="none" stroke={RED_DARK} strokeWidth="5.2" strokeLinecap="round" />
      <path d={d} fill="none" stroke={RED} strokeWidth="3.4" strokeLinecap="round" />
      <path d={curlD} fill="none" stroke={RED} strokeWidth="3" strokeLinecap="round" />
      <circle cx={target.x} cy={target.y} r={3.3} fill={RED_DARK} stroke={PAPER} strokeWidth="0.8" />
    </g>
  )
}

function BritishOctopusMark({ x, y, active }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={active ? 1 : 0.25}>
      {[-21, -14, -7, 7, 14, 21].map((tx, index) => (
        <path
          key={tx}
          d={`M${tx * 0.24},7 C${tx},19 ${tx + (index < 3 ? -9 : 9)},22 ${tx * 1.12},31`}
          fill="none"
          stroke={RED}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      ))}
      <path
        d="M-20,-10 C-20,-30 20,-30 20,-10 C20,6 13,19 4,20 C2,25 -2,25 -4,20 C-13,19 -20,6 -20,-10 Z"
        fill={RED_DARK}
        stroke={INK}
        strokeWidth="1.7"
      />
      <path d="M-13,-23 L13,15 M13,-23 L-13,15" stroke={PAPER} strokeWidth="3.1" strokeLinecap="round" />
      <path d="M0,-28 V18 M-18,-5 H18" stroke={PAPER} strokeWidth="3.8" strokeLinecap="round" />
      <path d="M-13,-23 L13,15 M13,-23 L-13,15" stroke={BLUE} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M0,-28 V18 M-18,-5 H18" stroke={BLUE} strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M-20,-10 C-20,-30 20,-30 20,-10 C20,6 13,19 4,20 C2,25 -2,25 -4,20 C-13,19 -20,6 -20,-10 Z"
        fill="none"
        stroke={INK}
        strokeWidth="1.7"
      />
      <circle cx="-6" cy="-3" r="3" fill={PAPER} />
      <circle cx="6" cy="-3" r="3" fill={PAPER} />
      <circle cx="-6" cy="-3" r="1.55" fill={INK} />
      <circle cx="6" cy="-3" r="1.55" fill={INK} />
      <path d="M-4,7 Q0,10 4,7" fill="none" stroke={PAPER} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M-4,7 Q0,10 4,7" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
    </g>
  )
}

function RouteLabel({ route, active }) {
  const x = route.x + (route.labelDx ?? 8)
  const y = route.y + (route.labelDy ?? 0)
  const anchor = route.labelDx < 0 ? "end" : "start"
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize="12"
      fontWeight="700"
      fontStyle="italic"
      fill={route.labelDx < 0 ? PAPER : INK}
      stroke={route.labelDx < 0 ? INK : PAPER}
      strokeWidth="2.5"
      paintOrder="stroke"
      opacity={active ? 1 : 0.2}
    >
      {route.label}
    </text>
  )
}

function ImperialTimeline() {
  const columns = chunk(IMPERIAL_ROUTES, 7)
  return (
    <div className="octo-imperial-timeline" aria-label="Imperial possession chronology">
      {columns.map((items, columnIndex) => (
        <div key={columnIndex}>
          {items.map((route) => (
            <span key={route.id}>
              <strong>{route.year}</strong> {route.label}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function buildSemioticOctopusData() {
  const byId = new Map(SEMIOTIC_ARCHITECTURE_NODES.map((node) => [node.id, node]))
  const frames = FRAME_IDS.map((id) => {
    const node = byId.get(id)
    return {
      ...node,
      ...FRAME_META[node.cluster],
      kind: "frame",
    }
  })
  const hocs = SEMIOTIC_ARCHITECTURE_NODES
    .filter((node) => FRAME_IDS.includes(node.parent))
    .flatMap((node) => {
      const split = HOC_SPLITS[node.id]
      if (!split) {
        return [{
          ...node,
          sourceGroup: node.label,
          kind: "hoc",
          count: 1,
          frameId: node.parent,
          color: FRAME_META[node.cluster].color,
        }]
      }
      return split.map((label, index) => ({
        ...node,
        id: `${node.id}-${slugId(label)}`,
        label,
        sourceGroup: node.label,
        detail: `${label}, split out from the ${node.label} grouped architecture leaf.`,
        kind: "hoc",
        count: 1,
        frameId: node.parent,
        color: FRAME_META[node.cluster].color,
        order: (node.order ?? 0) + (index + 1) / 100,
      }))
    })

  const frameCounts = frames.map((frame) => ({
    label: frame.shortLabel,
    count: hocs.filter((hoc) => hoc.frameId === frame.id).length,
  }))

  const nodes = [
    {
      id: "semiotic-octopus",
      label: "Semiotic",
      kind: "core",
      detail: "The public chart system holding five frame families.",
    },
    ...frames,
    ...hocs,
  ]
  const edges = [
    ...frames.map((frame) => ({
      id: `semiotic-octopus-${frame.id}`,
      source: "semiotic-octopus",
      target: frame.id,
      kind: "frame-tendril",
    })),
    ...hocs.map((hoc) => ({
      id: `${hoc.frameId}-${hoc.id}`,
      source: hoc.frameId,
      target: hoc.id,
      kind: "hoc-bar",
    })),
  ]
  return {
    nodes,
    edges,
    frameCount: frames.length,
    hocCount: hocs.length,
    frameSummary: frameCounts.map((frame) => `${frame.label} has ${frame.count}`).join(", "),
  }
}

function semioticOctopusLayout(ctx) {
  const { plot } = ctx.dimensions
  const activeId = ctx.config.activeId
  const rawNodes = ctx.nodes.map((node) => node.data ?? node)
  const core = rawNodes.find((node) => node.kind === "core")
  const frames = rawNodes.filter((node) => node.kind === "frame")
  const hocs = rawNodes.filter((node) => node.kind === "hoc")
  if (!core || frames.length === 0) {
    return { sceneNodes: [], sceneEdges: [], overlays: null }
  }
  const center = { x: plot.width / 2, y: plot.height * 0.48 }
  const rx = plot.width * 0.31
  const ry = plot.height * 0.31
  const framePositions = new Map()
  for (const frame of frames) {
    const meta = FRAME_META[frame.cluster]
    framePositions.set(frame.id, {
      ...frame,
      x: center.x + Math.cos(meta.angle) * rx,
      y: center.y + Math.sin(meta.angle) * ry,
      angle: meta.angle,
      color: meta.color,
    })
  }

  const hocPositions = []
  for (const frame of frames) {
    const framePos = framePositions.get(frame.id)
    const family = hocs
      .filter((hoc) => hoc.frameId === frame.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const outward = normalize({
      x: framePos.x - center.x,
      y: framePos.y - center.y,
    })
    const tangent = { x: -outward.y, y: outward.x }
    const spacing = Math.max(9, Math.min(18, 220 / Math.max(1, family.length - 1)))
    const reach = family.length > 12 ? 90 : 76
    family.forEach((hoc, index) => {
      const mid = (family.length - 1) / 2
      const offset = index - mid
      hocPositions.push({
        ...hoc,
        x: framePos.x + outward.x * reach + tangent.x * offset * spacing,
        y: framePos.y + outward.y * reach + tangent.y * offset * spacing,
        outward,
        tangent,
        frame: framePos,
        familyIndex: index,
        familySize: family.length,
      })
    })
  }

  const sceneNodes = [
    networkHitTarget({ x: center.x, y: center.y, r: 55, datum: core, id: core.id }),
    ...frames.map((frame) => {
      const p = framePositions.get(frame.id)
      return networkHitTarget({ x: p.x, y: p.y, r: 44, datum: frame, id: frame.id })
    }),
    ...hocPositions.map((hoc) =>
      networkHitTarget({ x: hoc.x, y: hoc.y, r: 11, datum: hoc, id: hoc.id }),
    ),
  ]

  return {
    sceneNodes,
    sceneEdges: [],
    overlays: (
      <SemioticOctopusOverlay
        center={center}
        frames={[...framePositions.values()]}
        hocs={hocPositions}
        width={plot.width}
        height={plot.height}
        activeId={activeId}
      />
    ),
  }
}

function SemioticOctopusOverlay({ center, frames, hocs, width, height, activeId }) {
  const focused = !!activeId
  return (
    <g fontFamily="'Inter', system-ui, sans-serif">
      <rect x="0" y="0" width={width} height={height} fill="#f2f0e7" />
      <text x={width / 2} y="42" textAnchor="middle" fontSize="26" fontWeight="900" fill={INK}>
        Semiotic is an octopus
      </text>
      {frames.map((frame) => {
        const active =
          !focused ||
          activeId === frame.id ||
          activeId === "semiotic-octopus" ||
          hocs.some((hoc) => hoc.id === activeId && hoc.frameId === frame.id)
        return (
          <FrameTendril
            key={frame.id}
            source={center}
            target={frame}
            color={frame.color}
            active={active}
          />
        )
      })}
      <CentralOctopus
        x={center.x}
        y={center.y}
        scale={1.2}
        label="Semiotic"
        color={INK}
        fill="#fff8e9"
      />
      {hocs.map((hoc) => {
        const active = !focused || activeId === hoc.id || activeId === hoc.frameId
        return <HocTentacle key={`${hoc.id}-tentacle`} hoc={hoc} active={active} />
      })}
      {frames.map((frame) => {
        const active =
          !focused ||
          activeId === frame.id ||
          hocs.some((hoc) => hoc.id === activeId && hoc.frameId === frame.id)
        return <SmallFrameOctopus key={frame.id} frame={frame} active={active} />
      })}
      {hocs.map((hoc) => {
        const active = !focused || activeId === hoc.id || activeId === hoc.frameId
        return <HocBarMark key={hoc.id} hoc={hoc} active={active} />
      })}
    </g>
  )
}

function FrameTendril({ source, target, color, active }) {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const length = Math.hypot(dx, dy) || 1
  const px = -dy / length
  const py = dx / length
  const bow = 42
  const c1 = { x: source.x + dx * 0.22 + px * bow, y: source.y + dy * 0.22 + py * bow }
  const c2 = { x: source.x + dx * 0.74 - px * bow, y: source.y + dy * 0.74 - py * bow }
  return (
    <path
      d={`M${source.x},${source.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${target.x},${target.y}`}
      fill="none"
      stroke={color}
      strokeWidth="13"
      strokeLinecap="round"
      opacity={active ? 0.82 : 0.14}
    />
  )
}

function SmallFrameOctopus({ frame, active }) {
  return (
    <g transform={`translate(${frame.x} ${frame.y})`} opacity={active ? 1 : 0.22}>
      <ellipse cx="0" cy="-12" rx="27" ry="32" fill="#fff8e9" stroke={frame.color} strokeWidth="4" />
      <circle cx="-8" cy="-14" r="2.3" fill={INK} />
      <circle cx="8" cy="-14" r="2.3" fill={INK} />
      <path d="M-4,-4 Q0,-1 4,-4" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
      <text x="0" y="66" textAnchor="middle" fontSize="14" fontWeight="900" fill={INK}>
        {frame.shortLabel}
      </text>
    </g>
  )
}

function hocBarGeometry(hoc) {
  const side = hoc.outward.x >= 0 ? 1 : -1
  const barWidth = hoc.familySize > 12 ? 20 : 25
  const barHeight = hoc.familySize > 12 ? 7 : 10
  const x = side > 0 ? hoc.x : hoc.x - barWidth
  const y = hoc.y - barHeight / 2
  const holdX = side > 0 ? x : x + barWidth
  const holdY = y + barHeight / 2
  const labelX = side > 0 ? x + barWidth + 4 : x - 4
  const anchor = side > 0 ? "start" : "end"
  return { side, barWidth, barHeight, x, y, holdX, holdY, labelX, anchor }
}

function HocTentacle({ hoc, active }) {
  const { side, holdX, holdY } = hocBarGeometry(hoc)
  const dx = holdX - hoc.frame.x
  const dy = holdY - hoc.frame.y
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length
  const px = -uy
  const py = ux
  const row = hoc.familyIndex - (hoc.familySize - 1) / 2
  const bow = side * 10 + row * 3
  const start = {
    x: hoc.frame.x + ux * 21,
    y: hoc.frame.y + uy * 18,
  }
  const end = {
    x: holdX - ux * 5,
    y: holdY - uy * 5,
  }
  const c1 = {
    x: start.x + dx * 0.34 + px * bow,
    y: start.y + dy * 0.34 + py * bow,
  }
  const c2 = {
    x: start.x + dx * 0.78 - px * bow * 0.45,
    y: start.y + dy * 0.78 - py * bow * 0.45,
  }
  const d = `M${start.x},${start.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`
  const cuffX = holdX + side * 3
  return (
    <g opacity={active ? 1 : 0.18}>
      <path
        d={d}
        fill="none"
        stroke={hoc.color}
        strokeWidth={hoc.familySize > 12 ? "3.7" : "5.2"}
        strokeLinecap="round"
      />
      <path
        d={d}
        fill="none"
        stroke="#fff8e9"
        strokeWidth={hoc.familySize > 12 ? "1" : "1.5"}
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d={`M${cuffX},${holdY - 7} q${side * -8},7 0,14`}
        fill="none"
        stroke={hoc.color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {[0.45, 0.62, 0.79].map((t, index) => (
        <circle
          key={t}
          cx={cubic(start.x, c1.x, c2.x, end.x, t) + px * (index % 2 ? 2.4 : -2.4)}
          cy={cubic(start.y, c1.y, c2.y, end.y, t) + py * (index % 2 ? 2.4 : -2.4)}
          r={hoc.familySize > 12 ? "0.9" : "1.25"}
          fill="#fff8e9"
          opacity="0.75"
        />
      ))}
    </g>
  )
}

function HocBarMark({ hoc, active }) {
  const { barWidth, barHeight, x, y, labelX, anchor } = hocBarGeometry(hoc)
  const fontSize = hoc.familySize > 12 ? 7 : hoc.familySize > 8 ? 8.4 : 10.5
  return (
    <g opacity={active ? 1 : 0.18}>
      <rect x={x} y={y} width={barWidth} height={barHeight} fill={hoc.color} rx="1" />
      <rect
        x={x + 3}
        y={y + 2}
        width={Math.max(5, barWidth - 6)}
        height={Math.max(2, barHeight - 4)}
        fill="#fff8e9"
        opacity="0.45"
      />
      <text
        x={labelX}
        y={hoc.y + fontSize * 0.34}
        textAnchor={anchor}
        fontSize={fontSize}
        fontWeight="750"
        fill={INK}
      >
        {hoc.label}
      </text>
    </g>
  )
}

function renderOctopusTooltip(d) {
  const raw = unwrapTooltipDatum(d)
  if (!raw) return null
  return (
    <div className="octo-tooltip" data-semiotic-tooltip-chrome>
      <strong>{raw.label}</strong>
      <span>{raw.detail || raw.kind}</span>
    </div>
  )
}

function renderMapTooltip(d) {
  const raw = unwrapTooltipDatum(d)
  if (!raw) return null
  return (
    <div className="octo-tooltip octo-tooltip--map" data-semiotic-tooltip-chrome>
      <strong>{raw.label}</strong>
      <span>{raw.kind === "center" ? "imperial center" : `${raw.year} route endpoint`}</span>
    </div>
  )
}

function renderSemioticTooltip(d) {
  const raw = unwrapTooltipDatum(d)
  if (!raw) return null
  return (
    <div className="octo-tooltip" data-semiotic-tooltip-chrome>
      <strong>{raw.label}</strong>
      <span>
        {raw.kind === "hoc"
          ? `Built from ${raw.sourceGroup || "a Semiotic frame"}`
          : raw.detail || raw.kind}
      </span>
    </div>
  )
}

function unwrapTooltipDatum(d) {
  const raw = unwrapDatum(d)
  return raw?.data ?? raw?.datum ?? raw
}

function chunk(values, size) {
  const out = []
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size))
  return out
}

function slugId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function normalize(point) {
  const m = Math.hypot(point.x, point.y) || 1
  return { x: point.x / m, y: point.y / m }
}

function cubic(a, b, c, d, t) {
  const mt = 1 - t
  return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d
}
