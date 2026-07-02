import React, { useMemo, useState } from "react"
import { area as d3Area, curveCatmullRom, line as d3Line } from "d3-shape"
import { ChartContainer, DifferenceChart, ThemeProvider } from "semiotic"
// hatchFill: the SVG hatch <pattern> helper (shared by the band + its legend
// swatch, so they never drift). The overlay also reads the chart's resolved
// scales from the foregroundGraphics callback.
import { hatchFill } from "semiotic/recipes"
import CodeBlock from "../../components/CodeBlock"
import ExamplePageLayout from "./ExamplePageLayout"
import { useDocsTheme } from "../../hooks/useDocsTheme"

// One source of truth for the percentile-envelope hatch, reused by the chart
// overlay and the legend swatch.
const BAND_HATCH = hatchFill({ id: "climate-band-hatch", color: "var(--semiotic-text-secondary)", spacing: 8, opacity: 0.38 })
import { useOpenMeteoLoader } from "./useOpenMeteoLoader"

const DAY_MS = 24 * 60 * 60 * 1000
const START_DATE = Date.UTC(2026, 0, 1)
const TODAY_DATE = Date.UTC(2026, 5, 26)
const END_DATE = Date.UTC(2026, 6, 8)
const TODAY_DAY = dayFromDate(TODAY_DATE)
const END_DAY = dayFromDate(END_DATE)

// Theme-driven semantic status roles (above average → warm/danger, below →
// cool/info), with the original hues as fallbacks. The DifferenceChart fill and
// the legend swatches both read these, so they respond to ThemeProvider / dark
// mode without drifting apart.
const ABOVE_COLOR = "var(--semiotic-danger, #ff4d2f)"
const BELOW_COLOR = "var(--semiotic-info, #5ca8c7)"
const ABOVE_FORECAST_HATCH = hatchFill({
  id: "climate-forecast-above-hatch",
  color: ABOVE_COLOR,
  spacing: 7,
  strokeWidth: 2,
  opacity: 0.55,
})
const BELOW_FORECAST_HATCH = hatchFill({
  id: "climate-forecast-below-hatch",
  color: BELOW_COLOR,
  spacing: 7,
  strokeWidth: 2,
  opacity: 0.55,
})

const PRESET_PROFILES = [
  {
    id: "amsterdam",
    label: "Amsterdam, NL",
    lat: 52.37,
    lon: 4.9,
    base: 11.1,
    amplitude: 6.2,
    range: 3.7,
    volatility: 1.0,
    warming: 1.05,
    seed: 2.1,
  },
  {
    id: "san-francisco",
    label: "San Francisco, CA",
    lat: 37.77,
    lon: -122.42,
    base: 14.2,
    amplitude: 2.1,
    range: 2.8,
    volatility: 0.75,
    warming: 0.8,
    seed: 4.4,
  },
  {
    id: "mumbai",
    label: "Mumbai, IN",
    lat: 19.08,
    lon: 72.88,
    base: 28.1,
    amplitude: 2.7,
    range: 2.5,
    volatility: 0.6,
    warming: 0.7,
    seed: 6.8,
  },
]

export default function ClimateAnomalyExamplePage() {
  const [lat, setLat] = useState("")
  const [lon, setLon] = useState("")
  const [docsTheme] = useDocsTheme()
  const carbonTheme = docsTheme === "dark" ? "carbon-dark" : "carbon"

  // Shared Open-Meteo loading state machine (abort lifecycle, slow-request
  // escalation, historical fallback, geolocation) — the page supplies its own
  // fallback generator, coordinate→profile mapping, and status copy.
  const {
    profile,
    liveData,
    view,
    setView,
    isSlow,
    isLoading,
    showHistorical,
    loadCurrentData,
    requestBrowserLocation,
  } = useOpenMeteoLoader({
    initialProfile: PRESET_PROFILES[0],
    buildFallback: generateClimateRows,
    fallbackKey: "fallbackClimateRows",
    profileFromCoordinates,
    loadingMessage: "Loading current Open-Meteo data…",
    locationLoadingMessage: "Waiting for your location and loading its climate…",
    liveMessage: (data) =>
      data.hasLiveBaseline
        ? `Live daily data with a ${data.baselineYears} historical baseline (${data.baselineSource}).`
        : "Live observations and forecast; the historical reference is using the local fallback.",
    failureMessage: "Open-Meteo is unavailable, so the local reference remains in view.",
  })

  const fallbackRows = useMemo(() => generateClimateRows(profile), [profile])
  const rows = liveData?.climateRows || fallbackRows
  const observedRows = useMemo(
    () => rows.filter((row) => row.actual != null),
    [rows]
  )
  const hasForecast = observedRows.some((row) => row.day > TODAY_DAY)
  const currentRow = rows[TODAY_DAY] || observedRows[observedRows.length - 1]
  const yDomain = useMemo(() => {
    const values = rows.flatMap((row) => [row.p05, row.p95, row.actual, row.adjustedMean])
      .filter((value) => typeof value === "number" && Number.isFinite(value))
    return [Math.floor(Math.min(...values) - 0.75), Math.ceil(Math.max(...values) + 0.75)]
  }, [rows])

  function handleSubmit(event) {
    event.preventDefault()
    const parsedLat = Number.parseFloat(lat)
    const parsedLon = Number.parseFloat(lon)
    if (
      !Number.isFinite(parsedLat) ||
      !Number.isFinite(parsedLon) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLon < -180 ||
      parsedLon > 180
    ) {
      setView({
        kind: liveData ? "live" : "historical",
        message: "Enter a latitude (-90 to 90) and longitude (-180 to 180).",
      })
      return
    }

    loadCurrentData(profileFromCoordinates(parsedLat, parsedLon))
  }

  const banner = isLoading && !isSlow ? null : (
    <div
      role={isSlow ? "alert" : "status"}
      aria-live="polite"
      style={{
        ...styles.banner,
        ...(isSlow ? styles.bannerSlow : {}),
        ...(view.kind === "live" ? styles.bannerLive : {}),
      }}
    >
      <div style={styles.bannerIcon} aria-hidden="true">
        {isSlow ? "…" : view.kind === "live" ? "✓" : "i"}
      </div>
      <div style={styles.bannerCopy}>
        <strong style={styles.bannerTitle}>
          {isSlow
            ? "This is taking longer than expected"
            : view.kind === "live"
              ? "Showing current data"
              : "Showing historical data"}
        </strong>
        <span style={styles.bannerMessage}>
          {isSlow
            ? "Open-Meteo is still responding. Choose an example to view historical data now."
            : view.message}
        </span>
      </div>
      {isSlow ? (
        <div style={styles.bannerActions} aria-label="Historical examples">
          {PRESET_PROFILES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => showHistorical(preset)}
              style={styles.bannerSecondaryButton}
            >
              {preset.label.split(",")[0]}
            </button>
          ))}
        </div>
      ) : view.kind === "historical" ? (
        <button
          type="button"
          onClick={() => loadCurrentData(profile)}
          style={styles.bannerActionButton}
        >
          Update data
        </button>
      ) : null}
    </div>
  )

  return (
    <ExamplePageLayout
      title="Point Climate Anomaly"
    >
      <p style={styles.lede}>
        A static-first recreation of a point climate comparison: current-year daily
        mean temperature against a historical daily mean, framed by a hatched
        5th-95th percentile band.
      </p>

      <ThemeProvider theme={carbonTheme}>
        <ChartContainer
          title={profile.label}
          subtitle="Jan 1 to Jul 8, 2026. Open-Meteo daily mean against a 1991-2020 baseline."
          height={520}
          loading={isLoading}
          banner={banner}
          controls={!isLoading ? (
            <div style={styles.temperatureReadout}>
              <span style={styles.temperatureValue}>{formatTemperature(currentRow?.actual)}</span>
              <span style={styles.temperatureLabel}>
                {view.kind === "live" ? "today" : "Historical today"}
              </span>
            </div>
          ) : null}
          style={styles.visualPanel}
        >
          <section
            style={styles.chartContent}
            aria-label={`Climate anomaly for ${profile.label}`}
          >
            <div style={styles.controls}>
              <div style={styles.locationGroup} aria-label="Preset locations">
                {PRESET_PROFILES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => showHistorical(preset)}
                    style={{
                      ...styles.locationButton,
                      ...(profile.id === preset.id && view.kind === "historical"
                        ? styles.locationButtonActive
                        : {}),
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} style={styles.searchForm}>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={-90}
                  max={90}
                  value={lat}
                  onChange={(event) => setLat(event.target.value)}
                  placeholder="Latitude"
                  aria-label="Latitude"
                  style={styles.coordInput}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={-180}
                  max={180}
                  value={lon}
                  onChange={(event) => setLon(event.target.value)}
                  placeholder="Longitude"
                  aria-label="Longitude"
                  style={styles.coordInput}
                />
                <button type="submit" style={styles.actionButton}>Set point</button>
                <button type="button" onClick={requestBrowserLocation} style={styles.secondaryButton}>
                  Use my point
                </button>
              </form>
            </div>

            <DifferenceChart
              data={observedRows}
              xAccessor="day"
              seriesAAccessor="actual"
              seriesBAccessor="adjustedMean"
              seriesALabel="Above average"
              seriesBLabel="Below average"
              seriesAColor={ABOVE_COLOR}
              seriesBColor={BELOW_COLOR}
              areaOpacity={0.82}
              curve="catmullRom"
              showLines={false}
              showLegend={false}
              showGrid
              responsiveWidth
              height={430}
              margin={{ top: 20, right: 32, bottom: 60, left: 72 }}
              xExtent={[0, END_DAY]}
              yExtent={yDomain}
              axisExtent="exact"
              xLabel="2026"
              yLabel="Mean temperature (deg C)"
              xFormat={formatMonthTick}
              yFormat={(value) => `${Math.round(value)} C`}
              tooltip="multi"
              frameProps={{
                background: "transparent",
                foregroundGraphics: ({ size, margin, scales }) => (
                  <ClimateOverlay
                    rows={rows}
                    observedRows={observedRows}
                    yDomain={yDomain}
                    scales={scales}
                    width={size[0] - margin.left - margin.right}
                    height={size[1] - margin.top - margin.bottom}
                  />
                ),
              }}
              summary={`${profile.label} is ${formatTemperature(currentRow?.actual)} on the latest available day, ${formatSigned((currentRow?.actual || 0) - (currentRow?.adjustedMean || 0))} from the historical daily mean.`}
            />

            <ClimateLegend showForecast={hasForecast} />
          </section>
        </ChartContainer>
      </ThemeProvider>

      <h2>What This Shows</h2>
      <p>
        Semiotic owns the axes, hover behavior, responsive frame, and the red-blue
        difference fill. The example adds art-directed overlays as chart-aware SVG:
        a much lighter hatched percentile envelope, the black current-year curve, a
        quiet adjusted-mean reference, and the vertical today marker.
      </p>

      <p>
        The location controls take a latitude/longitude directly (or your browser
        location) and use Open-Meteo's keyless historical archive and forecast APIs
        in the browser. The example computes the daily historical
        mean and percentile band from 1991-2020, then overlays available 2026
        observations and forecast values. A deterministic local profile remains as
        the offline fallback.
      </p>

      <h2>Implementation Excerpt</h2>
      <CodeBlock
        language="jsx"
        showCopyButton
        code={`<DifferenceChart
  data={observedRows}
  xAccessor="day"
  seriesAAccessor="actual"
  seriesBAccessor="adjustedMean"
  seriesALabel="Above average"
  seriesBLabel="Below average"
  seriesAColor="var(--semiotic-danger)"
  seriesBColor="var(--semiotic-info)"
  areaOpacity={0.82}
  curve="catmullRom"
  showLines={false}
  showLegend={false}
  showGrid
  responsiveWidth
  xExtent={[0, END_DAY]}
  yExtent={yDomain}
  frameProps={{
    background: "transparent",
    // The callback now receives the chart's resolved scales — the overlay
    // anchors to the same x/y the chart drew instead of re-deriving them.
    foregroundGraphics: ({ scales }) => (
      <ClimateOverlay rows={rows} observedRows={observedRows} scales={scales} />
    ),
  }}
/>`}
      />

      <p style={styles.sourceNote}>
        This is a simple proof of concept based on the Point WX{" "}
        <a
          href="https://hh.guidocioni.it/pointwx/dailyclimate"
          target="_blank"
          rel="noreferrer noopener"
          style={styles.sourceLink}
        >
          daily climate view
        </a>
        ; visit the original for the full experience. Live data here comes from
        Open-Meteo without an API key. Preset locations use bundled 1991-2020
        summaries; arbitrary locations compute the same baseline once and cache it
        in the browser for two weeks.
      </p>

    </ExamplePageLayout>
  )
}

function ClimateOverlay({ rows, observedRows, yDomain, width, height, scales }) {
  // foregroundGraphics re-runs on every repaint (including hover with
  // tooltip="multi"), so the four full-year d3 paths are memoized on their
  // actual inputs rather than rebuilt per render.
  const { bandPath, adjustedPath, actualPath, forecastAreas, todayX, todayY } = useMemo(() => {
    // Anchor to the chart's resolved scales when present (the foregroundGraphics
    // callback now hands them in), so this overlay can never drift from the axes.
    // Fall back to size + extent on the very first paint, before scales exist.
    const xScale = scales ? (day) => scales.x(day) : (day) => (day / END_DAY) * width
    const yScale = scales
      ? (value) => scales.y(value)
      : (value) => height - ((value - yDomain[0]) / (yDomain[1] - yDomain[0])) * height

    // API rows after TODAY_DAY are Open-Meteo forecasts. Preserve them in the
    // DifferenceChart for hover/tooltip behavior, then replace their solid fill
    // here with lighter hatches in the same above/below semantic colors.
    const forecastRuns = differenceRuns(
      observedRows.filter((row) => row.day >= TODAY_DAY),
    )
    const current = rows[TODAY_DAY] || observedRows[observedRows.length - 1]
    return {
      bandPath: d3Area()
        .x((row) => xScale(row.day))
        .y0((row) => yScale(row.p05))
        .y1((row) => yScale(row.p95))
        .curve(curveCatmullRom.alpha(0.5))(rows),
      adjustedPath: d3Line()
        .x((row) => xScale(row.day))
        .y((row) => yScale(row.adjustedMean))
        .curve(curveCatmullRom.alpha(0.5))(rows),
      actualPath: d3Line()
        .defined((row) => row.actual != null)
        .x((row) => xScale(row.day))
        .y((row) => yScale(row.actual))
        .curve(curveCatmullRom.alpha(0.5))(observedRows),
      forecastAreas: forecastRuns.map((run) => ({
        winner: run.winner,
        path: d3Area()
          .x((row) => xScale(row.day))
          .y0((row) => yScale(row.adjustedMean))
          .y1((row) => yScale(row.actual))
          .curve(curveCatmullRom.alpha(0.5))(run.rows),
      })),
      todayX: xScale(TODAY_DAY),
      todayY: yScale(current.actual),
    }
  }, [rows, observedRows, yDomain, width, height, scales])

  return (
    // The overlay anchors to the chart's own theme tokens (--semiotic-*), so it
    // tracks ThemeProvider / dark mode along with the chart it sits on.
    <g className="climate-example-overlay">
      <defs>
        {BAND_HATCH.def}
        {ABOVE_FORECAST_HATCH.def}
        {BELOW_FORECAST_HATCH.def}
      </defs>
      <path d={bandPath} fill={BAND_HATCH.fill} stroke="var(--semiotic-text-secondary)" strokeOpacity="0.24" strokeWidth="1.2" />
      <path d={adjustedPath} fill="none" stroke="var(--semiotic-text-secondary)" strokeOpacity="0.75" strokeWidth="2" strokeDasharray="5 6" />
      {forecastAreas.map(({ winner, path }, index) => (
        <g key={`forecast-${winner}-${index}`}>
          <path d={path} fill="var(--semiotic-bg)" />
          <path
            d={path}
            fill={winner === "above" ? ABOVE_FORECAST_HATCH.fill : BELOW_FORECAST_HATCH.fill}
          />
        </g>
      ))}
      <line x1={todayX} x2={todayX} y1={0} y2={height} stroke="var(--semiotic-text-secondary)" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="8 8" />
      <text
        x={todayX - 14}
        y={height - 8}
        transform={`rotate(-90 ${todayX - 14} ${height - 8})`}
        fill="var(--semiotic-text-secondary)"
        opacity="0.75"
        fontSize="12"
        fontWeight="700"
        textAnchor="start"
      >
        TODAY
      </text>
      <path d={actualPath} fill="none" stroke="var(--semiotic-text)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={todayX} cy={todayY} r="6" fill="var(--semiotic-text)" stroke="var(--semiotic-bg)" strokeWidth="2" />
    </g>
  )
}

function ClimateLegend({ showForecast }) {
  return (
    <div style={styles.legend} aria-label="Chart legend">
      <LegendItem>
        <span style={styles.hatchSwatch} />
        5th-95th percentile range
      </LegendItem>
      <LegendItem>
        <span style={styles.lineSwatch} />
        Current year
      </LegendItem>
      {showForecast && (
        <LegendItem>
          <span style={styles.forecastHatchSwatch} />
          Forecast after today
        </LegendItem>
      )}
      <LegendItem>
        <span style={{ ...styles.fillSwatch, background: BELOW_COLOR }} />
        Below average
      </LegendItem>
      <LegendItem>
        <span style={{ ...styles.fillSwatch, background: ABOVE_COLOR }} />
        Above average
      </LegendItem>
    </div>
  )
}

function LegendItem({ children }) {
  return <div style={styles.legendItem}>{children}</div>
}

function differenceRuns(rows) {
  const runs = []
  let current = null

  rows.forEach((row, index) => {
    const difference = row.actual - row.adjustedMean
    const winner = difference >= 0 ? "above" : "below"

    if (!current) {
      current = { winner, rows: [row] }
      return
    }

    if (current.winner === winner) {
      current.rows.push(row)
      return
    }

    const previous = rows[index - 1]
    const previousDifference = previous.actual - previous.adjustedMean
    const ratio = previousDifference / (previousDifference - difference)
    const crossover = {
      day: previous.day + ratio * (row.day - previous.day),
      actual: previous.actual + ratio * (row.actual - previous.actual),
      adjustedMean:
        previous.adjustedMean + ratio * (row.adjustedMean - previous.adjustedMean),
    }

    current.rows.push(crossover)
    runs.push(current)
    current = { winner, rows: [crossover, row] }
  })

  if (current?.rows.length > 1) runs.push(current)
  return runs
}

function generateClimateRows(profile) {
  return Array.from({ length: END_DAY + 1 }, (_, day) => {
    const seasonal = profile.base + profile.amplitude * Math.sin((2 * Math.PI * (day - 88)) / 365)
    const adjustedMean = seasonal + profile.warming + 0.35 * Math.sin((2 * Math.PI * (day + 20)) / 365)
    const bandPulse = 0.45 * Math.sin(day * 0.08 + profile.seed)
    const p05 = seasonal - profile.range - bandPulse
    const p95 = seasonal + profile.range + 0.55 * Math.sin(day * 0.05 + profile.seed * 0.7)
    const anomaly =
      profile.volatility *
      (
        0.55 * Math.sin(day * 0.16 + profile.seed) +
        0.42 * Math.sin(day * 0.045 + profile.seed * 2.3) +
        pulse(day, 32, 1.35, 4.8) -
        pulse(day, 49, 1.55, 3.8) +
        pulse(day, 60, 1.55, 4.5) +
        pulse(day, 83, 2.65, 5.2) +
        pulse(day, 96, 1.8, 4.2) -
        pulse(day, 126, 0.95, 5.6) +
        pulse(day, 147, 1.45, 5.5) +
        pulse(day, 169, 2.05, 4.7)
      )

    return {
      day,
      date: dateFromDay(day),
      adjustedMean: roundOne(adjustedMean),
      p05: roundOne(p05),
      p95: roundOne(p95),
      actual: day <= TODAY_DAY ? roundOne(adjustedMean + anomaly) : null,
    }
  })
}

function pulse(day, center, magnitude, spread) {
  return magnitude * Math.exp(-Math.pow(day - center, 2) / (2 * spread * spread))
}

function profileFromCoordinates(lat, lon) {
  const distanceFromEquator = Math.min(1, Math.abs(lat) / 70)
  const coastalOffset = Math.abs(Math.sin((lon * Math.PI) / 180)) * 0.8
  return {
    id: `point-${lat.toFixed(2)}-${lon.toFixed(2)}`,
    label: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    lat,
    lon,
    base: roundOne(29 - distanceFromEquator * 18 - coastalOffset * 2),
    amplitude: roundOne(2.2 + distanceFromEquator * 8.5 - coastalOffset),
    range: roundOne(2.3 + distanceFromEquator * 2.6),
    volatility: roundOne(0.62 + distanceFromEquator * 0.58),
    warming: roundOne(0.65 + distanceFromEquator * 0.45),
    seed: Math.abs(lat * 0.17 + lon * 0.03) % 9,
    derived: true,
  }
}

function dayFromDate(date) {
  return Math.round((date - START_DATE) / DAY_MS)
}

function dateFromDay(day) {
  return new Date(START_DATE + day * DAY_MS)
}

function formatMonthTick(day) {
  const date = dateFromDay(day)
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })
  return date.getUTCDate() <= 2 ? month : ""
}

function formatTemperature(value) {
  if (value == null || !Number.isFinite(value)) return "Unavailable"
  return `${roundOne(value)} C`
}

function formatSigned(value) {
  const rounded = roundOne(value)
  return `${rounded > 0 ? "+" : ""}${rounded} C`
}

function roundOne(value) {
  return Math.round(value * 10) / 10
}

const styles = {
  lede: {
    color: "var(--text-secondary)",
    fontSize: "17px",
    maxWidth: "790px",
  },
  visualPanel: {
    margin: "28px 0 34px",
  },
  chartContent: {
    width: "100%",
    padding: "18px",
    boxSizing: "border-box",
    color: "var(--semiotic-text)",
  },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "20px",
  },
  locationGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  locationButton: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--semiotic-border)",
    borderRadius: "var(--semiotic-border-radius)",
    background: "var(--semiotic-surface)",
    color: "var(--semiotic-text)",
    padding: "8px 10px",
    font: "inherit",
    fontSize: "13px",
    lineHeight: 1.2,
    cursor: "pointer",
  },
  locationButtonActive: {
    borderColor: "var(--semiotic-primary)",
    color: "var(--semiotic-primary)",
  },
  searchForm: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  input: {
    minWidth: "190px",
    border: "1px solid var(--semiotic-border)",
    borderRadius: "var(--semiotic-border-radius)",
    background: "var(--semiotic-bg)",
    color: "var(--semiotic-text)",
    padding: "8px 10px",
    font: "inherit",
    fontSize: "13px",
  },
  coordInput: {
    width: "100px",
    border: "1px solid var(--semiotic-border)",
    borderRadius: "var(--semiotic-border-radius)",
    background: "var(--semiotic-bg)",
    color: "var(--semiotic-text)",
    padding: "8px 10px",
    font: "inherit",
    fontSize: "13px",
  },
  actionButton: {
    border: "1px solid var(--semiotic-primary)",
    borderRadius: "var(--semiotic-border-radius)",
    background: "var(--semiotic-primary)",
    color: "var(--semiotic-bg)",
    padding: "8px 11px",
    font: "inherit",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid var(--semiotic-border)",
    borderRadius: "var(--semiotic-border-radius)",
    background: "transparent",
    color: "var(--semiotic-text)",
    padding: "8px 11px",
    font: "inherit",
    fontSize: "13px",
    cursor: "pointer",
  },
  temperatureReadout: {
    display: "grid",
    justifyItems: "end",
    lineHeight: 1.1,
    flexShrink: 0,
  },
  temperatureValue: {
    fontSize: "18px",
    fontWeight: 800,
    whiteSpace: "nowrap",
    color: "var(--semiotic-text)",
  },
  temperatureLabel: {
    color: "var(--semiotic-text-secondary)",
    fontSize: "12px",
    textTransform: "uppercase",
    fontWeight: 700,
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "14px 18px",
    alignItems: "center",
    color: "var(--semiotic-text-secondary)",
    fontSize: "13px",
    marginTop: "12px",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    whiteSpace: "nowrap",
  },
  hatchSwatch: {
    width: "32px",
    height: "10px",
    border: "1px solid var(--semiotic-border)",
    background:
      "repeating-linear-gradient(45deg, transparent 0 4px, var(--semiotic-text-secondary) 4px 5px, transparent 5px 8px)",
    opacity: 0.6,
  },
  lineSwatch: {
    width: "32px",
    height: "4px",
    background: "var(--semiotic-text)",
    borderRadius: "10px",
  },
  forecastHatchSwatch: {
    width: "32px",
    height: "10px",
    border: "1px solid var(--semiotic-border)",
    backgroundColor: "var(--semiotic-bg)",
    backgroundImage:
      "repeating-linear-gradient(45deg, transparent 0 3px, var(--semiotic-danger) 3px 5px, transparent 5px 7px), repeating-linear-gradient(45deg, transparent 0 3px, var(--semiotic-info) 3px 5px, transparent 5px 7px)",
    backgroundSize: "50% 100%, 50% 100%",
    backgroundPosition: "left, right",
    backgroundRepeat: "no-repeat",
  },
  fillSwatch: {
    width: "32px",
    height: "10px",
  },
  banner: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "11px 16px",
    background: "color-mix(in srgb, var(--semiotic-primary) 9%, var(--semiotic-bg))",
    borderBottom: "1px solid var(--semiotic-border)",
    color: "var(--semiotic-text)",
  },
  bannerSlow: {
    background: "color-mix(in srgb, #d97706 12%, var(--semiotic-bg))",
  },
  bannerLive: {
    background: "color-mix(in srgb, #16a34a 10%, var(--semiotic-bg))",
  },
  bannerIcon: {
    display: "grid",
    placeItems: "center",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    flex: "0 0 auto",
    background: "var(--semiotic-bg)",
    border: "1px solid var(--semiotic-border)",
    color: "var(--semiotic-primary)",
    fontSize: "13px",
    fontWeight: 800,
  },
  bannerCopy: {
    display: "grid",
    gap: "1px",
    minWidth: 0,
    flex: "1 1 260px",
  },
  bannerTitle: {
    fontSize: "13px",
    lineHeight: 1.35,
  },
  bannerMessage: {
    color: "var(--semiotic-text-secondary)",
    fontSize: "12px",
    lineHeight: 1.4,
  },
  bannerActions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: "6px",
  },
  bannerActionButton: {
    border: "1px solid var(--semiotic-primary)",
    borderRadius: "var(--semiotic-border-radius)",
    background: "var(--semiotic-primary)",
    color: "var(--semiotic-bg)",
    padding: "7px 11px",
    font: "inherit",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  bannerSecondaryButton: {
    border: "1px solid var(--semiotic-border)",
    borderRadius: "var(--semiotic-border-radius)",
    background: "var(--semiotic-bg)",
    color: "var(--semiotic-text)",
    padding: "6px 8px",
    font: "inherit",
    fontSize: "11px",
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  sourceNote: {
    color: "var(--text-secondary)",
    fontSize: "14px",
  },
  sourceLink: {
    color: "var(--accent)",
  },
}
