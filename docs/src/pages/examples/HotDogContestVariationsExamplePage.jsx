import React, { useEffect, useMemo, useRef, useState } from "react"
import { StreamOrdinalFrame, TemporalHistogram } from "semiotic"
import { XYCustomChart } from "semiotic/xy"
import { tokenLayer } from "semiotic/recipes"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  NATHANS_END_YEAR,
  NATHANS_ERAS,
  NATHANS_EVENTS,
  NATHANS_MISSING_YEARS,
  NATHANS_RESULTS,
  NATHANS_SOURCE_LABEL,
  NATHANS_SOURCE_URL,
  NATHANS_START_YEAR,
  NATHANS_YEAR_MS,
  contestRate,
  countLabel,
  resultWithTime,
  yearTime,
} from "./data/nathansHotDogContest"
import "./HotDogContestVariationsExamplePage.css"

const MEN_COLOR = "#d7a02f"
const WOMEN_COLOR = "#c94f6f"
const KETCHUP = "#c74733"
const RELISH = "#2d7669"
const BLUE = "#377f91"
const INK = "#1f292b"
const PAPER = "#fbf4e4"
const MAX_COUNT = 80
const UNIT_VALUE = 5
const MAX_UNITS = Math.ceil(MAX_COUNT / UNIT_VALUE)
const INITIAL_STREAM_COUNT = 1
const STREAM_STEP_MS = 260
const TEMPORAL_MEN_COLOR = KETCHUP
const TEMPORAL_WOMEN_COLOR = "#d95f6a"
const TEMPORAL_Y_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80]
const TEMPORAL_X_TICKS = [1972, 1980, 1990, 2000, 2010, 2020, 2026]
const TEMPORAL_EVENT_LABEL_OFFSETS = {
  1985: 10,
  2001: -10,
  2008: 14,
  2011: 48,
  2024: -10,
}
const RACE_YEAR_DURATION_MS = 5000
const RACE_TICK_MS = 100
const RACE_COLORS = {
  Men: "#d9a51f",
  Women: "#c74733",
}
const RACE_BACKGROUND = "#8d5035"
const HOTDOG_GLYPH = {
  viewBox: [18, 12],
  anchor: [0.5, 0.5],
  parts: [
    {
      d: "M1.2 7.2C1.2 4.6 3.4 2.6 6.1 2.6h5.8c2.7 0 4.9 2 4.9 4.6s-2.2 4.6-4.9 4.6H6.1c-2.7 0-4.9-2-4.9-4.6Z",
      fill: "accent",
    },
    {
      d: "M2.7 6.4C2.7 4.8 4 3.7 5.7 3.7h6.6c1.7 0 3 1.1 3 2.7s-1.3 2.7-3 2.7H5.7c-1.7 0-3-1.1-3-2.7Z",
      fill: "color",
    },
    {
      d: "M4.3 6.1c1.4-1.4 2.6 1.3 4 0s2.6 1.3 4 0",
      fill: "none",
      stroke: "#fff2a8",
      strokeWidth: 1.1,
      strokeLinecap: "round",
    },
  ],
}

export default function HotDogContestVariationsExamplePage() {
  const [pageWidth, pageRef] = useResponsiveWidth(320, 1120)
  const [playhead, setPlayhead] = useState(INITIAL_STREAM_COUNT)
  const [playing, setPlaying] = useState(true)
  const visibleRows = useMemo(
    () => NATHANS_RESULTS.slice(0, playhead).map(resultWithTime),
    [playhead],
  )

  useEffect(() => {
    if (!playing) return undefined
    if (playhead >= NATHANS_RESULTS.length) {
      setPlaying(false)
      return undefined
    }
    const timeout = window.setTimeout(() => {
      setPlayhead((current) => Math.min(NATHANS_RESULTS.length, current + 1))
    }, STREAM_STEP_MS)
    return () => window.clearTimeout(timeout)
  }, [playhead, playing])

  const current = visibleRows.at(-1) || NATHANS_RESULTS[0]
  const peak = NATHANS_RESULTS.reduce(
    (max, row) => (row.count > max.count ? row : max),
    NATHANS_RESULTS[0],
  )
  const latestMen = NATHANS_RESULTS.filter((row) => row.gender === "Men").at(-1)
  const latestWomen = NATHANS_RESULTS.filter((row) => row.gender === "Women").at(-1)

  function toggleReplay() {
    if (playhead >= NATHANS_RESULTS.length && !playing) {
      setPlayhead(1)
      setPlaying(true)
      return
    }
    setPlaying((value) => !value)
  }

  return (
    <ExamplePageLayout title="Nathan's Hot Dog Contest, Four Ways">
      <p className="hotdog-page__lede">
        Four views of the same source-audited Nathan&apos;s contest record. Compare annual winners,
        count totals in five-HDB units, inspect rule changes, and separate eating pace from contest
        duration.
      </p>

      <div className="hotdog" ref={pageRef}>
        <header className="hotdog__masthead">
          <div>
            <div className="hotdog__eyebrow">CONEY ISLAND RECORD LEDGER · 1972-2026</div>
            <h2>Nathan&apos;s Hot Dog Eating Contest</h2>
            <p>
              Winning hot dogs and buns (HDB), using the documented calendar-year high when more
              than one contest occurred. From 2011 forward, the ledger carries separate men&apos;s
              and women&apos;s belts.
            </p>
          </div>
          <div className="hotdog__seal" aria-hidden="true">
            <HotDogBadge />
          </div>
        </header>

        <section className="hotdog__brief" aria-label="Design brief">
          <BriefPoint label="Audience" value="Tessa Rodes" note="Award-winning designer at IBM." />
          <BriefPoint
            label="Overall peak"
            value={`${countLabel(peak.count)} HDB`}
            note={`${peak.winner}, ${peak.year}.`}
          />
          <BriefPoint
            label="Latest men"
            value={`${countLabel(latestMen.count)} HDB`}
            note={`${latestMen.winner}, ${latestMen.year}.`}
          />
          <BriefPoint
            label="Latest women"
            value={`${countLabel(latestWomen.count)} HDB`}
            note={`${latestWomen.winner}, ${latestWomen.year}.`}
          />
        </section>

        <VariationSection
          number="01"
          eyebrow="Streaming replay · TemporalHistogram"
          title="Let the record arrive one contest at a time"
          note="A bounded TemporalHistogram is progressively fed the documented rows. The bars keep the original temporal premise while avoiding the false precision of a smoothed stroke."
        >
          <div className="hotdog__stream-controls">
            <button type="button" onClick={toggleReplay}>
              {playing ? "Pause" : playhead >= NATHANS_RESULTS.length ? "Replay" : "Play"}
            </button>
            <input
              type="range"
              min="1"
              max={NATHANS_RESULTS.length}
              value={playhead}
              aria-label="Contest replay position"
              onChange={(event) => {
                setPlaying(false)
                setPlayhead(Number(event.target.value))
              }}
            />
            <output>{current.year}</output>
          </div>
          <TemporalHistogramStudy rows={visibleRows} />
        </VariationSection>

        <VariationSection
          number="02"
          eyebrow="ISOTYPE ledger · one sign equals five HDB"
          title="Count each winning total in five-HDB units"
          note="The ISOTYPE treatment makes every winner countable and gives the men's and women's records separate rows."
        >
          <IsotypeLedger />
        </VariationSection>

        <VariationSection
          number="03"
          eyebrow="Audited remake · line plus event bands"
          title="Clean up the evidence in the reference chart"
          note="This version preserves the familiar upward trace, adds the documented gaps and rule events, and labels the 2010 source discrepancy directly."
        >
          <TrajectoryChart />
        </VariationSection>

        <VariationSection
          number="04"
          eyebrow="Duration-normalized mirror"
          title="Show total volume and pace as separate claims"
          note="The contest length changed repeatedly, most visibly from 12 to 10 minutes in 2008. Mirroring total HDB against HDB per minute prevents the rule change from hiding inside the same line."
        >
          <PaceMirrorChart />
        </VariationSection>

        <VariationSection
          number="05"
          eyebrow="Racing bars · StreamOrdinalFrame push API"
          title="Let cumulative eaters overtake each other"
          note="Two horizontal bar races split the ledger by division. Each historical year streams in over five seconds, with cumulative competitor totals re-ranked by Semiotic as the values change."
        >
          <HotDogRaceBars />
        </VariationSection>

        <footer className="hotdog__source">
          <strong>Source audit</strong>
          <p>
            Data:{" "}
            <a href={NATHANS_SOURCE_URL} target="_blank" rel="noreferrer">
              {NATHANS_SOURCE_LABEL}
            </a>
            . Rows before 1997 include holiday and one-on-one contests where those are the
            documented calendar-year high. From 2011 onward, men&apos;s and women&apos;s winners are
            separate records. The source table records Joey Chestnut at 54 HDB in 2010; the supplied
            reference image labels the endpoint as 58, so these variants use the documented 54.
          </p>
        </footer>
      </div>
    </ExamplePageLayout>
  )
}

function BriefPoint({ label, value, note }) {
  return (
    <div className="hotdog__brief-point">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  )
}

function VariationSection({ number, eyebrow, title, note, children }) {
  return (
    <section className="hotdog__variation" aria-labelledby={`hotdog-variation-${number}`}>
      <div className="hotdog__variation-copy">
        <span className="hotdog__variation-number">{number}</span>
        <div>
          <div className="hotdog__variation-eyebrow">{eyebrow}</div>
          <h3 id={`hotdog-variation-${number}`}>{title}</h3>
          <p>{note}</p>
        </div>
      </div>
      <div className="hotdog__variation-body">{children}</div>
    </section>
  )
}

function TemporalHistogramStudy({ rows }) {
  const [panelWidth, panelRef] = useResponsiveWidth(280, 920)
  const chartWidth = Math.max(244, panelWidth - 36)
  const final = rows.at(-1)
  const menRows = rows.filter((row) => row.gender === "Men")
  const womenRows = rows.filter((row) => row.gender === "Women")
  const axisAnnotations = [
    ...TEMPORAL_Y_TICKS.map((value) => ({ type: "value-tick", value })),
    ...TEMPORAL_X_TICKS.map((year) => ({
      type: "time-tick",
      year,
      time: yearTime(year),
    })),
  ]
  const eventAnnotations = final
    ? NATHANS_EVENTS.filter((event) => event.year <= final.year).map((event, index) => ({
        ...event,
        type: "temporal-event",
        time: yearTime(event.year),
        tier: index % 3,
        labelOffset: TEMPORAL_EVENT_LABEL_OFFSETS[event.year] || 10,
      }))
    : []
  const playheadAnnotation = final
    ? [{ type: "playhead", year: final.year, time: yearTime(final.year) }]
    : []
  const histogramProps = {
    binSize: NATHANS_YEAR_MS,
    timeAccessor: "time",
    valueAccessor: "value",
    timeExtent: [0, yearTime(NATHANS_END_YEAR + 1)],
    valueExtent: [0, MAX_COUNT],
    tickFormatTime: (time) => String(Math.round(NATHANS_START_YEAR + time / NATHANS_YEAR_MS)),
    tickFormatValue: (value) => String(Math.round(value)),
    enableHover: true,
    gap: 1,
    opacity: 0.9,
    background: "transparent",
    showAxes: false,
    annotations: [...axisAnnotations, ...playheadAnnotation],
    svgAnnotationRules: temporalHistogramAnnotationRules,
  }
  return (
    <div className="hotdog__temporal" ref={panelRef}>
      <div className="hotdog__temporal-legend" aria-label="Temporal histogram divisions">
        <span>
          <i className="hotdog__legend-chip hotdog__legend-chip--men" />
          Men&apos;s / open
        </span>
        <span>
          <i className="hotdog__legend-chip hotdog__legend-chip--women" />
          Women&apos;s
        </span>
      </div>
      <div className="hotdog__temporal-stack">
        <TemporalHistogram
          {...histogramProps}
          size={[chartWidth, 248]}
          margin={{ top: 54, right: 12, bottom: 42, left: 46 }}
          data={menRows}
          fill={TEMPORAL_MEN_COLOR}
          annotations={[...axisAnnotations, ...eventAnnotations, ...playheadAnnotation]}
          chartId="nathans-temporal-histogram-men"
          description="Progressive temporal histogram of documented Nathan's men's or open winning counts from 1972 to 2026."
        />
        <TemporalHistogram
          {...histogramProps}
          size={[chartWidth, 154]}
          margin={{ top: 8, right: 12, bottom: 38, left: 46 }}
          data={womenRows}
          fill={TEMPORAL_WOMEN_COLOR}
          direction="down"
          chartId="nathans-temporal-histogram-women"
          description="Progressive temporal histogram of documented Nathan's women's winning counts from 1975 and 2011 to 2026."
        />
      </div>
      <div className="hotdog__temporal-readout">
        <strong>
          {final ? `${final.year}: ${countLabel(final.count)} HDB` : "Waiting for first row"}
        </strong>
        <span>
          {final
            ? `${final.winner}, ${final.division || final.gender}`
            : "Documented contest results"}
        </span>
      </div>
      <div className="hotdog__missing-years" aria-label="Years without documented results">
        {NATHANS_MISSING_YEARS.map((gap) => (
          <span key={gap.year} title={gap.note}>
            {gap.year}: no documented result
          </span>
        ))}
      </div>
    </div>
  )
}

function temporalHistogramAnnotationRules(annotation, index, context) {
  const xScale = context.scales?.time || context.scales?.x
  const yScale = context.scales?.value || context.scales?.y
  const width = context.width || 0
  const height = context.height || 0
  if (!xScale || !yScale || width <= 0 || height <= 0) return null

  if (annotation.type === "value-tick") {
    const y = yScale(annotation.value)
    const labelY = Math.min(height - 2, Math.max(10, y + 3))
    return (
      <g
        key={`temporal-value-${annotation.value}-${index}`}
        className={`hotdog__temporal-y-tick ${
          annotation.value >= 40 ? "hotdog__temporal-y-tick--high" : ""
        }`}
      >
        <line x1="0" x2={width} y1={y} y2={y} />
        <text x="-9" y={labelY} textAnchor="end">
          {annotation.value}
        </text>
      </g>
    )
  }

  if (annotation.type === "time-tick") {
    if (
      width < 420 &&
      ![NATHANS_START_YEAR, 1990, 2010, NATHANS_END_YEAR].includes(annotation.year)
    ) {
      return null
    }
    const x = xScale(annotation.time)
    return (
      <g key={`temporal-time-${annotation.year}-${index}`} className="hotdog__temporal-x-tick">
        <line x1={x} x2={x} y1={height} y2={height + 5} />
        <text x={x} y={height + 20} textAnchor="middle">
          {annotation.year}
        </text>
      </g>
    )
  }

  if (annotation.type === "temporal-event") {
    const x = xScale(annotation.time)
    const compact = width < 420
    const labelOffset = compact ? 0 : annotation.labelOffset || 10
    const labelX = Math.min(width - 8, Math.max(8, x + labelOffset))
    const textAnchor = compact ? "middle" : labelOffset < 0 ? "end" : "start"
    return (
      <g key={`temporal-event-${annotation.year}`} className="hotdog__temporal-event">
        <line x1={x} x2={x} y1="0" y2={height} />
        <circle cx={x} cy={height} r="4" />
        <text
          x={labelX}
          y={-36 + (annotation.tier || 0) * 15}
          textAnchor={textAnchor}
        >
          <tspan className="hotdog__temporal-event-year">{annotation.year}</tspan>
          {compact ? null : <tspan dx="4">{annotation.shortLabel}</tspan>}
        </text>
      </g>
    )
  }

  if (annotation.type === "playhead") {
    const x = xScale(annotation.time)
    const compact = width < 420
    const labelAtRightEdge = x > width - 34
    return (
      <g key={`temporal-playhead-${annotation.year}`} className="hotdog__temporal-playhead">
        <line x1={x} x2={x} y1="0" y2={height} />
        {compact ? null : (
          <text
            x={labelAtRightEdge ? width - 4 : Math.max(4, x + 5)}
            y={height - 6}
            textAnchor={labelAtRightEdge ? "end" : "start"}
          >
            {annotation.year}
          </text>
        )}
      </g>
    )
  }

  return null
}

function IsotypeLedger() {
  const [panelWidth, panelRef] = useResponsiveWidth(260, 920)
  const chartWidth = Math.max(260, panelWidth)
  const columns = isotypeColumnsForWidth(chartWidth)
  const rowWidth = (chartWidth - (columns - 1) * 14) / columns
  const tokenColumns = isotypeTokenColumns(rowWidth)
  const rowHeight = isotypeRowHeight(tokenColumns)
  const chartHeight = Math.ceil(NATHANS_RESULTS.length / columns) * rowHeight + 8

  return (
    <div
      className="hotdog__isotype"
      ref={panelRef}
      aria-label="ISOTYPE ledger of annual winning counts"
    >
      <div className="hotdog__isotype-key">
        <svg viewBox="0 0 28 18" aria-hidden="true" className="hotdog__isotype-key-icon">
          <HotDogIcon
            x={2}
            y={1}
            width={24}
            height={16}
            sausage={MEN_COLOR}
            bun="#f3cf8a"
            mustard="#fff2a8"
          />
        </svg>
        <span>one hot dog sign = 5 HDB</span>
      </div>
      <XYCustomChart
        data={NATHANS_RESULTS}
        layout={isotypeLedgerLayout}
        layoutConfig={{ columns, rowHeight, tokenColumns, columnGap: 14 }}
        width={chartWidth}
        height={chartHeight}
        margin={{ top: 4, right: 2, bottom: 4, left: 2 }}
        className="hotdog__isotype-chart"
        enableHover
        accessibleTable
        xExtent={[0, 1]}
        yExtent={[0, 1]}
        description="An ISOTYPE ledger of Nathan's winning hot dogs and buns where each glyph scene node represents five HDB."
        summary="Each annual winner is encoded as unitized hot dog glyphs generated by Semiotic tokenLayer inside an XYCustomChart."
        frameProps={{ background: "transparent" }}
      />
    </div>
  )
}

function isotypeColumnsForWidth(width) {
  return width < 720 ? 1 : 2
}

function isotypeTokenColumns(rowWidth) {
  return Math.max(4, Math.floor(Math.max(128, rowWidth - 132) / 26))
}

function isotypeRowHeight(tokenColumns) {
  return Math.max(58, Math.ceil(MAX_UNITS / tokenColumns) * 20 + 20)
}

function isotypeLedgerLayout(ctx) {
  const rows = ctx.data
  if (rows.length === 0) return { nodes: [] }
  const { width } = ctx.dimensions.plot
  const columns = ctx.config.columns || isotypeColumnsForWidth(width)
  const columnGap = ctx.config.columnGap || 14
  const rowWidth = (width - (columns - 1) * columnGap) / columns
  const tokenColumns = ctx.config.tokenColumns || isotypeTokenColumns(rowWidth)
  const rowHeight = ctx.config.rowHeight || isotypeRowHeight(tokenColumns)
  const nodes = []
  const labels = []
  const labelWidth = 54
  const valueWidth = 58

  rows.forEach((row, index) => {
    const column = index % columns
    const rowIndex = Math.floor(index / columns)
    const x0 = column * (rowWidth + columnGap)
    const y0 = rowIndex * rowHeight + 4
    const color = row.gender === "Women" ? WOMEN_COLOR : MEN_COLOR
    const rowFill =
      row.gender === "Women" ? "rgba(255, 245, 247, 0.82)" : "rgba(255, 253, 245, 0.66)"

    nodes.push({
      type: "rect",
      x: x0,
      y: y0,
      w: rowWidth,
      h: rowHeight - 8,
      cornerRadii: { tl: 4, tr: 4, br: 4, bl: 4 },
      style: {
        fill: rowFill,
        stroke: "rgba(31, 41, 43, 0.12)",
        strokeWidth: 1,
      },
      datum: { ...row, chartPart: "ledger row" },
      group: row.gender,
    })

    const layer = tokenLayer({
      input: { value: row.count },
      encoding: {
        tokenType: "glyph",
        tokenSemantics: "unitized-measure",
        countStrategy: "unitized",
        layout: "grid",
        icon: "hot-dog",
        unitValue: UNIT_VALUE,
        unitMeaning: "5 HDB",
        maxTokens: MAX_UNITS,
        minFraction: 0.02,
      },
      options: {
        layout: "grid",
        glyph: HOTDOG_GLYPH,
        x: x0 + labelWidth,
        y: y0 + 11,
        columns: tokenColumns,
        cellWidth: 22,
        cellHeight: 16,
        gutter: 4,
        anchor: [0.5, 0.5],
        tokenSize: 16,
        color,
        accent: "#f3cf8a",
        ghostColor: "rgba(31, 41, 43, 0.18)",
        datum: (token) => ({
          ...row,
          chartPart: "unitized hot dog sign",
          representedHdb: token.value,
          fraction: token.fraction,
        }),
        accessibleDatum: (token) => ({
          year: row.year,
          division: row.division || row.gender,
          winner: row.winner,
          hdb: row.count,
          token: token.index + 1,
          tokenFraction: token.fraction,
          unitMeaning: "one sign equals five HDB",
        }),
        pointId: (token) => `hotdog-${row.year}-${row.gender}-${token.index}`,
      },
    })

    nodes.push(...layer.nodes)
    labels.push(
      <g key={`${row.year}-${row.division || row.gender}`}>
        <text x={x0 + 12} y={y0 + 24} className="hotdog__isotype-year">
          {row.year}
        </text>
        <text
          x={x0 + rowWidth - valueWidth + 48}
          y={y0 + 22}
          textAnchor="end"
          className="hotdog__isotype-count"
        >
          {countLabel(row.count)}
        </text>
        <text
          x={x0 + rowWidth - valueWidth + 48}
          y={y0 + 38}
          textAnchor="end"
          className="hotdog__isotype-division"
        >
          {row.division || row.gender}
        </text>
      </g>,
    )
  })

  return { nodes, overlays: <g>{labels}</g> }
}

function TrajectoryChart() {
  const [panelWidth, panelRef] = useResponsiveWidth(320, 980)
  const chartWidth = Math.max(720, panelWidth)

  return (
    <div className="hotdog__chart-scroll" ref={panelRef}>
      <XYCustomChart
        data={NATHANS_RESULTS}
        layout={trajectoryLayout}
        width={chartWidth}
        height={450}
        margin={{ top: 40, right: 112, bottom: 58, left: 58 }}
        className="hotdog__trajectory"
        xExtent={[NATHANS_START_YEAR, NATHANS_END_YEAR]}
        yExtent={[0, MAX_COUNT]}
        enableHover
        accessibleTable
        description="An audited Semiotic custom line chart of Nathan's winning HDB by division from 1972 through 2026."
        summary="Men's and women's winner rows are rendered as Semiotic line, area, point, and event-band scene nodes with source discrepancy labels overlaid."
        frameProps={{ background: "#762417" }}
      />
    </div>
  )
}

function trajectoryLayout(ctx) {
  const rows = ctx.data
  if (rows.length === 0) return { nodes: [] }
  const { width, height } = ctx.dimensions.plot
  const x = ctx.scales.x
  const y = ctx.scales.y
  const menRows = rows.filter((row) => row.gender === "Men")
  const womenRows = rows.filter((row) => row.gender === "Women")
  const womenSegments = [
    womenRows.filter((row) => row.year <= 1984),
    womenRows.filter((row) => row.year >= 2011),
  ].filter((segment) => segment.length > 0)
  const recordRows = runningRecords(menRows)
  const yTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80]
  const xTicks = [1972, 1980, 1990, 2000, 2010, 2020, 2026]
  const latestMen = menRows.at(-1)
  const latestWomen = womenRows.at(-1)
  const row2010 = menRows.find((row) => row.year === 2010)
  const nodes = []

  NATHANS_ERAS.forEach((era) => {
    const x0 = x(era.start)
    const x1 = x(Math.min(NATHANS_END_YEAR, era.end))
    nodes.push({
      type: "rect",
      x: x0,
      y: 0,
      w: Math.max(2, x1 - x0),
      h: height,
      style: { fill: era.color, opacity: 0.08 },
      datum: { ...era, chartPart: "era band" },
      group: "era",
    })
  })

  NATHANS_EVENTS.forEach((event) => {
    nodes.push({
      type: "rect",
      x: x(event.year) - 7,
      y: 0,
      w: 14,
      h: height,
      style: { fill: "#f9ddb0", opacity: 0.2 },
      datum: { ...event, chartPart: "event band" },
      group: "event",
    })
  })

  nodes.push({
    type: "area",
    topPath: menRows.map((row) => [x(row.year), y(row.count)]),
    bottomPath: menRows.map((row) => [x(row.year), y(0)]),
    curve: "monotoneX",
    style: { fill: "rgba(215, 160, 47, 0.13)", stroke: "none" },
    datum: { id: "men-area", chartPart: "men count area" },
    group: "Men",
    interactive: false,
  })

  nodes.push({
    type: "line",
    path: recordRows.map((row) => [x(row.year), y(row.record)]),
    curve: "monotoneX",
    style: {
      fill: "none",
      stroke: "rgba(255, 248, 214, 0.44)",
      strokeWidth: 2,
      strokeDasharray: "5 6",
    },
    datum: { id: "running-record", chartPart: "running men's record" },
    group: "record",
  })

  nodes.push({
    type: "line",
    path: menRows.map((row) => [x(row.year), y(row.count)]),
    rawValues: menRows.map((row) => row.count),
    curve: "monotoneX",
    style: {
      fill: "none",
      stroke: "#ffc20a",
      strokeWidth: 7,
      strokeLinecap: "round",
    },
    datum: { id: "men-line", chartPart: "men count line" },
    group: "Men",
  })

  womenSegments.forEach((segment) => {
    nodes.push({
      type: "line",
      path: segment.map((row) => [x(row.year), y(row.count)]),
      rawValues: segment.map((row) => row.count),
      curve: "monotoneX",
      style: {
        fill: "none",
        stroke: "#f18ca2",
        strokeWidth: 4,
        strokeLinecap: "round",
      },
      datum: {
        id: `women-line-${segment[0].year}`,
        chartPart: "women count line",
      },
      group: "Women",
    })
  })

  rows.forEach((row) => {
    const color = row.gender === "Women" ? "#f18ca2" : "#ffc20a"
    nodes.push({
      type: "point",
      x: x(row.year),
      y: y(row.count),
      r: row.gender === "Women" ? 5.2 : 3.6,
      style: {
        fill: color,
        stroke: "#fff1b8",
        strokeWidth: 1.4,
      },
      datum: { ...row, chartPart: "winning count point" },
      accessibleDatum: {
        year: row.year,
        division: row.division || row.gender,
        winner: row.winner,
        hdb: row.count,
      },
      pointId: `trajectory-${row.year}-${row.gender}`,
      group: row.gender,
    })
  })

  const overlays = (
    <g className="hotdog__trajectory-overlay">
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1="0" x2={width} y1={y(tick)} y2={y(tick)} />
          <text x="-12" y={y(tick) + 4} textAnchor="end">
            {tick}
          </text>
        </g>
      ))}
      {xTicks.map((tick) => (
        <g key={tick}>
          <line x1={x(tick)} x2={x(tick)} y1={height} y2={height + 6} />
          <text x={x(tick)} y={height + 26} textAnchor="middle">
            {tick}
          </text>
        </g>
      ))}
      {NATHANS_EVENTS.map((event, index) => (
        <text
          key={event.year}
          x={Math.min(width - 68, x(event.year) + 12)}
          y={20 + (index % 2) * 17}
          className="hotdog__trajectory-event-label"
        >
          {event.shortLabel}
        </text>
      ))}
      {row2010 ? (
        <g>
          <line
            x1={x(row2010.year) - 48}
            x2={x(row2010.year)}
            y1={y(row2010.count) - 32}
            y2={y(row2010.count)}
            className="hotdog__trajectory-callout-line"
          />
          <text
            x={x(row2010.year) - 54}
            y={y(row2010.count) - 36}
            textAnchor="end"
            className="hotdog__trajectory-label"
          >
            <tspan x={x(row2010.year) - 54} dy="0">
              2010 source value
            </tspan>
            <tspan x={x(row2010.year) - 54} dy="18">
              54 HDB, not 58
            </tspan>
          </text>
        </g>
      ) : null}
      {latestMen ? (
        <text
          x={Math.min(width - 4, x(latestMen.year) + 10)}
          y={y(latestMen.count) + 4}
          className="hotdog__trajectory-label"
        >
          Men&apos;s {countLabel(latestMen.count)}
        </text>
      ) : null}
      {latestWomen ? (
        <text
          x={Math.min(width - 4, x(latestWomen.year) + 10)}
          y={y(latestWomen.count) + 4}
          className="hotdog__trajectory-label"
        >
          Women&apos;s {countLabel(latestWomen.count)}
        </text>
      ) : null}
      <text x="0" y="-18" className="hotdog__trajectory-title">
        Winning HDB per documented contest year, by division
      </text>
      <text x="0" y={height + 46} className="hotdog__trajectory-source">
        Source: Nathan&apos;s/MLE records as compiled in the by-year table. Separate women&apos;s
        contest begins in 2011.
      </text>
    </g>
  )

  return { nodes, overlays }
}

function PaceMirrorChart() {
  const [panelWidth, panelRef] = useResponsiveWidth(320, 980)
  const chartWidth = Math.max(720, panelWidth)

  return (
    <div className="hotdog__pace-panel">
      <div className="hotdog__chart-scroll" ref={panelRef}>
        <XYCustomChart
          data={NATHANS_RESULTS}
          layout={paceMirrorLayout}
          width={chartWidth}
          height={420}
          margin={{ top: 28, right: 68, bottom: 42, left: 60 }}
          className="hotdog__pace"
          xExtent={[NATHANS_START_YEAR - 0.5, NATHANS_END_YEAR + 0.5]}
          yExtent={[0, 1]}
          enableHover
          accessibleTable
          description="A Semiotic custom mirror chart comparing total HDB with duration-normalized HDB per minute for Nathan's winners."
          summary="Each result emits two Semiotic rect scene nodes, one for total count and one for pace, with event labels moved into a separate key to avoid annotation clutter."
          frameProps={{ background: PAPER }}
        />
      </div>
      <div className="hotdog__pace-notes">
        <div className="hotdog__pace-summary">
          <strong>Peaks</strong>
          <span>Overall: 76 HDB in 2021. Women&apos;s: 51 HDB in 2024.</span>
        </div>
        <ol className="hotdog__pace-event-key" aria-label="Duration mirror event key">
          {NATHANS_EVENTS.map((event) => (
            <li key={event.year}>
              <strong>{event.year}</strong>
              {event.label}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function paceMirrorLayout(ctx) {
  const rows = ctx.data
  if (rows.length === 0) return { nodes: [] }
  const { width, height } = ctx.dimensions.plot
  const x = ctx.scales.x
  const maxRate = 8
  const laneHeight = Math.max(92, Math.min(116, (height - 96) / 2))
  const countBase = 34 + laneHeight
  const paceBase = countBase + 36
  const axisY = paceBase + laneHeight + 25
  const yearSpan = NATHANS_END_YEAR - NATHANS_START_YEAR
  const barWidth = Math.max(6, (width / (yearSpan + 1)) * 0.64)
  const divisionBarWidth = Math.max(3.5, Math.min(9, barWidth * 0.46))
  const xTicks = [1972, 1980, 1990, 2000, 2010, 2020, 2026]
  const peakRows = [
    rows.find((row) => row.year === 2021 && row.gender === "Men"),
    rows.find((row) => row.year === 2024 && row.gender === "Women"),
  ].filter(Boolean)
  const nodes = []

  rows.forEach((row) => {
    const rate = contestRate(row)
    const color = row.gender === "Women" ? WOMEN_COLOR : eraForYear(row.year)?.color || BLUE
    const paceColor = row.gender === "Women" ? WOMEN_COLOR : row.year >= 2008 ? KETCHUP : RELISH
    const countHeight = (row.count / MAX_COUNT) * laneHeight
    const rateHeight = (rate / maxRate) * laneHeight
    const offset = row.gender === "Women" ? divisionBarWidth * 0.72 : -divisionBarWidth * 0.72
    const left = x(row.year) + offset - divisionBarWidth / 2

    nodes.push({
      type: "rect",
      x: left,
      y: countBase - countHeight,
      w: divisionBarWidth,
      h: countHeight,
      roundedTop: 2,
      roundedEdge: "top",
      style: { fill: color, opacity: 0.86 },
      datum: { ...row, chartPart: "total HDB bar", measure: "total HDB", value: row.count },
      accessibleDatum: {
        year: row.year,
        division: row.division || row.gender,
        winner: row.winner,
        totalHdb: row.count,
      },
      group: row.gender,
    })
    nodes.push({
      type: "rect",
      x: left,
      y: paceBase,
      w: divisionBarWidth,
      h: rateHeight,
      roundedTop: 2,
      roundedEdge: "bottom",
      style: { fill: paceColor, opacity: 0.78 },
      datum: {
        ...row,
        chartPart: "duration-normalized pace bar",
        measure: "HDB per minute",
        value: rate,
      },
      accessibleDatum: {
        year: row.year,
        division: row.division || row.gender,
        winner: row.winner,
        hdbPerMinute: Number(rate.toFixed(2)),
      },
      group: row.gender,
    })
  })

  peakRows.forEach((row) => {
    const offset = row.gender === "Women" ? divisionBarWidth * 0.72 : -divisionBarWidth * 0.72
    const countHeight = (row.count / MAX_COUNT) * laneHeight
    nodes.push({
      type: "point",
      x: x(row.year) + offset,
      y: countBase - countHeight - 9,
      r: 7,
      style: {
        fill: "rgba(251, 244, 228, 0.82)",
        stroke: row.gender === "Women" ? WOMEN_COLOR : MEN_COLOR,
        strokeWidth: 2.4,
      },
      datum: { ...row, chartPart: "peak marker" },
      accessibleDatum: {
        year: row.year,
        division: row.division || row.gender,
        winner: row.winner,
        hdb: row.count,
        peak: true,
      },
      pointId: `pace-peak-${row.year}-${row.gender}`,
      group: row.gender,
    })
  })

  const overlays = (
    <g className="hotdog__pace-overlay">
      <text x="0" y="14" className="hotdog__pace-title">
        Total count and duration-normalized pace
      </text>
      <text x="0" y={countBase - laneHeight + 15} className="hotdog__pace-lane-label">
        Total HDB
      </text>
      <text x="0" y={paceBase + 16} className="hotdog__pace-lane-label">
        HDB per minute
      </text>
      <line x1="0" x2={width} y1={countBase} y2={countBase} className="hotdog__pace-base" />
      <line x1="0" x2={width} y1={paceBase} y2={paceBase} className="hotdog__pace-base" />
      {[20, 40, 60, 80].map((tick) => (
        <g key={`count-${tick}`}>
          <line
            x1="0"
            x2={width}
            y1={countBase - (tick / MAX_COUNT) * laneHeight}
            y2={countBase - (tick / MAX_COUNT) * laneHeight}
            className="hotdog__pace-grid"
          />
          <text x="-10" y={countBase - (tick / MAX_COUNT) * laneHeight + 4} textAnchor="end">
            {tick}
          </text>
        </g>
      ))}
      {[2, 4, 6, 8].map((tick) => (
        <g key={`rate-${tick}`}>
          <line
            x1="0"
            x2={width}
            y1={paceBase + (tick / maxRate) * laneHeight}
            y2={paceBase + (tick / maxRate) * laneHeight}
            className="hotdog__pace-grid"
          />
          <text x="-10" y={paceBase + (tick / maxRate) * laneHeight + 4} textAnchor="end">
            {tick}
          </text>
        </g>
      ))}
      {NATHANS_EVENTS.map((event) => (
        <g key={event.year} className="hotdog__pace-event">
          <line x1={x(event.year)} x2={x(event.year)} y1="24" y2={axisY - 26} />
        </g>
      ))}
      {xTicks.map((tick) => (
        <g key={tick}>
          <line x1={x(tick)} x2={x(tick)} y1={axisY} y2={axisY + 5} className="hotdog__pace-base" />
          <text x={x(tick)} y={axisY + 22} textAnchor="middle">
            {tick}
          </text>
        </g>
      ))}
    </g>
  )

  return { nodes, overlays }
}

function HotDogRaceBars() {
  const [panelWidth, panelRef] = useResponsiveWidth(320, 980)
  const chartWidth = Math.max(650, panelWidth)
  const menRef = useRef(null)
  const womenRef = useRef(null)
  const menEvents = useMemo(() => raceEventsForGender("Men"), [])
  const womenEvents = useMemo(() => raceEventsForGender("Women"), [])
  const years = useMemo(
    () => Array.from(new Set(NATHANS_RESULTS.map((row) => row.year))).sort((a, b) => a - b),
    [],
  )
  const menByYear = useMemo(() => raceEventsByYear(menEvents), [menEvents])
  const womenByYear = useMemo(() => raceEventsByYear(womenEvents), [womenEvents])
  const [runId, setRunId] = useState(0)
  const [snapshot, setSnapshot] = useState(() => raceInitialSnapshot(years[0]))

  useEffect(() => {
    const menFrame = menRef.current
    const womenFrame = womenRef.current
    if (!menFrame || !womenFrame || years.length === 0) return undefined

    menFrame.clear()
    womenFrame.clear()

    const ticksPerYear = Math.max(1, Math.round(RACE_YEAR_DURATION_MS / RACE_TICK_MS))
    const menTotals = new Map()
    const womenTotals = new Map()
    let yearIndex = 0
    let yearTick = 0
    let pushIndex = 0

    setSnapshot(raceInitialSnapshot(years[0]))

    const interval = window.setInterval(() => {
      const year = years[yearIndex]
      const progress = Math.min(1, (yearTick + 1) / ticksPerYear)
      const menYearEvents = menByYear.get(year) || []
      const womenYearEvents = womenByYear.get(year) || []
      const menRows = raceIncrementRows(menYearEvents, ticksPerYear, pushIndex)
      const womenRows = raceIncrementRows(womenYearEvents, ticksPerYear, pushIndex)

      if (menRows.length > 0) menFrame.pushMany(menRows)
      if (womenRows.length > 0) womenFrame.pushMany(womenRows)
      applyRaceIncrements(menTotals, menRows)
      applyRaceIncrements(womenTotals, womenRows)

      yearTick += 1
      pushIndex += 1

      const finishedYear = yearTick >= ticksPerYear
      const finishedRace = finishedYear && yearIndex >= years.length - 1

      setSnapshot({
        year,
        progress,
        running: !finishedRace,
        activeMen: raceActiveLabel(menYearEvents),
        activeWomen: raceActiveLabel(womenYearEvents),
        menLeader: raceLeader(menTotals),
        womenLeader: raceLeader(womenTotals),
        menTotals: mapToRaceObject(menTotals),
        womenTotals: mapToRaceObject(womenTotals),
      })

      if (finishedRace) {
        window.clearInterval(interval)
        return
      }

      if (finishedYear) {
        yearIndex += 1
        yearTick = 0
      }
    }, RACE_TICK_MS)

    return () => window.clearInterval(interval)
  }, [menByYear, runId, womenByYear, years])

  return (
    <div className="hotdog__race" ref={panelRef}>
      <div className="hotdog__race-controls">
        <div>
          <span>Streaming year</span>
          <strong>{snapshot.year}</strong>
        </div>
        <div className="hotdog__race-progress" aria-label="Current year progress">
          <i style={{ width: `${Math.round(snapshot.progress * 100)}%` }} />
        </div>
        <button type="button" onClick={() => setRunId((value) => value + 1)}>
          Restart race
        </button>
      </div>
      <div className="hotdog__race-grid">
        <RaceOrdinalChart
          refHandle={menRef}
          title="Men's / open cumulative HDB"
          gender="Men"
          width={chartWidth}
          height={560}
          totals={snapshot.menTotals}
          leader={snapshot.menLeader}
          active={snapshot.activeMen}
        />
        <RaceOrdinalChart
          refHandle={womenRef}
          title="Women's cumulative HDB"
          gender="Women"
          width={chartWidth}
          height={250}
          totals={snapshot.womenTotals}
          leader={snapshot.womenLeader}
          active={snapshot.activeWomen}
        />
      </div>
    </div>
  )
}

function RaceOrdinalChart({ refHandle, title, gender, width, height, totals, leader, active }) {
  const color = RACE_COLORS[gender]
  const raceForegroundGraphics = useMemo(
    () => raceValueLabelLayer(totals, color),
    [color, totals],
  )
  return (
    <div className="hotdog__race-card">
      <div className="hotdog__race-card-header">
        <div>
          <span>{gender === "Men" ? "Mustard stream" : "Ketchup stream"}</span>
          <h4>{title}</h4>
        </div>
        <div className="hotdog__race-leader">
          <span>Leader</span>
          <strong>{leader ? `${leader.name} · ${countLabel(leader.value)} HDB` : "Waiting"}</strong>
        </div>
      </div>
      <div className="hotdog__race-active">{active}</div>
      <div className="hotdog__race-chart-scroll">
        <StreamOrdinalFrame
          ref={refHandle}
          chartType="bar"
          runtimeMode="streaming"
          projection="horizontal"
          categoryAccessor="competitor"
          valueAccessor="value"
          size={[width, height]}
          margin={{ top: 34, right: 82, bottom: 54, left: 160 }}
          windowSize={6000}
          oSort="desc"
          barPadding={14}
          roundedTop={5}
          gradientFill={{ topOpacity: 0.9, bottomOpacity: 0.26 }}
          pieceStyle={() => ({
            fill: color,
            stroke: "rgba(255, 245, 204, 0.62)",
            strokeWidth: 1,
          })}
          background={RACE_BACKGROUND}
          showGrid
          showCategoryTicks
          categoryLabel="Competitor"
          valueLabel="Cumulative HDB"
          valueFormat={(value) => countLabel(value)}
          animate={{ duration: RACE_TICK_MS, easing: "linear", intro: false }}
          foregroundGraphics={raceForegroundGraphics}
          enableHover
          accessibleTable={false}
          className="hotdog__race-frame"
          description={`${title} streamed through Semiotic StreamOrdinalFrame with descending value sorting.`}
          summary="Increment rows are pushed into the frame as each historical year plays; Semiotic aggregates by competitor and re-ranks the ordinal bars by cumulative HDB."
        />
      </div>
    </div>
  )
}

function raceEventsForGender(gender) {
  return NATHANS_RESULTS.flatMap((row) => {
    if (row.gender !== gender) return []
    return splitWinnerNames(row.winner).map((competitor, competitorIndex) => ({
      id: `${gender}-${row.year}-${competitorIndex}-${slugForRace(competitor)}`,
      competitor,
      year: row.year,
      gender,
      division: row.division || (gender === "Women" ? "Women's" : "Men's / open"),
      value: row.count,
    }))
  })
}

function splitWinnerNames(winner) {
  return winner
    .split(" / ")
    .map((name) => name.trim())
    .filter(Boolean)
}

function raceEventsByYear(events) {
  const byYear = new Map()
  events.forEach((event) => {
    if (!byYear.has(event.year)) byYear.set(event.year, [])
    byYear.get(event.year).push(event)
  })
  return byYear
}

function raceIncrementRows(events, ticksPerYear, pushIndex) {
  return events.map((event) => ({
    id: `${event.id}-${pushIndex}`,
    competitor: event.competitor,
    gender: event.gender,
    division: event.division,
    year: event.year,
    annualHdb: event.value,
    value: event.value / ticksPerYear,
  }))
}

function applyRaceIncrements(totals, rows) {
  rows.forEach((row) => {
    totals.set(row.competitor, roundHdb((totals.get(row.competitor) || 0) + row.value))
  })
}

function raceInitialSnapshot(year) {
  return {
    year,
    progress: 0,
    running: true,
    activeMen: "Waiting for the first streamed bite",
    activeWomen: "Waiting for the first streamed bite",
    menLeader: null,
    womenLeader: null,
    menTotals: {},
    womenTotals: {},
  }
}

function raceActiveLabel(events) {
  if (events.length === 0) return "No documented winner in this division for this year"
  return events
    .map((event) => `${event.competitor} · ${countLabel(event.value)} HDB`)
    .join(" + ")
}

function raceLeader(totals) {
  let leader = null
  totals.forEach((value, name) => {
    if (!leader || value > leader.value) leader = { name, value }
  })
  return leader
}

function mapToRaceObject(totals) {
  return Object.fromEntries(Array.from(totals, ([name, value]) => [name, roundHdb(value)]))
}

function raceValueLabelLayer(totals, color) {
  // Foreground graphics receive StreamOrdinalFrame's resolved scales, so the
  // labels anchor to the same animated bar positions instead of re-deriving
  // pixel math from the data stream.
  return ({ scales }) => {
    if (!scales) return null
    const band = scales.o.bandwidth()
    const rangeMax = scales.r.range()[1]
    return (
      <g className="hotdog__race-value-labels">
        {scales.o.domain().map((competitor) => {
          const value = totals[competitor] || 0
          if (value <= 0) return null
          const x = scales.r(value)
          const y = (scales.o(competitor) || 0) + band / 2
          const nearRightEdge = x > rangeMax - 54
          return (
            <text
              key={competitor}
              x={nearRightEdge ? rangeMax - 4 : x + 7}
              y={y + 4}
              textAnchor={nearRightEdge ? "end" : "start"}
              fill={color}
            >
              {countLabel(roundHdb(value))}
            </text>
          )
        })}
      </g>
    )
  }
}

function roundHdb(value) {
  return Math.round(value * 1000) / 1000
}

function slugForRace(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function HotDogIcon({ x = 0, y = 0, width = 18, height = 12, sausage, bun, mustard }) {
  const scaleX = width / 18
  const scaleY = height / 12
  return (
    <g transform={`translate(${x} ${y}) scale(${scaleX} ${scaleY})`}>
      <path
        d="M1.2 7.2C1.2 4.6 3.4 2.6 6.1 2.6h5.8c2.7 0 4.9 2 4.9 4.6s-2.2 4.6-4.9 4.6H6.1c-2.7 0-4.9-2-4.9-4.6Z"
        fill={bun}
      />
      <path
        d="M2.7 6.4C2.7 4.8 4 3.7 5.7 3.7h6.6c1.7 0 3 1.1 3 2.7s-1.3 2.7-3 2.7H5.7c-1.7 0-3-1.1-3-2.7Z"
        fill={sausage}
      />
      <path
        d="M4.3 6.1c1.4-1.4 2.6 1.3 4 0s2.6 1.3 4 0"
        fill="none"
        stroke={mustard}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </g>
  )
}

function HotDogBadge() {
  return (
    <svg viewBox="0 0 96 96" role="img" aria-label="Hot dog chart mark">
      <circle cx="48" cy="48" r="43" fill="#fff4d3" stroke={INK} strokeWidth="4" />
      <HotDogIcon
        x={19}
        y={28}
        width={58}
        height={38}
        sausage={KETCHUP}
        bun="#f0c987"
        mustard="#fff2a8"
      />
      <path d="M29 66h38" stroke={RELISH} strokeWidth="5" strokeLinecap="round" />
      <text x="48" y="82" textAnchor="middle" fill={INK} fontSize="11" fontWeight="900">
        HDB
      </text>
    </svg>
  )
}

function runningRecords(rows) {
  let record = 0
  return rows.map((row) => {
    record = Math.max(record, row.count)
    return { year: row.year, record }
  })
}

function eraForYear(year) {
  return NATHANS_ERAS.find((era) => year >= era.start && year <= era.end)
}
