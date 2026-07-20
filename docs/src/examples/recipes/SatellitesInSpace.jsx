import React, { useMemo, useRef, useState, useEffect, useCallback } from "react"
import { NetworkCustomChart } from "semiotic/network"
import { AccessibleNavTree } from "semiotic"
import { packedClusterMatrix, symbolPathString, makeShade } from "semiotic/recipes"
import PropControls from "../../components/PropControls"
import {
  generateSatellites,
  REGIONS,
  ORBITS,
  ORBIT_LABELS,
  CATEGORIES,
  CATEGORY_COLORS,
  CLASSES,
  CLASS_ICONS,
  MASS_STOPS,
} from "./data/satellites"

const BG = "#0a1330"
const INK = "#eef2ff"
const MUTED = "rgba(233,238,255,0.62)"
const SIZE_RANGE = [1.5, 7]
const CHART_ID = "satellites-in-space"

const numberFmt = new Intl.NumberFormat("en-US")

// Build a region → orbit navigation tree so keyboard / screen-reader users get
// a meaningful structure (arrow through regions and orbits) instead of spatial
// arrows over a swarm. Each orbit node carries a count + dominant-category
// summary; focusing one highlights that exact cell in the chart.
function buildNavTree(data) {
  const byRegion = new Map()
  for (const s of data) {
    if (!byRegion.has(s.region)) byRegion.set(s.region, [])
    byRegion.get(s.region).push(s)
  }
  const regionNodes = REGIONS.filter((r) => byRegion.has(r)).map((region) => {
    const rows = byRegion.get(region)
    const byOrbit = new Map()
    for (const s of rows) {
      if (!byOrbit.has(s.orbit)) byOrbit.set(s.orbit, [])
      byOrbit.get(s.orbit).push(s)
    }
    const orbitNodes = ORBITS.filter((o) => byOrbit.has(o)).map((orbit) => {
      const cell = byOrbit.get(orbit)
      const counts = {}
      for (const s of cell) counts[s.category] = (counts[s.category] || 0) + 1
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      const pct = Math.round((top[1] / cell.length) * 100)
      return {
        id: `o:${region}:${orbit}`,
        role: "series",
        level: 3,
        label: `${ORBIT_LABELS[orbit] ?? orbit} orbit: ${numberFmt.format(cell.length)} satellites, mostly ${top[0]} (${pct}%)`,
        value: cell.length,
      }
    })
    return {
      id: `r:${region}`,
      role: "series",
      level: 2,
      label: `${region}: ${numberFmt.format(rows.length)} satellites`,
      value: rows.length,
      children: orbitNodes,
    }
  })
  return {
    id: "root",
    role: "chart",
    level: 1,
    label: `Satellites in Space: ${numberFmt.format(data.length)} active satellites across ${regionNodes.length} regions and four orbital types`,
    children: regionNodes,
  }
}

// ── Compound legend pieces ──────────────────────────────────────────────────

function LegendBlock({ title, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function SizeLegend({ massDomain, sizeRange = SIZE_RANGE }) {
  const [lo, hi] = massDomain
  const radiusOf = (m) => {
    if (hi <= lo) return (sizeRange[0] + sizeRange[1]) / 2
    const t = Math.sqrt(Math.max(0, Math.min(1, (m - lo) / (hi - lo))))
    return sizeRange[0] + t * (sizeRange[1] - sizeRange[0])
  }
  const maxR = sizeRange[1]
  const w = MASS_STOPS.length * (maxR * 2 + 26)
  return (
    <LegendBlock title="Mass">
      <svg width={w} height={maxR * 2 + 16} aria-hidden>
        {MASS_STOPS.map((m, i) => {
          const r = radiusOf(m)
          const cx = i * (maxR * 2 + 26) + maxR
          const cy = maxR + 2
          return (
            <g key={m}>
              <circle cx={cx} cy={cy} r={r} fill="rgba(233,238,255,0.85)" />
              <text x={cx} y={maxR * 2 + 14} textAnchor="middle" fontSize={10} fill={MUTED}>
                {numberFmt.format(m)}
              </text>
            </g>
          )
        })}
      </svg>
    </LegendBlock>
  )
}

function ColorLegend({ highlight, setHighlight }) {
  return (
    <LegendBlock title="Category — color">
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {CATEGORIES.map((cat) => {
          const active = highlight && highlight.field === "category" && highlight.value === cat
          return (
            <div
              key={cat}
              onMouseEnter={() => setHighlight({ field: "category", value: cat })}
              onMouseLeave={() => setHighlight(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "default",
                opacity: highlight && !active ? 0.45 : 1,
                fontSize: 12,
                color: INK,
              }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 3, background: CATEGORY_COLORS[cat], flex: "none" }} />
              {cat}
            </div>
          )
        })}
      </div>
    </LegendBlock>
  )
}

function SymbolLegend({ highlight, setHighlight }) {
  // Composite glyph: a filled circle for every class; classes in CLASS_ICONS
  // also carry a stroked icon inside (Business/commercial stays a plain circle).
  return (
    <LegendBlock title="Class — icon">
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {CLASSES.map((klass) => {
          const active = highlight && highlight.field === "klass" && highlight.value === klass
          const iconShape = CLASS_ICONS[klass]
          return (
            <div
              key={klass}
              onMouseEnter={() => setHighlight({ field: "klass", value: klass })}
              onMouseLeave={() => setHighlight(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "default",
                opacity: highlight && !active ? 0.45 : 1,
                fontSize: 12,
                color: INK,
              }}
            >
              <svg width={16} height={16} style={{ flex: "none" }} aria-hidden>
                <circle cx={8} cy={8} r={7} fill="#7b52c9" />
                {iconShape && (
                  <path
                    d={symbolPathString(iconShape, 26)}
                    transform="translate(8,8)"
                    fill="none"
                    stroke="rgba(255,255,255,0.92)"
                    strokeWidth={1}
                  />
                )}
              </svg>
              {klass}
            </div>
          )
        })}
      </div>
    </LegendBlock>
  )
}

function ShadeLegend() {
  const shader = makeShade(CATEGORY_COLORS.Communications, 0.72)
  const light = shader(0)
  const dark = shader(1)
  return (
    <LegendBlock title="Launch date — shade">
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            width: 150,
            height: 12,
            borderRadius: 3,
            background: `linear-gradient(90deg, ${light}, ${dark})`,
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", width: 150, fontSize: 10, color: MUTED }}>
          <span>1974</span>
          <span>2020</span>
        </div>
        <div style={{ fontSize: 10.5, color: MUTED, maxWidth: 180 }}>
          A white dot marks U.K. satellites.
        </div>
      </div>
    </LegendBlock>
  )
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

function renderTooltip(d) {
  const s = d && d.data
  if (!s) return null
  const row = (label, value) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <span style={{ color: "rgba(255,255,255,0.6)" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
  return (
    <div style={{ fontSize: 12, lineHeight: 1.5, minWidth: 190 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS[s.category], flex: "none" }} />
        <strong style={{ fontSize: 13 }}>{s.name}</strong>
      </div>
      {row("Region", s.region)}
      {row("Orbit", ORBIT_LABELS[s.orbit] ?? s.orbit)}
      {row("Mass", `${numberFmt.format(s.mass)} kg`)}
      {row("Category", s.category)}
      {row("Class", s.klass)}
      {row("Launched", s.launch)}
      {s.uk ? row("Owner", "United Kingdom") : null}
    </div>
  )
}

// ── Interactive controls ──────────────────────────────────────────────────────

const CONTROL_SCHEMA = [
  { name: "rowMode", label: "Row mode", type: "select", options: ["banded", "stacked"], group: "Layout" },
  { name: "cellSizing", label: "Cell sizing", type: "select", options: ["proportional", "uniform"], group: "Layout" },
  { name: "proportionExponent", label: "Proportion exponent", type: "number", min: 0.5, max: 1, step: 0.01, group: "Layout" },
  { name: "columnGap", label: "Column gap (px)", type: "number", min: 0, max: 40, step: 1, group: "Layout" },
  { name: "rowGap", label: "Row gap (px)", type: "number", min: 0, max: 40, step: 1, group: "Layout" },
  { name: "sizeMax", label: "Max glyph radius", type: "number", min: 3, max: 14, step: 0.5, group: "Marks" },
  { name: "maxAreaFraction", label: "Max area fraction", type: "number", min: 0.15, max: 0.6, step: 0.01, group: "Marks" },
  { name: "packPadding", label: "Pack padding (px)", type: "number", min: 0, max: 3, step: 0.1, group: "Marks" },
  { name: "iterations", label: "Relaxation passes", type: "number", min: 2, max: 14, step: 1, group: "Marks" },
  { name: "shadeStrength", label: "Shade strength", type: "number", min: 0, max: 1, step: 0.02, group: "Marks" },
  { name: "showIcons", label: "Class icons", type: "boolean", group: "Decoration" },
  { name: "showEnclosures", label: "Band enclosures", type: "boolean", group: "Decoration" },
  { name: "showColumnHeaders", label: "Region headers", type: "boolean", group: "Decoration" },
  { name: "showRowLabels", label: "Orbit labels", type: "boolean", group: "Decoration" },
  { name: "showCallouts", label: "Callouts", type: "boolean", group: "Decoration" },
  { name: "showMarkers", label: "U.K. dots", type: "boolean", group: "Decoration" },
]

const CONTROL_DEFAULTS = {
  rowMode: "banded",
  cellSizing: "proportional",
  proportionExponent: 0.85,
  columnGap: 18,
  rowGap: 12,
  sizeMax: 7,
  maxAreaFraction: 0.38,
  packPadding: 0.5,
  iterations: 12,
  shadeStrength: 0.72,
  showIcons: true,
  showEnclosures: true,
  showColumnHeaders: true,
  showRowLabels: true,
  showCallouts: true,
  showMarkers: true,
}

const CALLOUTS = [
  { field: "name", value: "X-37B OTV-6", label: "X-37B OTV-6" },
  { field: "name", value: "USA 245", label: "USA 245" },
  { field: "name", value: "Hubble Space Telescope", label: "Hubble Space Telescope" },
  { field: "name", value: "Cosmos 2542", label: "Cosmos 2542" },
  { field: "name", value: "Cosmos 2543", label: "Cosmos 2543" },
]

// ── Main ─────────────────────────────────────────────────────────────────────

function SatellitesGraphic() {
  const data = useMemo(() => generateSatellites(42), [])
  const massDomain = useMemo(() => {
    let lo = Infinity
    let hi = -Infinity
    for (const s of data) {
      if (s.mass < lo) lo = s.mass
      if (s.mass > hi) hi = s.mass
    }
    return [lo, hi]
  }, [data])

  const [highlight, setHighlight] = useState(null)
  const [params, setParams] = useState(CONTROL_DEFAULTS)
  const [showControls, setShowControls] = useState(false)
  const onParam = useCallback((name, value) => setParams((p) => ({ ...p, [name]: value })), [])
  const onResetParams = useCallback(() => setParams(CONTROL_DEFAULTS), [])
  // Defer the chart until the container is measured so we pack exactly once,
  // at the real width (rather than packing a throwaway default first).
  const [size, setSize] = useState(null)
  const [fs, setFs] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const onFs = () => setFs(document.fullscreenElement === wrapRef.current)
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  const toggleFs = useCallback(() => {
    const el = wrapRef.current
    if (document.fullscreenElement) {
      if (document.exitFullscreen) Promise.resolve(document.exitFullscreen()).catch(() => {})
    } else if (el && el.requestFullscreen) {
      Promise.resolve(el.requestFullscreen()).catch(() => {})
    }
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      // Quantize width so sub-pixel ResizeObserver jitter doesn't trigger a
      // re-pack (which read as unstable rendering); only real size steps re-run.
      const w = Math.max(360, Math.round((el.clientWidth - 2) / 24) * 24)
      const h = fs
        ? Math.max(460, window.innerHeight - 250)
        : Math.round(Math.min(820, Math.max(460, w * 0.62)))
      setSize((prev) => (prev && prev.width === w && prev.height === h ? prev : { width: w, height: h }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fs])

  const layoutConfig = useMemo(
    () => ({
      columnAccessor: "region",
      rowAccessor: "orbit",
      sizeAccessor: "mass",
      colorAccessor: "category",
      colorMap: CATEGORY_COLORS,
      // Composite glyph: every mark is a filled circle; only the classes in
      // CLASS_ICONS carry a stroked icon inside (Business/commercial stays plain).
      ...(params.showIcons
        ? { iconAccessor: "klass", iconMap: CLASS_ICONS, iconColor: "rgba(255,255,255,0.9)", iconStrokeWidth: 0.9, iconScale: 0.72 }
        : {}),
      shadeAccessor: "launch",
      shadeStrength: params.shadeStrength,
      ...(params.showMarkers ? { markerAccessor: "uk" } : {}),
      columnOrder: REGIONS,
      rowOrder: ORBITS,
      columnLabel: (c) => c,
      rowLabel: (r) => ORBIT_LABELS[r] ?? r,
      sizeRange: [1.5, params.sizeMax],
      sizeDomain: massDomain,
      maxAreaFraction: params.maxAreaFraction,
      // Aligned, bottom-anchored orbit bands: row labels align to the bands, one
      // enclosure spans the regions per orbit, and a region's column is only as
      // tall as its highest occupied orbit.
      rowMode: params.rowMode,
      cellSizing: params.cellSizing,
      proportionExponent: params.proportionExponent,
      columnGap: params.columnGap,
      rowGap: params.rowGap,
      packPadding: params.packPadding,
      iterations: params.iterations,
      showEnclosures: params.showEnclosures,
      showColumnHeaders: params.showColumnHeaders,
      showRowLabels: params.showRowLabels,
      enclosureColor: "rgba(233,238,255,0.7)",
      enclosureOpacity: 0.75,
      enclosureWidth: 2,
      enclosureRadius: 12,
      headerColor: INK,
      labelColor: MUTED,
      headerFontSize: 13,
      labelFontSize: 11,
      markerColor: "#ffffff",
      dimOpacity: 0.07,
      calloutColor: "rgba(233,238,255,0.85)",
      callouts: params.showCallouts ? CALLOUTS : [],
      highlight,
    }),
    [params, massDomain, highlight]
  )

  const tooltipContent = useCallback((d) => renderTooltip(d), [])

  const navTree = useMemo(() => buildNavTree(data), [data])
  // Focusing a node in the structured tree highlights the matching region (or
  // exact region×orbit cell) in the chart — so keyboard navigation drives the
  // same emphasis a mouse would.
  const onNavActive = useCallback((node) => {
    const id = node && node.id
    if (!id || id === "root") return setHighlight(null)
    if (id.startsWith("r:")) return setHighlight({ field: "region", value: id.slice(2) })
    if (id.startsWith("o:")) {
      const parts = id.split(":")
      return setHighlight([
        { field: "region", value: parts[1] },
        { field: "orbit", value: parts[2] },
      ])
    }
  }, [])

  const btnStyle = {
    background: "rgba(233,238,255,0.1)",
    color: INK,
    border: "1px solid rgba(233,238,255,0.25)",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
  }

  return (
    <div
      ref={wrapRef}
      style={{
        background: BG,
        color: INK,
        borderRadius: fs ? 0 : 10,
        padding: fs ? 24 : 18,
        height: fs ? "100vh" : "auto",
        overflow: fs ? "auto" : "visible",
        boxSizing: "border-box",
        fontFamily: "var(--semiotic-font-family, system-ui, sans-serif)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.01em" }}>Satellites in Space</div>
          <div style={{ fontSize: 13, color: MUTED, maxWidth: 720, marginTop: 4 }}>
            Each glyph is one active satellite from a procedurally-generated catalog of {numberFmt.format(data.length)}.
            Columns are controlling regions, rows are orbital types. A glyph&rsquo;s <em>color</em> shows category,{" "}
            <em>size</em> mass, <em>shade</em> launch date, and a stroked <em>icon</em> its class. Hover a glyph for
            details; hover the legend to isolate; open <strong>Controls</strong> to drive the recipe&rsquo;s parameters.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flex: "none" }}>
          <button onClick={() => setShowControls((s) => !s)} style={btnStyle} aria-expanded={showControls}>
            {showControls ? "✕ Controls" : "⚙ Controls"}
          </button>
          <button onClick={toggleFs} style={btnStyle}>
            {fs ? "⤡ Exit full screen" : "⤢ Full screen"}
          </button>
        </div>
      </div>

      {showControls && (
        <div
          style={{
            marginBottom: 14,
            padding: 12,
            borderRadius: 8,
            background: "rgba(233,238,255,0.04)",
            border: "1px solid rgba(233,238,255,0.12)",
          }}
        >
          <PropControls controls={CONTROL_SCHEMA} values={params} onChange={onParam} onReset={onResetParams} />
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 28,
          alignItems: "flex-start",
          marginBottom: 12,
          paddingBottom: 12,
          borderBottom: "1px solid rgba(233,238,255,0.12)",
        }}
      >
        <SizeLegend massDomain={massDomain} sizeRange={[1.5, params.sizeMax]} />
        <ColorLegend highlight={highlight} setHighlight={setHighlight} />
        <SymbolLegend highlight={highlight} setHighlight={setHighlight} />
        <ShadeLegend />
      </div>

      {/* Structured keyboard / screen-reader navigation: arrow through regions
          and orbits (a meaningful hierarchy) rather than spatial arrows over a
          swarm. Screen-reader-only; focusing a node highlights the chart. */}
      <AccessibleNavTree
        tree={navTree}
        label="Browse satellites by region and orbit"
        chartId={CHART_ID}
        onActiveChange={onNavActive}
      />

      {size ? (
        <NetworkCustomChart
          nodes={data}
          nodeIDAccessor="id"
          chartId={CHART_ID}
          layout={packedClusterMatrix}
          layoutConfig={layoutConfig}
          width={size.width}
          height={size.height}
          accessibleTable={false}
          description={`A matrix of ${numberFmt.format(
            data.length
          )} active satellites: columns are controlling regions, rows are orbital types, and each glyph encodes class as shape, category as color, mass as size, and launch date as shade. Use the "Browse satellites by region and orbit" control to navigate by region and orbit.`}
          summary="The U.S. and low Earth orbit dominate; geosynchronous orbit skews to communications and medium Earth orbit to navigation."
          frameProps={{ background: BG, tooltipContent }}
        />
      ) : (
        <div style={{ height: 460 }} aria-hidden />
      )}
    </div>
  )
}

export default function SatellitesInSpace() {
  return <SatellitesGraphic />
}
