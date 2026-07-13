import React, { useEffect, useMemo, useRef, useState } from "react"
import { DirectManipulationControl, TemporalHistogram } from "semiotic"
import { StreamGeoFrame } from "semiotic/geo"
import { unwrapDatum } from "semiotic/recipes"
import { XYCustomChart } from "semiotic/xy"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  CEDAR_BEND_AREA,
  DAILY_GLOBAL_MEANS,
  DAY_COUNT,
  GRID_COLUMNS,
  MAP_CELLS,
  boundaryX,
  boundaryY,
  calculateLine,
  calculateMap,
  calculateSpaceTime,
  checksum,
  clamp,
  fromCedarBendCoordinate,
  toCedarBendCoordinate,
} from "./data/maupWorld"
import "./WhereYouDrawTheLineExamplePage.css"

const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 })

function paletteForTheme(theme) {
  return theme === "light"
    ? { paper: "#f3eee1", paperDeep: "#e6ddc9", ink: "#1d2925", muted: "#68726b", field: "#267b78", cut: "#c8472d", threshold: "#b58417", high: "#8f3827", low: "#bfd7ca" }
    : { paper: "#111d1b", paperDeep: "#1b302c", ink: "#dce9e2", muted: "#9dafaa", field: "#55c8c0", cut: "#ff7558", threshold: "#f6c453", high: "#ee826e", low: "#2e7771" }
}

function visibleRect({ x, y, w, h, fill, fillOpacity = 1, datum, id, group }) {
  return { type: "rect", x, y, w, h, roundedTop: 3, style: { fill, fillOpacity }, datum, group, _transitionKey: id }
}

function overlayPoint(event) {
  const svg = event.currentTarget.ownerSVGElement
  if (!svg?.createSVGPoint || !event.currentTarget.getScreenCTM()) return { x: 0, y: 0 }
  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY
  return point.matrixTransform(event.currentTarget.getScreenCTM().inverse())
}

function MetricLedger({ result, label = "population", changed = "partition moved" }) {
  const direction = result.assignedShare - result.rawShare
  return (
    <div className="maup-ledger" aria-label={`${label} aggregation ledger`}>
      <div className="maup-ledger__item"><span>field</span><strong>unchanged</strong></div>
      <div className="maup-ledger__item"><span>weight</span><strong>unchanged</strong></div>
      <div className="maup-ledger__item maup-ledger__item--changed"><span>state</span><strong>{changed}</strong></div>
      <div className="maup-ledger__item maup-ledger__item--result"><span>raw high</span><strong>{percent.format(result.rawShare)}</strong></div>
      <div className="maup-ledger__item maup-ledger__item--result"><span>assigned high</span><strong>{percent.format(result.assignedShare)}</strong></div>
      <div className="maup-ledger__delta">
        {Math.abs(direction) < 0.005 ? "aggregation happened to preserve this share" : `${direction > 0 ? "+" : ""}${percent.format(direction)} from grouping alone`}
      </div>
    </div>
  )
}

function LiveSentence({ children }) {
  return <p className="maup-live-sentence">{children}</p>
}

function LineField({ result, threshold, onCut, width }) {
  const layout = useMemo(
    () => (ctx) => {
      const { width: plotWidth, height: plotHeight } = ctx.dimensions.plot
      const x = ctx.scales.x
      const y = ctx.scales.y
      const field = ctx.resolveColor("continuous-field")
      const low = ctx.theme.semantic.info ?? ctx.resolveColor("below-threshold")
      const high = ctx.theme.semantic.danger ?? ctx.resolveColor("above-threshold")
      const warning = ctx.theme.semantic.warning ?? ctx.resolveColor("threshold")
      const text = ctx.theme.semantic.text ?? "currentColor"
      const secondary = ctx.theme.semantic.textSecondary ?? text
      const baseline = y(35)
      const nodes = [
        ...result.zones.map((zone, index) => {
          const start = result.cuts[index]
          const end = result.cuts[index + 1]
          return visibleRect({
            x: x(start), y: 0, w: x(end) - x(start), h: baseline,
            fill: zone.mean >= threshold ? high : low, fillOpacity: 0.17,
            datum: { ...zone, start, end, kind: "interval" }, id: `line-zone-${zone.id}`,
            group: zone.mean >= threshold ? "high interval" : "below interval",
          })
        }),
        ...result.samples.filter((_, index) => index % 4 === 0).map((sample) => visibleRect({
          x: x(sample.x) - 0.6, y: baseline + 5, w: 1.2, h: 6 + sample.weight * 6,
          fill: field, fillOpacity: 0.48, datum: { ...sample, kind: "population weight" },
          id: `line-rug-${sample.x}`, group: "population weight",
        })),
      ]
      const linePath = result.samples.map((sample, index) => `${index === 0 ? "M" : "L"}${x(sample.x).toFixed(1)},${y(sample.value).toFixed(1)}`).join(" ")
      return {
        nodes,
        overlays: (
          <g>
            <line x1="0" x2={plotWidth} y1={baseline} y2={baseline} stroke={secondary} strokeOpacity="0.7" />
            <line x1="0" x2={plotWidth} y1={y(threshold)} y2={y(threshold)} stroke={warning} strokeDasharray="5 5" strokeWidth="2" />
            <text x={plotWidth - 4} y={y(threshold) - 8} textAnchor="end" fill={secondary} className="maup-svg-small-label">decision threshold {threshold}</text>
            <path d={linePath} fill="none" stroke={field} strokeWidth="4" strokeLinejoin="round" />
            {result.cuts.slice(1, -1).map((cut, index) => <line key={cut} x1={x(cut)} x2={x(cut)} y1="0" y2={baseline} stroke={index === 0 ? high : secondary} strokeWidth={index === 0 ? "3" : "1"} strokeDasharray={index === 0 ? "0" : "3 5"} strokeOpacity={index === 0 ? "1" : "0.55"} />)}
            {result.zones.map((zone, index) => <text key={zone.id} x={(x(result.cuts[index]) + x(result.cuts[index + 1])) / 2} y="21" textAnchor="middle" fill={text} className="maup-svg-small-label">{decimal.format(zone.mean)} {zone.mean >= threshold ? "HIGH" : "below"}</text>)}
            <DirectManipulationControl
              className="maup-handle"
              controlType="partition-boundary"
              x={x(result.cut)}
              y={14}
              value={result.cut}
              min={0.2}
              max={0.58}
              step={0.01}
              onChange={onCut}
              pointerToValue={(event) => overlayPoint(event).x / plotWidth}
              label="First interval boundary"
              valueText={`Boundary at ${decimal.format(result.cut)}`}
              stroke={high}
              labelText="move this cut"
              labelDx={0}
              labelDy={-16}
              labelClassName="maup-svg-cut-label"
            />
            <text x="0" y={plotHeight - 5} fill={secondary} className="maup-svg-small-label">continuous heat score</text>
            <text x={plotWidth} y={plotHeight - 5} textAnchor="end" fill={secondary} className="maup-svg-small-label">fixed population weight shown as rug</text>
          </g>
        ),
      }
    },
    [onCut, result, threshold],
  )
  return (
    <XYCustomChart
      className="maup-semiotic-frame maup-line-frame"
      data={result.samples}
      layout={layout}
      width={width}
      height={272}
      xExtent={[0, 1]}
      yExtent={[35, 93]}
      margin={{ top: 28, right: 30, bottom: 28, left: 40 }}
      enableHover
      accessibleTable
      description="A continuous heat line divided into intervals. Drag the orange cut to change which samples are averaged together."
      summary={`${result.bins} intervals, ${percent.format(result.rawShare)} raw high, and ${percent.format(result.assignedShare)} assigned high.`}
      tooltip={(datum) => {
        const record = unwrapDatum(datum)
        return record.kind === "interval" ? <strong>{decimal.format(record.mean)} average heat in this interval</strong> : <span>{decimal.format(record.value)} heat score</span>
      }}
      frameProps={{ background: "transparent" }}
    />
  )
}

function projectPath(projection, points) {
  const path = points.map(([x, y], index) => {
    const projected = projection(toCedarBendCoordinate(x, y))
    return `${index === 0 ? "M" : "L"}${projected[0].toFixed(1)},${projected[1].toFixed(1)}`
  })
  return path.join(" ")
}

function StreamGeoMaupMap({ result, threshold, onSeam, width, compact = false, palette }) {
  const frameRef = useRef(null)
  const [projection, setProjection] = useState(null)
  const height = compact ? Math.max(190, Math.round(width * 0.53)) : Math.max(330, Math.round(width * 0.56))
  const cells = useMemo(
    () => result.cells.map((cell) => {
      const zone = result.zoneById.get(cell.zoneId)
      return { ...cell, districtMean: zone.mean, districtLabel: zone.mean >= threshold ? "high" : "below threshold" }
    }),
    [result, threshold],
  )

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const next = frameRef.current?.getProjection?.()
      if (next) setProjection(() => next)
    })
    return () => cancelAnimationFrame(frame)
  }, [height, result, width])

  const foregroundGraphics = useMemo(() => {
    if (!projection) return null
    const seamIndex = 1
    const vertical = Array.from({ length: result.columns - 1 }, (_, offset) => {
      const index = offset + 1
      const points = Array.from({ length: 48 }, (_, step) => [boundaryX(index, step / 47, result.columns, result.seam), step / 47])
      return { index, d: projectPath(projection, points) }
    })
    const horizontalPoints = Array.from({ length: 64 }, (_, step) => {
      const x = step / 63
      return [x, boundaryY(x, result.seam)]
    })
    return (
      <g>
        {vertical.map(({ index, d }) => <path key={index} d={d} fill="none" stroke={index === seamIndex ? palette.cut : palette.muted} strokeWidth={index === seamIndex ? "6" : "2"} strokeDasharray={index === seamIndex ? "0" : "7 6"} opacity={index === seamIndex ? "1" : "0.74"} />)}
        <path d={projectPath(projection, horizontalPoints)} fill="none" stroke={palette.muted} strokeWidth="2" strokeDasharray="7 6" opacity="0.74" />
        {!compact && result.zones.map((zone) => {
          const [x, y] = projection(toCedarBendCoordinate(zone.x, zone.y))
          return (
            <g key={zone.id} transform={`translate(${x}, ${y})`}>
              <rect x="-38" y="-20" width="76" height="40" rx="7" fill={palette.paper} fillOpacity="0.94" />
              <text textAnchor="middle" y="-2" fill={palette.ink} className="maup-map-label">{decimal.format(zone.mean)}</text>
              <text textAnchor="middle" y="13" fill={palette.muted} className="maup-map-label maup-map-label--small">{zone.mean >= threshold ? "HIGH" : "below"}</text>
            </g>
          )
        })}
        {onSeam && !compact ? [0.24, 0.5, 0.76].map((y, index) => {
          const point = projection(toCedarBendCoordinate(boundaryX(seamIndex, y, result.columns, result.seam), y))
          return (
            <DirectManipulationControl
              key={y}
              className="maup-handle"
              controlType="partition-boundary"
              x={point[0]}
              y={point[1]}
              value={result.seam}
              min={-1}
              max={1}
              step={0.05}
              onChange={onSeam}
              pointerToValue={(event) => {
                if (!projection.invert) return null
                const p = overlayPoint(event)
                const [x] = fromCedarBendCoordinate(projection.invert([p.x, p.y]))
                return (x - seamIndex / result.columns) / 0.1
              }}
              label="Featured district border"
              valueText={`District seam shift ${decimal.format(result.seam)}`}
              stroke={palette.cut}
              labelText={index === 1 ? "move this border" : null}
              labelDx={18}
              labelDy={-24}
              labelClassName="maup-svg-cut-label"
            />
          )
        }) : null}
      </g>
    )
  }, [compact, onSeam, palette, projection, result, threshold])

  return (
    <StreamGeoFrame
      ref={frameRef}
      className={`maup-stream-geo-frame ${compact ? "maup-stream-geo-frame--compact" : ""}`}
      projection="equirectangular"
      areas={[CEDAR_BEND_AREA]}
      points={cells}
      xAccessor="lon"
      yAccessor="lat"
      pointIdAccessor="id"
      size={[width, height]}
      fitPadding={0.07}
      background={palette.paper}
      areaStyle={() => ({ fill: palette.paperDeep, stroke: palette.ink, strokeWidth: 2 })}
      pointStyle={(datum) => ({
        fill: datum.districtMean >= threshold ? palette.high : palette.field,
        fillOpacity: 0.25 + clamp((datum.value - 40) / 50, 0.15, 0.9) * 0.7,
        r: Math.max(2, width / GRID_COLUMNS * 0.22),
      })}
      foregroundGraphics={foregroundGraphics}
      enableHover
      accessibleTable
      description={onSeam ? "Cedar Bend, rendered by StreamGeoFrame. Drag the orange district seam to change geographic aggregation." : "Cedar Bend geographic heat field on the selected day."}
      summary={`${result.zones.length} districts, ${percent.format(result.rawShare)} raw high, and ${percent.format(result.assignedShare)} assigned high.`}
      tooltipContent={(datum) => (
        <div className="maup-tooltip">
          <strong>District {datum.district}</strong>
          <span>raw cell heat {decimal.format(datum.value)}</span>
          <span>district mean {decimal.format(datum.districtMean)}: {datum.districtLabel}</span>
        </div>
      )}
    />
  )
}

function TimeExplorer({ mapResult, timeResult, baselineShare, threshold, day, onDay, timeWindow, timePhase, onTimePhase, playing, onTogglePlayback, palette }) {
  const [hostWidth, hostRef] = useResponsiveWidth(280, 1120)
  const compact = hostWidth < 720
  const mapWidth = compact ? hostWidth : Math.max(250, Math.floor(hostWidth * 0.37))
  const histogramWidth = compact ? hostWidth : Math.max(320, Math.floor(hostWidth * 0.59))
  const histogramData = useMemo(() => DAILY_GLOBAL_MEANS.map((value, index) => ({ id: `day-${index + 1}`, time: index, value, day: index + 1 })), [])
  const annotations = useMemo(() => [
    ...Array.from({ length: DAY_COUNT / timeWindow }, (_, index) => ({ type: "window-boundary", time: (timePhase + index * timeWindow) % DAY_COUNT, active: index === 0 })),
    { type: "playhead", time: day },
  ], [day, timePhase, timeWindow])
  const annotationRules = useMemo(
    () => (annotation, index, context) => {
      const xScale = context.scales?.time || context.scales?.x
      const width = context.width || 0
      const height = context.height || 0
      if (!xScale || width <= 0 || height <= 0) return null
      if (annotation.type === "playhead") {
        const x = xScale(annotation.time + 0.5)
        return <line key={`playhead-${annotation.time}`} x1={x} x2={x} y1="0" y2={height} stroke={palette.field} strokeWidth="3" />
      }
      if (annotation.type !== "window-boundary") return null
      const x = xScale(annotation.time)
      return (
        <g key={`window-${annotation.time}-${index}`}>
          <line x1={x} x2={x} y1="0" y2={height} stroke={annotation.active ? palette.cut : palette.muted} strokeWidth={annotation.active ? "4" : "1.5"} strokeDasharray={annotation.active ? "0" : "4 5"} opacity={annotation.active ? "1" : "0.7"} />
          {annotation.active ? (
            <DirectManipulationControl
              className="maup-handle"
              controlType="time-window"
              x={x}
              y={12}
              value={timePhase}
              min={0}
              max={timeWindow - 1}
              step={1}
              onChange={onTimePhase}
              pointerToValue={(event) => xScale.invert(overlayPoint(event).x)}
              label="Beginning of the reporting window"
              valueText={`Reporting windows begin on day ${timePhase + 1}`}
              stroke={palette.cut}
              labelText="move the week"
              labelDx={16}
              labelDy={0}
              labelClassName="maup-svg-cut-label"
            />
          ) : null}
        </g>
      )
    },
    [onTimePhase, palette, timePhase, timeWindow],
  )

  return (
    <div ref={hostRef} className="maup-time-layout">
      <div className="maup-time-map-wrap">
        <StreamGeoMaupMap result={mapResult} threshold={threshold} width={mapWidth} compact palette={palette} />
        <p>Day {day + 1}: the slice changes. The city does not.</p>
      </div>
      <div className="maup-time-ribbon-wrap">
        <p className="maup-time-histogram-title">One city, cut into {timeWindow}-day windows</p>
        <TemporalHistogram
          className="maup-temporal-histogram"
          data={histogramData}
          binSize={1}
          timeAccessor="time"
          valueAccessor="value"
          pointIdAccessor="id"
          size={[histogramWidth, 226]}
          margin={{ top: 30, right: 10, bottom: 34, left: 10 }}
          timeExtent={[0, DAY_COUNT]}
          valueExtent={[0, 78]}
          fill={palette.field}
          stroke={palette.field}
          opacity={0.78}
          gap={2}
          background={palette.paper}
          showAxes={false}
          enableHover
          annotations={annotations}
          svgAnnotationRules={annotationRules}
          tickFormatTime={(time) => String(Math.round(time) + 1)}
          tooltip={(datum) => <strong>Day {datum.day ?? Math.round(datum.time) + 1}: global weighted heat {decimal.format(datum.value ?? 0)}</strong>}
        />
        <div className="maup-temporal-histogram-readout">
          <span>day 1 calendar: {percent.format(baselineShare)} assigned high</span>
          <span>this calendar: {percent.format(timeResult.assignedShare)} ({timeResult.assignedShare >= baselineShare ? "+" : ""}{Math.round((timeResult.assignedShare - baselineShare) * 100)} points)</span>
        </div>
        <div className="maup-time-controls">
          <button type="button" onClick={() => onDay(clamp(day - 1, 0, DAY_COUNT - 1))}>Back</button>
          <button type="button" className="maup-time-play" onClick={onTogglePlayback} aria-pressed={playing}>{playing ? "Pause" : "Play"}</button>
          <button type="button" onClick={() => onDay(clamp(day + 1, 0, DAY_COUNT - 1))}>Forward</button>
          <input aria-label="Current day" type="range" min="0" max={DAY_COUNT - 1} value={day} onChange={(event) => onDay(Number(event.target.value))} />
        </div>
      </div>
    </div>
  )
}

function SensitivityStrip({ scale, seam, threshold }) {
  const [width, hostRef] = useResponsiveWidth(280, 850)
  const samples = useMemo(() => Array.from({ length: 29 }, (_, index) => -1 + (index / 28) * 2).map((sampleSeam) => calculateMap({ scale, seam: sampleSeam, threshold }).assignedShare), [scale, threshold])
  const sorted = [...samples].sort((a, b) => a - b)
  const current = calculateMap({ scale, seam, threshold }).assignedShare
  const low = sorted[Math.floor(sorted.length * 0.1)]
  const high = sorted[Math.floor(sorted.length * 0.9)]
  const min = Math.min(...samples)
  const max = Math.max(...samples)
  const layout = useMemo(
    () => (ctx) => {
      const { width: plotWidth, height: plotHeight } = ctx.dimensions.plot
      const field = ctx.resolveColor("sensitivity-range")
      const highColor = ctx.theme.semantic.danger ?? ctx.resolveColor("current-plan")
      const secondary = ctx.theme.semantic.textSecondary ?? ctx.theme.semantic.text ?? "currentColor"
      const position = (value) => (max === min ? plotWidth / 2 : ((value - min) / (max - min)) * plotWidth)
      return {
        nodes: samples.map((value, index) => visibleRect({ x: position(value) - 1.5, y: 50, w: 3, h: 34, fill: field, fillOpacity: 0.52, datum: { id: `plan-${index}`, assignedShare: value, seam: -1 + (index / 28) * 2 }, id: `sensitivity-${index}`, group: "compact plan" })),
        overlays: <g><line x1={position(low)} x2={position(high)} y1="67" y2="67" stroke={field} strokeWidth="8" strokeLinecap="round" /><circle cx={position(current)} cy="67" r="9" fill={highColor} stroke={ctx.theme.semantic.surface ?? "transparent"} strokeWidth="3" /><text x="0" y={plotHeight - 4} fill={secondary} className="maup-time-day">{percent.format(min)}</text><text x={plotWidth / 2} y={plotHeight - 4} textAnchor="middle" fill={secondary} className="maup-time-day">current {percent.format(current)}</text><text x={plotWidth} y={plotHeight - 4} textAnchor="end" fill={secondary} className="maup-time-day">{percent.format(max)}</text></g>,
      }
    },
    [current, high, low, max, min, samples],
  )
  return (
    <div ref={hostRef} className="maup-sensitivity">
      <p>Across 29 compact versions of this {scale}-district plan, the assigned-high share runs from {percent.format(low)} to {percent.format(high)} between the 10th and 90th percentiles.</p>
      <XYCustomChart className="maup-sensitivity-frame" data={samples.map((assignedShare, index) => ({ id: `plan-${index}`, assignedShare, seam: -1 + (index / 28) * 2 }))} layout={layout} width={width} height={116} xExtent={[min, max]} yExtent={[0, 1]} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} enableHover accessibleTable description="A sensitivity range across 29 compact alternative district plans." summary={`The 10th to 90th percentile range is ${percent.format(low)} to ${percent.format(high)}. The current plan is ${percent.format(current)}.`} tooltip={(datum) => { const plan = unwrapDatum(datum); return <strong>{percent.format(plan.assignedShare)} assigned high at seam {decimal.format(plan.seam)}</strong> }} frameProps={{ background: "transparent" }} />
    </div>
  )
}

export default function WhereYouDrawTheLineExamplePage() {
  const [theme] = useDocsTheme()
  const palette = useMemo(() => paletteForTheme(theme), [theme])
  const [pageWidth, pageRef] = useResponsiveWidth(320, 1120)
  const [threshold, setThreshold] = useState(64)
  const [lineCut, setLineCut] = useState(0.38)
  const [lineBins, setLineBins] = useState(3)
  const [mapScale, setMapScale] = useState(6)
  const [mapSeam, setMapSeam] = useState(-0.5)
  const [day, setDay] = useState(12)
  const [timeWindow, setTimeWindow] = useState(7)
  const [timePhase, setTimePhase] = useState(4)
  const [playing, setPlaying] = useState(false)
  const chartWidth = Math.max(280, Math.floor(pageWidth))

  const lineResult = useMemo(() => calculateLine({ cut: lineCut, bins: lineBins, threshold }), [lineBins, lineCut, threshold])
  const mapResult = useMemo(() => calculateMap({ scale: mapScale, seam: mapSeam, threshold }), [mapScale, mapSeam, threshold])
  const riverWards = useMemo(() => calculateMap({ scale: 6, seam: -0.5, threshold }), [threshold])
  const avenueWards = useMemo(() => calculateMap({ scale: 6, seam: 0.5, threshold }), [threshold])
  const timeMapResult = useMemo(() => calculateMap({ scale: mapScale, seam: mapSeam, threshold, day }), [day, mapScale, mapSeam, threshold])
  const timeResult = useMemo(() => calculateSpaceTime({ scale: mapScale, seam: mapSeam, threshold, timeWindow, timePhase }), [mapScale, mapSeam, threshold, timePhase, timeWindow])
  const baselineTimeResult = useMemo(() => calculateSpaceTime({ scale: mapScale, seam: mapSeam, threshold, timeWindow, timePhase: 0 }), [mapScale, mapSeam, threshold, timeWindow])

  useEffect(() => {
    if (!playing) return undefined
    const timer = window.setInterval(() => setDay((currentDay) => {
      if (currentDay >= DAY_COUNT - 1) { setPlaying(false); return DAY_COUNT - 1 }
      return currentDay + 1
    }), 750)
    return () => window.clearInterval(timer)
  }, [playing])

  useEffect(() => setTimePhase((phase) => clamp(phase, 0, timeWindow - 1)), [timeWindow])

  const reset = () => {
    setThreshold(64); setLineCut(0.38); setLineBins(3); setMapScale(6); setMapSeam(-0.5)
    setDay(12); setTimeWindow(7); setTimePhase(4); setPlaying(false)
  }
  const highDistrictCount = mapResult.zones.filter((zone) => zone.mean >= threshold).length
  const mapHeadline = `${highDistrictCount} of ${mapResult.zones.length} districts are high. They assign ${percent.format(mapResult.assignedShare)} of Cedar Bend residents to high-heat districts.`

  return (
    <ExamplePageLayout title="Where You Draw the Line">
      <main ref={pageRef} className="maup-example">
        <section className="maup-hero" aria-labelledby="maup-deck">
          <p className="maup-kicker">An explorable explanation of the modifiable areal unit problem</p>
          <p id="maup-deck" className="maup-deck">Nothing beneath the boundary changes. The answer does.</p>
          <p className="maup-intro">Cedar Bend is a constructed city with a fixed heat field and a fixed population. Group it one way and its districts tell one story. Move a border and the policy answer can move with it.</p>
          <div className="maup-hero-proof"><span>fixture {checksum()}</span><span>{MAP_CELLS.length} fixed microcells</span><span>28 fixed days</span><button type="button" onClick={reset}>Reset the argument</button></div>
        </section>

        <section className="maup-chapter maup-chapter--line" aria-labelledby="maup-line-title">
          <div className="maup-chapter-heading"><p className="maup-step">01</p><div><h2 id="maup-line-title">Take away the map.</h2><p>A map is a line with more directions in which to draw a cut.</p></div></div>
          <LiveSentence>Divide this unchanged field into <label><input aria-label="Number of intervals" type="number" min="3" max="6" step="3" value={lineBins} onChange={(event) => setLineBins(Number(event.target.value) === 6 ? 6 : 3)} /> intervals</label>, then move the orange rule.</LiveSentence>
          <LineField result={lineResult} threshold={threshold} onCut={setLineCut} width={chartWidth} />
          <MetricLedger result={lineResult} changed="one line moved" />
          <div className="maup-annotation-grid"><p>The rug is fixed population weight. The teal curve is the same continuous heat score before and after every drag.</p><p>Each interval wash and every weight-rug mark is a Semiotic scene node. The orange rule is the direct control layered on frame geometry.</p></div>
        </section>

        <section className="maup-chapter maup-chapter--map" aria-labelledby="maup-map-title">
          <div className="maup-chapter-heading"><p className="maup-step">02</p><div><h2 id="maup-map-title">Put geography back.</h2><p>Geography makes the cuts look official. It does not make the averaging disappear.</p></div></div>
          <LiveSentence>With <span className="maup-inline-options" role="group" aria-label="District count">{[4, 6, 8].map((count) => <button type="button" key={count} className={mapScale === count ? "is-active" : ""} aria-pressed={mapScale === count} onClick={() => setMapScale(count)}>{count} districts</button>)}</span>, {mapHeadline}</LiveSentence>
          <div className="maup-map-compare" aria-label="Two compact six-district plans for the same Cedar Bend field">
            <span>Same city. Same six districts. Two defensible ward plans:</span>
            <button type="button" className={mapScale === 6 && mapSeam === -0.5 ? "is-active" : ""} onClick={() => { setMapScale(6); setMapSeam(-0.5) }}>
              River wards: {percent.format(riverWards.assignedShare)} assigned high
            </button>
            <button type="button" className={mapScale === 6 && mapSeam === 0.5 ? "is-active" : ""} onClick={() => { setMapScale(6); setMapSeam(0.5) }}>
              Avenue wards: {percent.format(avenueWards.assignedShare)} assigned high
            </button>
          </div>
          <StreamGeoMaupMap result={mapResult} threshold={threshold} onSeam={setMapSeam} width={chartWidth} palette={palette} />
          <MetricLedger result={mapResult} changed={`${mapScale} compact districts`} />
          <div className="maup-map-note"><span className="maup-line-swatch maup-line-swatch--field" /> fixed raw heat field <span className="maup-line-swatch maup-line-swatch--cut" /> movable district boundary <span className="maup-hatch-swatch" /> district average meets threshold</div>
          <div className="maup-annotation-grid"><p>The River and Avenue plans move only the partition. The fixed field moves from {percent.format(riverWards.assignedShare)} to {percent.format(avenueWards.assignedShare)} assigned high: a {Math.round((avenueWards.assignedShare - riverWards.assignedShare) * 100)}-point change.</p><p>This is a `StreamGeoFrame`: it projects a local GeoJSON city support, renders each fixed microcell as a geographic point, and keeps its geographic hover and accessible table.</p></div>
        </section>

        <section className="maup-chapter maup-chapter--threshold" aria-labelledby="maup-threshold-title">
          <div className="maup-chapter-heading"><p className="maup-step">03</p><div><h2 id="maup-threshold-title">A threshold makes the drift consequential.</h2><p>Once a threshold classifies districts, small border changes can switch the resulting decision.</p></div></div>
          <LiveSentence>Call a district high when its average is at least <label><input aria-label="High heat decision threshold" type="number" min="48" max="78" step="1" value={threshold} onChange={(event) => setThreshold(clamp(Number(event.target.value), 48, 78))} />.</label></LiveSentence>
          <div className="maup-threshold-panel"><div><p className="maup-threshold-value">{decimal.format(mapResult.globalMean)}</p><span>global weighted mean, unchanged by borders</span></div><div><p className="maup-threshold-value">{percent.format(mapResult.rawShare)}</p><span>raw population above the decision rule</span></div><div><p className="maup-threshold-value">{percent.format(mapResult.assignedShare)}</p><span>population assigned to high districts</span></div></div>
          <p className="maup-pullquote">The threshold stayed put. One district average crossed it. A small continuous move became a yes-or-no label.</p>
        </section>

        <section className="maup-chapter maup-chapter--time" aria-labelledby="maup-time-title">
          <div className="maup-chapter-heading"><p className="maup-step">04</p><div><h2 id="maup-time-title">Time gives the boundary another direction.</h2><p>A week is a partition, not a law of nature.</p></div></div>
          <LiveSentence>Average the same city into <span className="maup-inline-options" role="group" aria-label="Reporting window size">{[4, 7, 14].map((windowSize) => <button type="button" key={windowSize} className={timeWindow === windowSize ? "is-active" : ""} aria-pressed={timeWindow === windowSize} onClick={() => setTimeWindow(windowSize)}>{windowSize}-day windows</button>)}</span> beginning on day {timePhase + 1}.</LiveSentence>
          <TimeExplorer mapResult={timeMapResult} timeResult={timeResult} baselineShare={baselineTimeResult.assignedShare} threshold={threshold} day={day} onDay={setDay} timeWindow={timeWindow} timePhase={timePhase} onTimePhase={setTimePhase} playing={playing} onTogglePlayback={() => setPlaying((current) => !current)} palette={palette} />
          <p className="maup-time-effect">Starting on day 1 assigns <strong>{percent.format(baselineTimeResult.assignedShare)}</strong> of population-time to high blocks. Starting on day {timePhase + 1} assigns <strong>{percent.format(timeResult.assignedShare)}</strong>. The heat did not change; the reporting calendar did.</p>
          <MetricLedger result={timeResult} label="population-time" changed={`${timeWindow}-day windows, phase ${timePhase + 1}`} />
          <div className="maup-annotation-grid"><p>Spatial borders make vertical walls through the conceptual stack. Reporting windows make horizontal planes. Both decide which values are averaged together.</p><p>The bars are a bounded `TemporalHistogram`; its annotation layer carries the current playhead and the draggable reporting-window boundary.</p></div>
        </section>

        <section className="maup-chapter maup-chapter--range" aria-labelledby="maup-range-title">
          <div className="maup-chapter-heading"><p className="maup-step">05</p><div><h2 id="maup-range-title">The range is part of the result.</h2><p>Aggregation is useful. A result that survives only one plausible border is brittle.</p></div></div>
          <SensitivityStrip scale={mapScale} seam={mapSeam} threshold={threshold} />
          <div className="maup-reporting-list"><p><strong>Show the support.</strong> State the finest data available, the population weight, and the outer extent.</p><p><strong>Show the rule.</strong> Report the aggregation, threshold, and whether labels belong to people or units.</p><p><strong>Show alternatives.</strong> Test more than one defensible scale and zoning, then report the range.</p></div>
          <p className="maup-final-line">Nothing beneath the boundary changed. The answer did.</p>
        </section>

        <details className="maup-construction"><summary>Inspect the construction</summary><p>Cedar Bend is deterministic. The geography is `StreamGeoFrame` over a local GeoJSON city support; the calendar is `TemporalHistogram`; the line and sensitivity field use `XYCustomChart` scene-node layouts. Border handles and explanatory annotations are SVG overlays on the corresponding frame geometry.</p><p>This explainer concerns aggregate sensitivity. It does not license individual inference from district averages, and it does not claim that every partition is equally defensible.</p></details>
      </main>
    </ExamplePageLayout>
  )
}
