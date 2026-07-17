import React, { useCallback, useEffect, useMemo, useState } from "react"
import { LineChart, ThemeProvider } from "semiotic"
import { ProportionalSymbolMap, resolveReferenceGeography } from "semiotic/geo"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  EARTHQUAKES,
  INITIAL_ROTATE,
  filterFacing,
  formatDateTime,
  formatDepth,
  formatMagnitude,
  formatStrongestCaption,
  isEarthquakeDatum,
  magnitudeBinId,
  magnitudeColor,
  summarizeFacing,
  toValidDate,
} from "./data/earthquakes"
import "./EarthquakesExamplePage.css"

const USGS_CATALOG_URL = "https://earthquake.usgs.gov/earthquakes/search/"

// Dashboard card is always light paper (matches the reference composition),
// even when the surrounding docs shell is dark.
const AREA_STYLE = Object.freeze({
  fill: "#fafafa",
  stroke: "#222222",
  strokeWidth: 0.85,
  fillOpacity: 1,
})

const GRATICULE = Object.freeze({
  step: [30, 30],
  style: { stroke: "#c5c5c5", strokeWidth: 0.45, opacity: 0.9 },
})

export default function EarthquakesExamplePage() {
  const [worldAreas, setWorldAreas] = useState(null)
  const [rotate, setRotate] = useState(() => [...INITIAL_ROTATE])
  const [globeWidth, globeRef] = useResponsiveWidth(280, 460)
  const [sideWidth, sideRef] = useResponsiveWidth(300, 560)

  useEffect(() => {
    let alive = true
    resolveReferenceGeography("world-110m")
      .then((features) => {
        if (alive) setWorldAreas(features)
      })
      .catch(() => {
        if (alive) setWorldAreas([])
      })
    return () => {
      alive = false
    }
  }, [])

  const facing = useMemo(() => filterFacing(EARTHQUAKES, rotate), [rotate])
  const summary = useMemo(() => summarizeFacing(facing), [facing])
  // Keep projection identity stable while the user is not filtering so StreamGeoFrame
  // does not thrash; only the initial rotate is authored here — live spins update
  // via dragRotate inside the frame, and onZoom mirrors them into React state.
  const projection = useMemo(
    () => ({ type: "orthographic", rotate: [...INITIAL_ROTATE] }),
    [],
  )

  const globeSize = Math.max(260, Math.min(460, Math.round(globeWidth)))
  const lineWidth = Math.max(280, sideWidth)
  const magMax = Math.max(1, ...summary.byMagnitude.map((row) => row.count))
  const regionMax = Math.max(1, ...summary.byRegion.map((row) => row.count), 1)

  const handleZoom = useCallback((state) => {
    const next = state?.projection?.rotate?.()
    if (!Array.isArray(next) || next.length < 2) return
    setRotate([next[0], next[1], next[2] || 0])
  }, [])

  const pointStyle = useCallback(
    (d) => ({
      fill: magnitudeColor(d.magnitude),
      stroke: "rgba(255,255,255,0.9)",
      strokeWidth: 0.65,
      opacity: 0.94,
    }),
    [],
  )

  const strongestCaption = formatStrongestCaption(summary.strongest)
  const deepestCaption = summary.deepest
    ? "deepest hypocenter"
    : "deepest hypocenter"

  return (
    <ExamplePageLayout title="Earthquakes">
      <div className="eq-page">
        <p className="eq-lede">
          An orthographic globe that filters the rest of the dashboard. Drag to spin; the KPI
          tiles, magnitude bins, regional ranks, and quarterly series recount only the events
          currently facing you. The catalog is a deterministic M6+ fixture styled after{" "}
          <a href={USGS_CATALOG_URL} target="_blank" rel="noopener noreferrer">
            USGS ComCat
          </a>
          , not a live feed.
        </p>

        <div className="eq-dashboard" aria-label="Earthquakes dashboard">
          <div className="eq-globe-panel">
            <div className="eq-globe-shell" ref={globeRef}>
              {!worldAreas ? (
                <div className="eq-globe-loading">Loading world map…</div>
              ) : (
                <ThemeProvider theme="carbon">
                  <ProportionalSymbolMap
                    chartId="earthquakes-globe"
                    points={EARTHQUAKES}
                    xAccessor="lon"
                    yAccessor="lat"
                    sizeBy="magnitude"
                    sizeRange={[2.2, 9]}
                    areas={worldAreas}
                    areaStyle={AREA_STYLE}
                    projection={projection}
                    graticule={GRATICULE}
                    dragRotate
                    zoomable
                    zoomExtent={[1, 4]}
                    fitPadding={0.02}
                    enableHover
                    tooltip={globeTooltip}
                    onZoom={handleZoom}
                    width={globeSize}
                    height={globeSize}
                    margin={0}
                    description="Orthographic globe of magnitude 6 and greater earthquakes from 2021 through 2025. Drag to rotate; charts on the right recount events on the facing hemisphere."
                    summary={`${summary.count} events currently facing the viewer. Circle size and color encode magnitude.`}
                    frameProps={{
                      background: "transparent",
                      pointStyle,
                    }}
                  />
                </ThemeProvider>
              )}
            </div>
            <p className="eq-globe-hint">Drag the globe to reorient · filter updates on release</p>
          </div>

          <div className="eq-side" ref={sideRef}>
            <header className="eq-header">
              <h1 className="eq-title">Earthquakes</h1>
              <p className="eq-subtitle">
                M6+ · 2021–2025 · USGS · spin the globe to filter
              </p>
            </header>

            <dl className="eq-kpis">
              <div className="eq-kpi">
                <dt>events facing you</dt>
                <dd>{summary.count}</dd>
              </div>
              <div className="eq-kpi">
                <dt>{strongestCaption}</dt>
                <dd>
                  {summary.strongest ? formatMagnitude(summary.strongest.magnitude) : "—"}
                </dd>
              </div>
              <div className="eq-kpi">
                <dt>{deepestCaption}</dt>
                <dd>{summary.deepest ? formatDepth(summary.deepest.depth) : "—"}</dd>
              </div>
            </dl>

            <div className="eq-charts-row">
              <div className="eq-chart-block">
                <h2 className="eq-chart-title">By magnitude</h2>
                <RankedBars
                  label="Facing earthquakes by magnitude"
                  rows={summary.byMagnitude.map((row) => ({
                    id: row.id,
                    label: row.label,
                    count: row.count,
                    color: row.color,
                  }))}
                  max={magMax}
                  labelWidth={78}
                />
              </div>

              <div className="eq-chart-block">
                <h2 className="eq-chart-title">Most active regions</h2>
                <RankedBars
                  label="Most active regions among facing earthquakes"
                  rows={(summary.byRegion.length
                    ? summary.byRegion
                    : [{ region: "—", count: 0 }]
                  ).map((row) => ({
                    id: row.region,
                    label: truncateLabel(row.region, 18),
                    count: row.count,
                    color: "var(--eq-region, #b4c8ef)",
                  }))}
                  max={regionMax}
                  labelWidth={108}
                />
              </div>
            </div>

            <div className="eq-chart-block">
              <h2 className="eq-chart-title">Events per quarter</h2>
              <div className="eq-chart-frame eq-chart-frame--quarter">
                <ThemeProvider theme="carbon">
                  <LineChart
                    chartId="earthquakes-quarterly"
                    data={summary.byQuarter}
                    xAccessor="time"
                    yAccessor="count"
                    xScaleType="time"
                    curve="monotoneX"
                    lineWidth={1.75}
                    stroke="var(--eq-line, #4a7fd4)"
                    color="var(--eq-line, #4a7fd4)"
                    showPoints={false}
                    showGrid={false}
                    width={lineWidth}
                    height={168}
                    margin={{ top: 10, right: 12, bottom: 28, left: 32 }}
                    axisExtent="exact"
                    enableHover
                    tooltip
                    description="Line chart of facing earthquakes counted by calendar quarter from 2021 through 2025."
                    frameProps={{
                      background: "transparent",
                      axes: [
                        {
                          orient: "left",
                          ticks: 3,
                          baseline: false,
                          tickFormat: (d) => {
                            const n = Number(d)
                            return Number.isFinite(n) ? String(Math.round(n)) : ""
                          },
                        },
                        {
                          orient: "bottom",
                          ticks: 5,
                          baseline: true,
                          tickFormat: (d) => {
                            const date = toValidDate(d)
                            return date ? String(date.getUTCFullYear()) : ""
                          },
                        },
                      ],
                    }}
                  />
                </ThemeProvider>
              </div>
            </div>

            <p className="eq-source">
              Fixture of {EARTHQUAKES.length} M6+ events (2021–2025), seeded along tectonic
              corridors with landmark USGS events. Facing count updates when the globe rotation
              settles. Catalog shape follows{" "}
              <a href={USGS_CATALOG_URL} target="_blank" rel="noopener noreferrer">
                earthquake.usgs.gov
              </a>
              .
            </p>
          </div>
        </div>

        <section className="eq-notes" aria-labelledby="eq-notes-heading">
          <h2 id="eq-notes-heading">How the filter works</h2>
          <p>
            The map is a <code>ProportionalSymbolMap</code> with{" "}
            <code>projection=&#123;&#123; type: &quot;orthographic&quot;, rotate &#125;&#125;</code>{" "}
            and <code>dragRotate</code>. On each zoom/rotate end, <code>onZoom</code> reads the
            live projection rotation. Points within 90° of the globe center (the front hemisphere)
            feed <code>summarizeFacing</code>, which drives the three KPI tiles, the ranked magnitude
            and region bars, and the quarterly <code>LineChart</code>. Circle color uses the same
            magnitude bins as the left bar chart so the legend is the chart itself.
          </p>
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function truncateLabel(value, max = 16) {
  const text = String(value ?? "")
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function RankedBars({ rows, max, labelWidth = 80, label }) {
  return (
    <ul className="eq-ranked-bars" aria-label={label} style={{ "--eq-label-w": `${labelWidth}px` }}>
      {rows.map((row) => {
        const pct = max > 0 ? Math.max(2, (row.count / max) * 100) : 0
        return (
          <li key={row.id} className="eq-ranked-bar">
            <span className="eq-ranked-bar__label" title={row.label}>
              {row.label}
            </span>
            <span className="eq-ranked-bar__track" aria-hidden="true">
              <span
                className="eq-ranked-bar__fill"
                style={{ width: `${pct}%`, background: row.color }}
              />
            </span>
            <span className="eq-ranked-bar__value">{row.count}</span>
          </li>
        )
      })}
    </ul>
  )
}

function globeTooltip(datum) {
  if (!datum) return null
  // Prefer the raw catalog row. Land-feature hovers (country polygons under the
  // points) do not carry earthquake fields — never call Date#toISOString on them.
  const d = unwrapEarthquakeDatum(datum)
  if (!isEarthquakeDatum(d)) return null

  const lat =
    typeof d.lat === "number" && Number.isFinite(d.lat) ? d.lat.toFixed(2) : "—"
  const lon =
    typeof d.lon === "number" && Number.isFinite(d.lon) ? d.lon.toFixed(2) : "—"

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 12, lineHeight: 1.4 }}>
      <strong>
        {formatMagnitude(d.magnitude)} · {d.place || "Earthquake"}
      </strong>
      <div style={{ opacity: 0.75, marginTop: 2 }}>
        {formatDateTime(d.time)} · {formatDepth(d.depth)} · {d.region || "—"}
      </div>
      <div style={{ opacity: 0.65, marginTop: 2 }}>
        {lat}°, {lon}° · bin {magnitudeBinId(d.magnitude)}
      </div>
    </div>
  )
}

function unwrapEarthquakeDatum(value) {
  if (!value || typeof value !== "object") return null
  if (isEarthquakeDatum(value)) return value
  if (value.data != null && typeof value.data === "object") {
    if (isEarthquakeDatum(value.data)) return value.data
    if (value.data.data != null && isEarthquakeDatum(value.data.data)) {
      return value.data.data
    }
  }
  if (value.datum != null && isEarthquakeDatum(value.datum)) return value.datum
  return value
}
