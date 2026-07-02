import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { SankeyDiagram } from "semiotic"
import { GeoCustomChart, geoHitTarget } from "semiotic/geo"
import { useReducedMotion } from "semiotic/utils"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import * as OT from "./data/oregonTrail"
import "./OregonTrailExamplePage.css"

export default function OregonTrailExamplePage() {
  const mountains = useMemo(() => OT.buildMountains(), [])
  const [w, hostRef] = useResponsiveWidth(320, 620)
  const height = Math.round(w * 0.8)
  const [sankeyW, sankeyRef] = useResponsiveWidth(320, 980)
  const sankeyHeight = Math.max(320, Math.min(440, Math.round(sankeyW * 0.44)))

  // Wagon travel along the route. `targetStop` is the destination index;
  // `travelT` eases toward it so the wagon rolls between stops.
  const [targetStop, setTargetStop] = useState(0)
  const [travelT, setTravelT] = useState(0)
  const travelRef = useRef(0)
  const reducedMotion = useReducedMotion()

  // Which state or point of interest is currently focused (hover or keyboard).
  const [focus, setFocus] = useState(null)
  const onObserve = useCallback((obs) => {
    if (!obs) return
    if (obs.type === "hover-end") return setFocus(null)
    if (obs.type !== "hover") return
    const d = obs.datum || {}
    if (d.kind === "poi" && d.id) setFocus({ kind: "poi", id: d.id })
    else if (d.name) setFocus({ kind: "state", name: d.name })
    else setFocus(null)
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      // No rolling tween — the wagon appears at the destination stop.
      travelRef.current = targetStop
      setTravelT(targetStop)
      return undefined
    }
    let raf
    const step = () => {
      const diff = targetStop - travelRef.current
      if (Math.abs(diff) < 0.004) {
        travelRef.current = targetStop
        setTravelT(targetStop)
        return
      }
      travelRef.current += diff * 0.14
      setTravelT(travelRef.current)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [targetStop, reducedMotion])

  const lastIndex = OT.ROUTE_STOPS.length - 1
  const atFinish = targetStop >= lastIndex
  const advance = useCallback(() => {
    setTargetStop((s) => Math.min(lastIndex, s + 1))
  }, [lastIndex])
  const reset = useCallback(() => setTargetStop(0), [])

  const wagon = useMemo(() => interpStops(OT.ROUTE_STOPS, travelT), [travelT])
  const currentStop = OT.ROUTE_STOPS[Math.round(travelT)]
  const settled = Math.abs(travelT - targetStop) < 0.02

  const onKeyDown = useCallback(
    (e) => {
      // Only handle keys aimed at the container itself. The footer <button>
      // inside handles Space/Enter natively; letting those bubble here would
      // advance twice (native activation + this handler).
      if (e.currentTarget !== e.target) return
      if (e.code === "Space" || e.key === " " || e.key === "Enter") {
        e.preventDefault()
        if (atFinish) reset()
        else advance()
      }
    },
    [advance, reset, atFinish]
  )

  const status = atFinish && settled
    ? "You have arrived in the Willamette Valley."
    : `Now at: ${currentStop.id}`

  return (
    <ExamplePageLayout
      title="Map of the Oregon Trail"
    >
      <p className="ot-intro">
        A closing bit of fun: the classic 1985 <em>Oregon Trail</em> end-game map,
        rebuilt with Semiotic's <code>GeoCustomChart</code>. The land is real —
        Washington, Oregon, and Idaho, projected the same way any map is — and the
        forts, rivers, mountains, and the trail itself sit at their true
        coordinates. Only the palette is borrowed from an Apple II.
      </p>

      <div
        className="ot-screen"
        ref={hostRef}
        tabIndex={0}
        role="group"
        aria-label="Interactive Map of the Oregon Trail"
        onKeyDown={onKeyDown}
      >
        <div className="ot-crt">
          <GeoCustomChart
            areas={OT.PNW_FEATURES}
            projection="mercator"
            layout={oregonTrailLayout}
            layoutConfig={{
              rivers: OT.RIVERS,
              route: OT.ROUTE_PATH,
              mountains,
              forts: OT.FORTS,
              landmarks: OT.LANDMARKS,
              start: OT.START,
              finish: OT.FINISH,
              pois: OT.ROUTE_STOPS,
              wagon,
              focus,
            }}
            width={w}
            height={height}
            enableHover
            tooltip={otTooltip}
            onObservation={onObserve}
            frameProps={{ fitPadding: 0.06, background: "transparent" }}
          />
          <div className="ot-scanlines" aria-hidden="true" />
        </div>
        <button
          type="button"
          className="ot-footer"
          onClick={() => (atFinish ? reset() : advance())}
        >
          {atFinish ? "▶ Press SPACE BAR to travel again" : "▶ Press SPACE BAR to continue"}
        </button>
      </div>

      <div className="ot-status" role="status">
        <span className="ot-status-dot" data-arrived={atFinish && settled ? "true" : "false"} />
        {status}
      </div>

      <section className="ot-sankey-section">
        <h2 className="ot-sankey-heading">Every fork in the trail</h2>
        <p className="ot-sankey-intro">
          The map is a line, but the <em>game</em> is a series of decisions.
          Reconstructing the branch points from the trail's logic — how you cross
          each river, which way you turn at South Pass, and the last gamble at The
          Dalles — gives a graph that splits and rejoins. Here a cohort of{" "}
          {OT.SANKEY_START_COUNT} wagon parties flows west through those forks; a
          ribbon bleeds off to <strong>Perished</strong> at the deadliest points.
        </p>

        <div className="ot-screen ot-screen--wide">
          <div className="ot-crt" ref={sankeyRef}>
            <SankeyDiagram
              nodes={OT.SANKEY_NODES}
              edges={OT.SANKEY_EDGES}
              nodeIdAccessor="id"
              nodeLabel="label"
              valueAccessor="value"
              colorBy="kind"
              colorScheme={OT.SANKEY_KIND_COLOR_MAP}
              edgeColorBy={edgeColor}
              orientation="horizontal"
              nodeAlign="justify"
              nodeWidth={11}
              edgeOpacity={0.5}
              showLabels
              showLegend={false}
              enableHover
              width={sankeyW}
              height={sankeyHeight}
              margin={{ top: 20, right: 116, bottom: 20, left: 96 }}
              frameProps={{ background: "transparent" }}
            />
            <div className="ot-scanlines" aria-hidden="true" />
          </div>
          <div className="ot-sankey-tally">
            <span>◄ {OT.SANKEY_START_COUNT} set out</span>
            <span className="ot-tally-arrived">{OT.SANKEY_ARRIVED} arrived</span>
            <span className="ot-tally-perished">{OT.SANKEY_PERISHED} perished ►</span>
          </div>
        </div>

        <p className="ot-sankey-caption">
          <span className="ot-key ot-key-route" /> the party&rsquo;s route &nbsp;
          <span className="ot-key ot-key-perished" /> lost along the way. Each
          crossing and route choice is a branch that rejoins at the next fort —
          the whole trail as one <code>SankeyDiagram</code>.
        </p>
      </section>

      <section className="ot-notes">
        <h2>How it's drawn</h2>
        <p>
          <code>GeoCustomChart</code> resolves and fits a Mercator projection to
          the three state outlines, then hands the layout function{" "}
          <code>scales.projectedPoint(lon, lat)</code> and a{" "}
          <code>geoPath</code>. Everything you see is emitted from one layout: the
          land as <code>geoarea</code> nodes (gray fill, black coastline), the
          Columbia, Snake, and Willamette as <code>line</code> nodes in CGA blue,
          the trail as a black route line — and the carets, forts, START/FINISH
          plaques, title, and legend as SVG overlays anchored to real
          coordinates. The wagon rolls along the route by interpolating between
          the historic stops.
        </p>
        <p>
          The flow diagram below the map is a plain <code>SankeyDiagram</code> fed
          the trail's decision graph — forks (the river crossings, the South Pass
          and Dalles route choices) fan out and rejoin at the next fort, and{" "}
          <code>edgeColorBy</code> paints the doomed ribbons red. Same palette,
          same screen.
        </p>
        <p className="ot-colophon">
          After the MECC <em>Oregon Trail</em> (1985) and Elijah Meeks's{" "}
          <a href="http://dhs.stanford.edu/dh/networks/" target="_blank" rel="noopener noreferrer">
            ORBIS
          </a>{" "}
          work on historical geography. Land: US Census state outlines. Not a
          navigational chart — you will not really ford any rivers here.
        </p>
      </section>
    </ExamplePageLayout>
  )
}

// A clean, retro name tooltip for a focused state or point of interest —
// replaces the default field dump ("id / label / kind: poi").
function otTooltip(d) {
  const raw = (d && (d.data != null ? d.data : d)) || {}
  const name = raw.label || raw.name || d?.label || d?.name || raw.id
  if (!name) return null
  const sub = raw.kind === "poi" ? "point of interest" : "territory"
  return (
    <div className="ot-tooltip" data-semiotic-tooltip-chrome>
      <strong>{name}</strong>
      <span>{sub}</span>
    </div>
  )
}

// Color a Sankey ribbon: red where it leads to "Perished", CGA blue otherwise.
function edgeColor(d) {
  const perished = d && (d.data ? d.data.perished : d.perished)
  return perished ? OT.PERISHED_RED : OT.RIVER_BLUE
}

// Interpolate a {lon,lat} position a fraction `t` along the ordered stops.
function interpStops(stops, t) {
  const clamped = Math.max(0, Math.min(stops.length - 1, t))
  const i = Math.floor(clamped)
  const f = clamped - i
  const a = stops[i]
  const b = stops[Math.min(stops.length - 1, i + 1)]
  return { lon: a.lon + (b.lon - a.lon) * f, lat: a.lat + (b.lat - a.lat) * f }
}

// ---------------------------------------------------------------------------
// The GeoCustomChart layout — land, rivers, route (canvas nodes) + retro
// overlays (mountains, forts, plaques, title, legend, wagon).
// ---------------------------------------------------------------------------
function oregonTrailLayout(ctx) {
  const { areas, scales, config, dimensions } = ctx
  const path = scales.geoPath
  const P = (lon, lat) => scales.projectedPoint(lon, lat)
  const plot = dimensions.plot

  const nodes = []
  const focus = config.focus || null
  const focusStateName = focus && focus.kind === "state" ? focus.name : null
  const focusPoiId = focus && focus.kind === "poi" ? focus.id : null

  // Land — gray fill, black coastline. A focused (hovered / keyboard-navigated)
  // state lights up the whole shape, not just a centroid dot.
  for (const feature of areas) {
    const pathData = path(feature)
    if (!pathData) continue
    const bounds = path.bounds(feature)
    const centroid = path.centroid(feature)
    const isFocused = focusStateName && feature.properties?.name === focusStateName
    nodes.push({
      type: "geoarea",
      pathData,
      centroid,
      bounds,
      screenArea: Math.abs((bounds[1][0] - bounds[0][0]) * (bounds[1][1] - bounds[0][1])),
      style: isFocused
        ? { fill: "#d6d0be", stroke: "#1a1ae0", strokeWidth: 2.6 }
        : { fill: OT.LAND_GRAY, stroke: OT.INK, strokeWidth: 1.2 },
      datum: { name: feature.properties?.name },
      group: feature.properties?.name,
    })
  }

  // Rivers — CGA blue lines.
  for (const river of config.rivers) {
    const pts = river.map(([lon, lat]) => P(lon, lat)).filter(Boolean)
    if (pts.length > 1) {
      nodes.push({
        type: "line",
        path: pts,
        style: { stroke: OT.RIVER_BLUE, strokeWidth: 1.6, fill: "none" },
        datum: { kind: "river" },
      })
    }
  }

  // The trail — solid black route.
  const routePts = config.route.map(([lon, lat]) => P(lon, lat)).filter(Boolean)
  if (routePts.length > 1) {
    nodes.push({
      type: "line",
      path: routePts,
      style: { stroke: OT.INK, strokeWidth: 2.4, fill: "none" },
      datum: { kind: "route" },
    })
  }

  // Transparent hit targets for the trail's points of interest, so keyboard
  // navigation cycles through the forts and landmarks (not just the states)
  // and each gets a focus ring. The visible glyph is drawn in the overlays.
  for (const poi of config.pois || []) {
    const xy = P(poi.lon, poi.lat)
    if (!xy) continue
    nodes.push(
      geoHitTarget({
        x: xy[0],
        y: xy[1],
        r: 11,
        datum: { id: poi.id, label: poi.id, kind: "poi", lon: poi.lon, lat: poi.lat },
        id: poi.id,
      })
    )
  }

  // ---- overlays ----
  const carets = config.mountains
    .map((m, i) => {
      const p = P(m.lon, m.lat)
      if (!p) return null
      const s = m.big ? 7 : 5
      return (
        <path
          key={`m${i}`}
          d={`M${p[0] - s},${p[1] + s * 0.66} L${p[0]},${p[1] - s * 0.66} L${p[0] + s},${p[1] + s * 0.66}`}
          fill="none"
          stroke={OT.INK}
          strokeWidth={1.3}
          strokeLinejoin="round"
        />
      )
    })
    .filter(Boolean)

  const marks = config.landmarks
    .map((l, i) => {
      const p = P(l.lon, l.lat)
      if (!p) return null
      return <rect key={`l${i}`} x={p[0] - 2.6} y={p[1] - 2.6} width={5.2} height={5.2} fill={OT.INK} />
    })
    .filter(Boolean)

  const forts = config.forts
    .map((f, i) => {
      const p = P(f.lon, f.lat)
      if (!p) return null
      return (
        <rect key={`f${i}`} x={p[0] - 5} y={p[1] - 5} width={10} height={10} fill={OT.LAND_GRAY} stroke={OT.INK} strokeWidth={1.7} />
      )
    })
    .filter(Boolean)

  const sp = P(config.start.lon, config.start.lat)
  const fp = P(config.finish.lon, config.finish.lat)
  const wp = config.wagon ? P(config.wagon.lon, config.wagon.lat) : null
  const focusPoi = focusPoiId ? (config.pois || []).find((p) => p.id === focusPoiId) : null
  const focusPoiXY = focusPoi ? P(focusPoi.lon, focusPoi.lat) : null

  const cx = plot.x + plot.width / 2
  const legendX = plot.x + plot.width - 128
  const legendY = plot.y + 30

  const overlays = (
    <g style={{ fontFamily: '"Courier New", ui-monospace, monospace' }}>
      {carets}
      {marks}
      {forts}

      {/* Highlight the focused point of interest (mouse or keyboard). */}
      {focusPoiXY && (
        <circle cx={focusPoiXY[0]} cy={focusPoiXY[1]} r={12} fill="none" stroke={OT.START_ORANGE} strokeWidth={2.6} />
      )}

      {/* START plaque (lifted above its marker so it clears the SE corner) */}
      {sp && (
        <g>
          <rect x={sp[0] - 4} y={sp[1] - 4} width={8} height={8} fill={OT.INK} />
          <rect x={sp[0] - 58} y={sp[1] - 34} width={54} height={20} fill={OT.START_ORANGE} stroke={OT.INK} strokeWidth={1.5} />
          <text x={sp[0] - 31} y={sp[1] - 20} textAnchor="middle" fontSize="12" fontWeight="700" fill={OT.INK}>
            START
          </text>
        </g>
      )}

      {/* FINISH plaque + star */}
      {fp && (
        <g>
          <text x={fp[0]} y={fp[1] + 6} textAnchor="middle" fontSize="18" fill={OT.INK}>
            ★
          </text>
          <rect x={fp[0] - 74} y={fp[1] - 10} width={64} height={20} fill={OT.PAPER_WHITE} stroke={OT.INK} strokeWidth={1.5} />
          <text x={fp[0] - 42} y={fp[1] + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill={OT.INK}>
            FINISH
          </text>
        </g>
      )}

      {/* Wagon */}
      {wp && (
        <g transform={`translate(${wp[0]},${wp[1]})`}>
          <path d="M-8,-5 Q0,-12 8,-5 L8,1 L-8,1 Z" fill={OT.PAPER_WHITE} stroke={OT.INK} strokeWidth={1.3} />
          <circle cx={-4.5} cy={3.5} r={2.6} fill={OT.INK} />
          <circle cx={4.5} cy={3.5} r={2.6} fill={OT.INK} />
        </g>
      )}

      {/* Title */}
      <g>
        <text x={cx} y={plot.y + 28} textAnchor="middle" fontSize="21" fontWeight="700" fill={OT.PAPER_WHITE} stroke={OT.INK} strokeWidth={3.5} paintOrder="stroke" letterSpacing="1">
          Map of the
        </text>
        <text x={cx} y={plot.y + 53} textAnchor="middle" fontSize="21" fontWeight="700" fill={OT.PAPER_WHITE} stroke={OT.INK} strokeWidth={3.5} paintOrder="stroke" letterSpacing="1">
          Oregon Trail
        </text>
      </g>

      {/* Legend */}
      <g fontSize="11" fontWeight="700" fill={OT.INK}>
        <rect x={legendX - 12} y={legendY - 14} width={132} height={98} fill={OT.LAND_GRAY} stroke={OT.INK} strokeWidth={1.4} />
        <rect x={legendX + 1} y={legendY} width={9} height={9} fill={OT.LAND_GRAY} stroke={OT.INK} strokeWidth={1.4} />
        <text x={legendX + 18} y={legendY + 9}>Forts</text>
        <rect x={legendX + 2.5} y={legendY + 17.5} width={6} height={6} fill={OT.INK} />
        <text x={legendX + 18} y={legendY + 25}>Landmarks</text>
        <line x1={legendX} y1={legendY + 37} x2={legendX + 12} y2={legendY + 37} stroke={OT.INK} strokeWidth={2.2} />
        <text x={legendX + 18} y={legendY + 41}>Your route</text>
        <path d={`M${legendX},${legendY + 55} q3,-5 6,0 t6,0`} fill="none" stroke={OT.RIVER_BLUE} strokeWidth={1.6} />
        <text x={legendX + 18} y={legendY + 57}>Rivers</text>
        <path d={`M${legendX},${legendY + 72} l6,-7 l6,7`} fill="none" stroke={OT.INK} strokeWidth={1.3} />
        <text x={legendX + 18} y={legendY + 73}>Mountains</text>
      </g>
    </g>
  )

  return { nodes, overlays }
}
