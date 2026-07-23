import React, { useMemo } from "react"
import { OrdinalCustomChart } from "semiotic/ordinal"
import { TemporalHistogram } from "semiotic/realtime"
// CircularBrush: the accessible cyclical range-brush control (keyboard +
// wrap-around drag), now a first-class Semiotic control instead of ~200 lines of
// hand-rolled SVG + pointer math.
import { CircularBrush } from "semiotic"
// Custom-chart authoring kit — the radial coordinate helpers, cyclical (day-of-
// year) range select, run-length encoding, the hit-target node that earns this
// hand-built radial layout keyboard nav + annotation anchoring, and the SVG
// legend renderer.
import {
  angleScale,
  radiusScale,
  polarToXY,
  ringArcPath,
  hitTargetPoint,
  runs,
  selectCyclicRange,
  legendSwatches,
} from "semiotic/recipes"

const DAYS = 365
const DAY_MS = 86_400_000
const TAU = Math.PI * 2
// day-of-year → angle (0 = Jan 1 at the top, clockwise) and temperature → radius
// on the chart's custom [-10, 110] domain — the two independent radial channels.
const dayAngle = angleScale([0, DAYS])

// A domain-specific weather palette (record/average/condition hues) painted on a
// fixed dark display — art direction this example owns rather than theme tokens.
// The custom-layout *decoration* it draws via the recipe kit (axes, the legendSwatches
// legend) still resolves --semiotic-* defaults, and CircularBrush is a themed
// control; the data colors below are the deliberate editorial layer.
const colors = {
  record: "#b8ddd6",
  average: "#3fa39e",
  within: "#445e5b",
  beyond: "#f97f5a",
  freeze: "#a8dfe4",
  rain: "#209cd3",
  clear: "#fbf6ec",
  scattered: "#d4d4d4",
  cloudy: "#a1a1a1",
  overcast: "#616161",
  text: "#111111",
  tealText: "#2f837b",
}

const monthStarts = [
  { label: "Jan", day: 0 },
  { label: "Feb", day: 31 },
  { label: "Mar", day: 59 },
  { label: "Apr", day: 90 },
  { label: "May", day: 120 },
  { label: "Jun", day: 151 },
  { label: "Jul", day: 181 },
  { label: "Aug", day: 212 },
  { label: "Sep", day: 243 },
  { label: "Oct", day: 273 },
  { label: "Nov", day: 304 },
  { label: "Dec", day: 334 },
]

const weatherData = buildWeatherData()

const RADIAL = {
  tempOuterRadius: 205,
  weatherOuterRadius: 250,
}

const RADIAL_CHART = {
  width: 420,
  height: 420,
  margin: { top: 12, right: 12, bottom: 12, left: 12 },
}

export function RadialWeatherOrdinalChart({
  brush,
  setBrush,
  selectedLabel,
  weather = weatherData,
}) {
  const plot = {
    width: RADIAL_CHART.width - RADIAL_CHART.margin.left - RADIAL_CHART.margin.right,
    height: RADIAL_CHART.height - RADIAL_CHART.margin.top - RADIAL_CHART.margin.bottom,
  }
  const controlRadius = RADIAL.weatherOuterRadius * radialScale(plot)

  return (
    <div style={styles.chartColumn}>
      <SemioticOrdinalControlLayer width={RADIAL_CHART.width} height={RADIAL_CHART.height}>
        <OrdinalCustomChart
          data={weather.rows}
          projection="radial"
          categoryAccessor="date"
          valueAccessor="span"
          layout={radialWeatherOrdinalLayout}
          layoutConfig={{
            rows: weather.rows,
            conditionRuns: weather.conditionRuns,
          }}
          width={RADIAL_CHART.width}
          height={RADIAL_CHART.height}
          margin={RADIAL_CHART.margin}
          showAxes={false}
          enableHover
          frameProps={{
            background: "transparent",
          }}
        />
        <CircularBrush
          value={brush}
          onChange={setBrush}
          period={DAYS}
          width={RADIAL_CHART.width}
          height={RADIAL_CHART.height}
          radius={controlRadius}
          arcFill="var(--semiotic-primary)"
          stroke="var(--semiotic-text)"
          label="Date range"
          formatValue={formatDateLabel}
          // Absolute overlay so the brush layers on top of the radial chart
          // (sharing its coordinate space) instead of stacking below it in flow.
          style={styles.controlSvg}
        />
      </SemioticOrdinalControlLayer>
      <div style={styles.selectedLabel}>{selectedLabel}</div>
    </div>
  )
}

function SemioticOrdinalControlLayer({ width, height, children }) {
  return <div style={{ ...styles.controlLayer, width, height }}>{children}</div>
}

function radialWeatherOrdinalLayout(ctx) {
  const scale = radialScale(ctx.dimensions.plot)
  const rows = ctx.config.rows || ctx.data
  const conditionRuns = ctx.config.conditionRuns || weatherData.conditionRuns

  return {
    nodes: ctx.data.map((row) => radialHitTarget(row, scale)),
    overlays: (
      <g
        transform={`translate(${ctx.dimensions.plot.width / 2},${ctx.dimensions.plot.height / 2})`}
      >
        <RadialWeatherOverlay
          rows={rows}
          conditionRuns={conditionRuns}
          scale={scale}
        />
      </g>
    ),
  }
}

function radialHitTarget(row, scale) {
  const p = polar(row.day, row.avgHigh)
  // hitTargetPoint emits the transparent, keyboard-navigable, annotation-
  // anchorable point node — replacing the rgba(0,0,0,0) + opacity:0 + pointId +
  // _transitionKey boilerplate. The visible glyph is drawn in `overlays`.
  return hitTargetPoint({ x: p.x * scale, y: p.y * scale, r: 5, datum: row, id: `weather-day-${row.day}` })
}

function radialScale(plot) {
  return Math.min(plot.width, plot.height) / (RADIAL.weatherOuterRadius * 2 + 18)
}

function RadialWeatherOverlay({ rows, conditionRuns, scale }) {
  const radialLines = rows.flatMap((row) => radialTemperatureMarks(row))
  const axisTemps = [0, 32, 60, 80, 100]

  return (
    <g transform={`scale(${scale})`} style={{ pointerEvents: "none" }}>
      {[40, 60, 80, 100].map((temp) => (
        <circle
          key={`record-axis-${temp}`}
          r={tempRadius(temp)}
          fill="none"
          stroke={colors.record}
          strokeWidth="1.2"
          opacity="0.95"
        />
      ))}

      {axisTemps.map((temp) => (
        <circle
          key={`white-axis-${temp}`}
          r={tempRadius(temp)}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1"
          opacity="0.9"
        />
      ))}

      {monthStarts.map((month) => {
        const outer = polar(month.day, 119)
        return (
          <line
            key={`month-axis-${month.label}`}
            x1="0"
            y1="0"
            x2={outer.x}
            y2={outer.y}
            stroke="#ffffff"
            strokeWidth="1"
            opacity="0.75"
          />
        )
      })}

      {radialLines.map((mark) => (
        <line
          key={mark.key}
          x1={mark.x1}
          y1={mark.y1}
          x2={mark.x2}
          y2={mark.y2}
          stroke={mark.stroke}
          strokeWidth={mark.strokeWidth}
          opacity={mark.opacity}
        />
      ))}

      {conditionRuns.cloud.map((run, index) => (
        <path
          key={`cloud-${index}`}
          d={ringArc(run.start, run.end, 238, 246)}
          fill={colors[run.category] || colors.scattered}
        />
      ))}
      {conditionRuns.rain.map((run, index) => (
        <path key={`rain-${index}`} d={ringArc(run.start, run.end, 228, 236)} fill={colors.rain} />
      ))}
      {conditionRuns.freeze.map((run, index) => (
        <path
          key={`freeze-${index}`}
          d={ringArc(run.start, run.end, 216, 224)}
          fill={colors.freeze}
        />
      ))}

      {monthStarts
        .filter((_, i) => i % 3 === 0)
        .map((month) => {
          const p = polar(month.day, 266)
          return (
            <text
              key={`month-label-${month.label}`}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={colors.tealText}
              fontSize="14"
            >
              {month.label}
            </text>
          )
        })}

      {axisTemps.map((temp) => {
        const p = polar(320, temp)
        return (
          <text
            key={`temp-label-${temp}`}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={colors.tealText}
            fontSize="12"
          >
            {temp}
            {"°"}
          </text>
        )
      })}

      <circle r="4" fill={colors.average} />
    </g>
  )
}

// The shared `CircularBrush` control owns the brush arc, wedge handles,
// pointer capture, wrap-around day math, and keyboard nudging.

export function WeatherLegend({
  title = "New York",
  subtitle = "Historical Weather Data",
  comparisonLabel = "This Year",
  textColor = colors.text,
}) {
  const legendItems = [
    ["Record", colors.record],
    ["Average", colors.average],
    [`${comparisonLabel} - within avg`, colors.within],
    [`${comparisonLabel} - beyond avg`, colors.beyond],
    ["Freezing", colors.freeze],
    ["Precipitation", colors.rain],
    ["Scattered Clouds", colors.scattered],
    ["Cloudy", colors.cloudy],
    ["Overcast", colors.overcast],
  ]

  return (
    <g transform="translate(28,46)">
      <text x="0" y="0" fontSize="30" fill={textColor}>
        {title}
      </text>
      <text x="0" y="48" fontSize="18" fill={textColor}>
        {subtitle}
      </text>
      {/* legendSwatches: the portable SVG legend from the recipe decoration kit. */}
      {legendSwatches({
        x: 0,
        y: 62,
        orientation: "vertical",
        swatchSize: 18,
        gap: 6,
        labelGap: 12,
        fontSize: 18,
        color: textColor,
        entries: legendItems.map(([label, fill]) => ({ label, color: fill })),
      })}
    </g>
  )
}

export function LinearDetail({ rows, conditions, textColor = colors.text }) {
  const width = 320
  const xStep = width / Math.max(rows.length, 1)
  const clouds = runsFromSelected(conditions, "cloud")
  const rain = booleanRunsFromSelected(conditions, "rain")
  const freeze = booleanRunsFromSelected(conditions, "freeze")
  const first = rows[0]
  const last = rows[rows.length - 1]
  const { upperLayers, lowerLayers, valueExtent } = useMemo(() => {
    const upperRecord = []
    const upperAverage = []
    const upperCurrent = []
    const lowerRecord = []
    const lowerAverage = []
    const lowerCurrent = []
    let maxDistance = 1

    const addSegment = (target, time, value, category, row) => {
      if (!(value > 0)) return
      target.push({
        time,
        value,
        category,
        date: row.date,
      })
    }

    rows.forEach((row, index) => {
      const time = index * DAY_MS
      const center = row.avgMean ?? (row.avgLow + row.avgHigh) / 2
      const upperRecordValue = Math.max(0, row.recHigh - center)
      const upperAverageValue = Math.max(0, row.avgHigh - center)
      const lowerRecordValue = Math.max(0, center - row.recLow)
      const lowerAverageValue = Math.max(0, center - row.avgLow)

      upperRecord.push({
        time,
        value: upperRecordValue,
        date: row.date,
      })
      upperAverage.push({
        time,
        value: upperAverageValue,
        date: row.date,
      })
      lowerRecord.push({
        time,
        value: lowerRecordValue,
        date: row.date,
      })
      lowerAverage.push({
        time,
        value: lowerAverageValue,
        date: row.date,
      })

      if (row.min != null && row.max != null) {
        const upperOffset = Math.max(0, row.min - center)
        const upperWithin = Math.max(0, Math.min(row.max, row.avgHigh) - Math.max(row.min, center))
        const upperBeyond = Math.max(0, row.max - Math.max(row.min, row.avgHigh, center))
        addSegment(upperCurrent, time, upperOffset, "Offset", row)
        addSegment(upperCurrent, time, upperWithin, "Within average", row)
        addSegment(upperCurrent, time, upperBeyond, "Above average", row)

        const lowerOffset = Math.max(0, center - row.max)
        const lowerWithin = Math.max(0, Math.min(row.max, center) - Math.max(row.min, row.avgLow))
        const lowerBeyond = Math.max(0, Math.min(row.max, row.avgLow) - row.min)
        addSegment(lowerCurrent, time, lowerOffset, "Offset", row)
        addSegment(lowerCurrent, time, lowerWithin, "Within average", row)
        addSegment(lowerCurrent, time, lowerBeyond, "Below average", row)
      }

      maxDistance = Math.max(
        maxDistance,
        upperRecordValue,
        lowerRecordValue,
        row.max == null ? 0 : Math.max(0, row.max - center),
        row.min == null ? 0 : Math.max(0, center - row.min),
      )
    })

    return {
      upperLayers: [
        { data: upperRecord, fill: colors.record },
        { data: upperAverage, fill: colors.average },
        {
          data: upperCurrent,
          categoryAccessor: "category",
          colors: {
            Offset: "rgba(0,0,0,0)",
            "Within average": colors.within,
            "Above average": colors.beyond,
          },
        },
      ],
      lowerLayers: [
        { data: lowerRecord, fill: colors.record },
        { data: lowerAverage, fill: colors.average },
        {
          data: lowerCurrent,
          categoryAccessor: "category",
          colors: {
            Offset: "rgba(0,0,0,0)",
            "Within average": colors.within,
            "Below average": colors.beyond,
          },
        },
      ],
      valueExtent: [0, Math.ceil(maxDistance / 5) * 5],
    }
  }, [rows])
  // Stable refs: these props spread into all six stacked TemporalHistogram
  // layers, so fresh objects every render would re-diff each instance on every
  // parent re-render (hover updates the readout above).
  const timeExtent = useMemo(
    () => (rows.length ? [0, Math.max(DAY_MS, rows.length * DAY_MS)] : [0, DAY_MS]),
    [rows.length],
  )
  const histogramProps = useMemo(
    () => ({
      binSize: DAY_MS,
      timeAccessor: "time",
      valueAccessor: "value",
      width,
      height: 42,
      margin: { top: 0, right: 2, bottom: 0, left: 2 },
      timeExtent,
      valueExtent,
      showAxes: false,
      background: "transparent",
      enableHover: true,
      gap: 0,
      emptyContent: false,
    }),
    [width, timeExtent, valueExtent],
  )

  return (
    <div style={styles.linearDetail}>
      <div style={{ ...styles.linearDateRow, color: textColor }}>
        <span>{formatDateLabel(first?.day)}</span>
        <span>{formatDateLabel(last?.day)}</span>
      </div>
      <svg viewBox={`0 0 ${width} 28`} style={styles.conditionStripSvg} aria-hidden="true">
        {clouds.map((run, index) => (
          <rect
            key={`linear-cloud-${index}`}
            x={run.start * xStep}
            y="0"
            width={Math.max(1, (run.end - run.start + 1) * xStep)}
            height="5"
            fill={colors[run.category] || colors.scattered}
          />
        ))}
        {rain.map((run, index) => (
          <rect
            key={`linear-rain-${index}`}
            x={run.start * xStep}
            y="10"
            width={Math.max(1, (run.end - run.start + 1) * xStep)}
            height="5"
            fill={colors.rain}
          />
        ))}
        {freeze.map((run, index) => (
          <rect
            key={`linear-freeze-${index}`}
            x={run.start * xStep}
            y="20"
            width={Math.max(1, (run.end - run.start + 1) * xStep)}
            height="5"
            fill={colors.freeze}
          />
        ))}
      </svg>
      <div style={styles.temporalHistogramStack}>
        <LayeredTemporalHistogram layers={upperLayers} histogramProps={histogramProps} />
        <LayeredTemporalHistogram
          layers={lowerLayers}
          histogramProps={histogramProps}
          direction="down"
        />
      </div>
    </div>
  )
}

// TemporalHistogram natively supports BOTH a categorical stack (`categoryAccessor`
// + `colors`) and a mirrored `direction="down"` half — the "current" layer below
// is one stacked histogram (Offset/Within/Above), and the diverging lower half is
// just `direction="down"`. What's bespoke here is *overlaying* the record/average
// envelope bands behind that stacked layer (taller bands sit behind, not summed),
// so we composite a few instances sharing one `timeExtent`/`valueExtent` to keep
// them pixel-aligned. That shared-extent overlay is the pattern; the stacking and
// mirroring are the component's own.
function LayeredTemporalHistogram({ layers, histogramProps, direction = "up" }) {
  return (
    <div style={styles.temporalHistogramHalf}>
      {layers.map((layer, index) => (
        <div key={`${direction}-histogram-layer-${index}`} style={styles.temporalHistogramLayer}>
          <TemporalHistogram
            {...histogramProps}
            {...layer}
            direction={direction}
            enableHover={index === layers.length - 1}
          />
        </div>
      ))}
    </div>
  )
}

function radialTemperatureMarks(row) {
  const marks = [
    radialLine(row.day, row.recLow, row.recHigh, colors.record, 1.4, 0.92, `record-${row.day}`),
    radialLine(row.day, row.avgLow, row.avgHigh, colors.average, 1.8, 0.48, `avg-${row.day}`),
  ]

  if (row.max == null) return marks
  if (row.max > row.avgHigh) {
    marks.push(radialLine(row.day, row.avgHigh, row.max, colors.beyond, 2, 0.95, `hot-${row.day}`))
  }
  if (row.min < row.avgLow) {
    marks.push(radialLine(row.day, row.min, row.avgLow, colors.beyond, 2, 0.95, `cold-${row.day}`))
  }
  const withinLow = Math.max(row.min, row.avgLow)
  const withinHigh = Math.min(row.max, row.avgHigh)
  if (withinHigh >= withinLow) {
    marks.push(
      radialLine(row.day, withinLow, withinHigh, colors.within, 2, 0.95, `year-${row.day}`),
    )
  }
  return marks
}

function radialLine(day, low, high, stroke, strokeWidth, opacity, key) {
  const p1 = polar(day, low)
  const p2 = polar(day, high)
  return { key, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke, strokeWidth, opacity }
}

export function buildWeatherData(profile = {}) {
  const baseShift = profile.baseShift ?? 0
  const amplitudeScale = profile.amplitudeScale ?? 1
  const volatilityScale = profile.volatilityScale ?? 1
  const warming = profile.warming ?? 0
  const seed = profile.seed ?? 0
  const rows = Array.from({ length: DAYS }, (_, day) => {
    const season = Math.sin(((day - 104) / DAYS) * TAU)
    const shoulder = Math.sin(((day + 20 + seed) / DAYS) * TAU * 2)
    const avgLow = Math.round(43 + baseShift + season * 26 * amplitudeScale + shoulder * 2.2)
    const avgHigh = Math.round(avgLow + 13 + Math.max(0, season) * 5)
    const recLow = Math.round(avgLow - 16 - deterministic(day, 2) * 17)
    const recHigh = Math.round(avgHigh + 16 + deterministic(day, 5) * 18)
    const hasActual = day <= 285
    const anomaly =
      warming +
      volatilityScale *
        (7 * Math.sin(day * 0.045 + 0.8 + seed * 0.03) +
          4.5 * Math.sin(day * 0.19 + seed * 0.07) +
          eventPulse(day))
    const min = hasActual ? Math.round(avgLow + anomaly - 1.5 + deterministic(day, 8) * 5) : null
    const max = hasActual ? Math.round(avgHigh + anomaly + deterministic(day, 13) * 7) : null
    const span = Math.max(1, recHigh - recLow)
    return { day, date: formatDateLabel(day), avgLow, avgHigh, recLow, recHigh, min, max, span }
  })

  const conditions = rows.map((row) => {
    const winter = row.day < 78 || row.day > 330
    const spring = row.day >= 78 && row.day < 150
    const rain = deterministic(row.day, 21) > (spring ? 0.64 : 0.76)
    const freeze = row.avgLow < 34 && deterministic(row.day, 34) > 0.22
    const cloudRoll = deterministic(row.day, 55)
    const cloud =
      cloudRoll > 0.82
        ? "overcast"
        : cloudRoll > 0.62
          ? "cloudy"
          : cloudRoll > 0.38
            ? "scattered"
            : "clear"
    return { day: row.day, rain, freeze: winter ? freeze : false, cloud }
  })

  return {
    rows,
    conditions,
    conditionRuns: {
      cloud: runsForCalendar(conditions, "cloud"),
      rain: runsForCalendar(
        conditions.filter((d) => d.rain),
        "rain",
      ),
      freeze: runsForCalendar(
        conditions.filter((d) => d.freeze),
        "freeze",
      ),
    },
  }
}

function eventPulse(day) {
  return (
    -14 * pulse(day, 47, 7) +
    10 * pulse(day, 92, 8) +
    13 * pulse(day, 190, 18) +
    8 * pulse(day, 246, 12)
  )
}

function pulse(day, center, spread) {
  return Math.exp(-Math.pow(day - center, 2) / (2 * spread * spread))
}

function deterministic(day, seed) {
  const value = Math.sin((day + 1) * 12.9898 + seed * 78.233) * 43758.5453
  return value - Math.floor(value)
}

// Run-length encode a per-day categorical field into drawable runs (the
// condition rings + linear strip). The calendar variant keys runs by
// day-of-year with a half-open [start, end); the selected variants key by array
// index with an inclusive end (what the linear strip's rect width expects).
function runsForCalendar(days, field) {
  return runs(days, (d) => d[field], { coord: (d) => d.day, step: 1 }).map((r) => ({
    start: r.start,
    end: r.end,
    category: r.value,
  }))
}

function runsFromSelected(days, field) {
  return runs(days, (d) => d[field]).map((r) => ({
    start: r.startIndex,
    end: r.endIndex,
    category: r.value,
  }))
}

function booleanRunsFromSelected(days, field) {
  return runs(days, (d) => !!d[field], { truthyOnly: true }).map((r) => ({
    start: r.startIndex,
    end: r.endIndex,
    category: true,
  }))
}

// Cyclical range select over day-of-year — handles a brush that wraps past the
// year boundary (e.g. Dec → Feb), returning the two arcs in reading order.
export function selectRows(rows, brush) {
  return selectCyclicRange(rows, (row) => row.day, brush.start, brush.end)
}

// temperature → radius on the chart's custom [-10, 110] domain (radiusScale is
// the radial analogue of a y-scale).
const tempRadiusScale = radiusScale([-10, 110], [0, RADIAL.tempOuterRadius])

function polar(day, tempOrRadius) {
  const radius = tempOrRadius > 120 ? tempOrRadius : tempRadius(tempOrRadius)
  return polarToXY(dayAngle(day), radius)
}

function tempRadius(temp) {
  return tempRadiusScale(temp)
}

function ringArc(startDay, endDay, innerRadius, outerRadius) {
  // ringArcPath: the annular-sector path builder from the radial kit, in place
  // of a hand-configured d3.arc generator.
  return ringArcPath(dayAngle(startDay), dayAngle(endDay), innerRadius, outerRadius)
}

export function formatDateLabel(day) {
  if (day == null) return ""
  const date = new Date(Date.UTC(2015, 0, 1 + day))
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })
  return `${date.getUTCDate()}-${month}`
}

const styles = {
  linearDetail: {
    width: "320px",
    margin: "4px 0 0 24px",
  },
  linearDateRow: {
    display: "flex",
    justifyContent: "space-between",
    color: colors.text,
    fontSize: "18px",
    lineHeight: 1.2,
    marginBottom: "8px",
  },
  conditionStripSvg: {
    display: "block",
    width: "100%",
    height: "28px",
    marginBottom: "8px",
  },
  temporalHistogramStack: {
    display: "grid",
    gridTemplateRows: "42px 42px",
    gap: 0,
    width: "320px",
  },
  temporalHistogramHalf: {
    position: "relative",
    width: "320px",
    height: "42px",
  },
  temporalHistogramLayer: {
    position: "absolute",
    inset: 0,
    width: "320px",
    height: "42px",
  },
  chartColumn: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: 0,
  },
  controlLayer: {
    position: "relative",
    flex: "0 0 auto",
  },
  controlSvg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    overflow: "visible",
    pointerEvents: "auto",
  },
  selectedLabel: {
    color: colors.tealText,
    fontSize: "13px",
    marginTop: "-2px",
    minHeight: "18px",
    textAlign: "center",
  },
}
