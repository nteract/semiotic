import React, { useCallback, useMemo, useState } from "react"
import { OrdinalCustomChart, ThemeProvider } from "semiotic"
// Custom-chart kit: the interval-lanes recipe (packed Gantt sub-tracks + period
// bands + lane labels + time axis), the temporal-density helper for the
// concurrency line, the onObservation datum unwrapper, and withAlpha to express
// the hover-dim as a fill color (it survives the recipe's color callback).
import {
  intervalLanesLayout,
  activeCountOverDomain,
  unwrapDatum,
  withAlpha,
} from "semiotic/recipes"
import CodeBlock from "../../components/CodeBlock"
import { StatStrip } from "../../components/StatStrip"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  PEACE_YEARS,
  US_WARS,
  WAR_COLORS,
  WAR_DOMAIN,
  WAR_PERIODS,
  WAR_SPHERES,
} from "./data/usWars"

const AXIS_TICKS = [1775, 1800, 1825, 1850, 1875, 1900, 1925, 1950, 1975, 2000, 2026]
const WAR_PERIOD_ANNOTATIONS = WAR_PERIODS.map((period, index) => ({
  type: "x-band",
  x0: period.start,
  x1: period.end,
  label: period.name,
  fill: "var(--semiotic-text-secondary)",
  color: "var(--semiotic-text-secondary)",
  // Border-gray at 0.06 is imperceptible over the carbon surface; alternating
  // a stronger/weaker text-secondary fill gives the eras a visible rhythm
  // without competing with the conflict bars.
  fillOpacity: index % 2 === 0 ? 0.14 : 0.07,
}))

// activeCountOverDomain: conflicts active in each year — the concurrency series
// drawn as a step line beneath the lanes (was precomputed in the data file).
const WAR_COUNTS_BY_YEAR = activeCountOverDomain(US_WARS, {
  start: "startYear",
  end: "endYear",
  domain: WAR_DOMAIN,
}).map((c) => ({ year: c.value, count: c.count }))

const CHART_HEIGHT = 650
const MIN_CHART_WIDTH = 900

const implementationCode = `import { intervalLanesLayout, activeCountOverDomain } from "semiotic/recipes"

// The recipe owns the packed sub-tracks, period bands, lane labels, and time
// axis. We reserve a bottom strip and compose the concurrency line on top.
const warTimelineLayout = (ctx) => {
  const base = intervalLanesLayout({
    ...ctx,
    config: {
      laneAccessor: "sphere",
      startAccessor: "startYear",
      endAccessor: "endYear",
      domain: [1770, 2026],
      lanes: SPHERES,
      unit: 1,
      minBarWidth: 5,
      bottomInset: 82,
      color: (war, sphere) => COLORS[sphere],
    },
  })
  return { nodes: base.nodes, overlays: <>{base.overlays}<ConcurrencyLine /></> }
}

const countsByYear = activeCountOverDomain(wars, {
  start: "startYear", end: "endYear", domain: [1770, 2026],
})

<OrdinalCustomChart
  data={wars}
  layout={warTimelineLayout}
  categoryAccessor="sphere"
  valueAccessor="startYear"
  oExtent={SPHERES}
  rExtent={[1770, 2026]}
  projection="horizontal"
  annotations={periods.map(period => ({
    type: "x-band", x0: period.start, x1: period.end, label: period.name
  }))}
  width={width}
  height={650}
/>`

export default function USWarTimelineExamplePage() {
  const [hoveredWar, setHoveredWar] = useState(null)
  const [chartWidth, chartHostRef] = useResponsiveWidth(MIN_CHART_WIDTH)
  const [docsTheme] = useDocsTheme()
  const carbonTheme = docsTheme === "dark" ? "carbon-dark" : "carbon"

  const activeWar = hoveredWar || US_WARS[0]
  const longestWar = useMemo(
    () =>
      US_WARS.reduce((longest, war) =>
        war.endTime - war.startTime > longest.endTime - longest.startTime ? war : longest,
      ),
    [],
  )
  const maxConcurrent = Math.max(...WAR_COUNTS_BY_YEAR.map((year) => year.count))
  const handleObservation = useCallback((observation) => {
    if (observation.type === "hover" && observation.datum) {
      // unwrapDatum collapses the wrapped-vs-raw datum split — always the raw war.
      const war = unwrapDatum(observation.datum)
      setHoveredWar(war?.link ? war : null)
    } else if (observation.type === "hover-end") {
      setHoveredWar(null)
    }
  }, [])

  return (
    <ExamplePageLayout title="All the Wars of the United States">
      <p style={styles.lede}>
        Charts of war usually focus on casualties. But what does it mean when there are "only" a few
        hundred casualties but it wipes out a culture? What does it mean when there are many
        low-level wars in different parts of the world? This timeline shows wars as described on
        Wikipedia that the United States has taken part of during its existence and splits the
        periods using CKMeans revealing what seem to be very clear semantic periods: A revolutionary
        period focused on establishing the early United States, a period of conquest internally and
        with the beginnings of a colonial influence, a time of growing international influence and
        the current Pax Americana which, like the Pax Romana, is rarely closes the doors of the
        Temple of Jupiter.
      </p>

      <StatStrip
        ariaLabel="Timeline summary"
        items={[
          { value: US_WARS.length, label: "conflicts" },
          { value: maxConcurrent, label: "maximum concurrent" },
          { value: PEACE_YEARS.length, label: "years without a listed war" },
          {
            value: `${longestWar.endYear - longestWar.startYear + 1} years`,
            label: longestWar.name,
          },
        ]}
      />

      <ThemeProvider theme={carbonTheme}>
        <section style={styles.visualPanel} aria-label="Interactive timeline of United States wars">
          <div style={styles.chartIntro}>
            <div>
              <div style={styles.kicker}>1775–2026 · five spheres</div>
              <h2 style={styles.chartTitle}>Conflict as a continuous condition</h2>
            </div>
            <div style={styles.interactionHint}>Hover a conflict to inspect it</div>
          </div>

          <div style={styles.activeWar} aria-live="polite">
            <span
              style={{
                ...styles.activeSwatch,
                background: WAR_COLORS[activeWar.sphere],
              }}
            />
            <div style={styles.activeCopy}>
              <strong data-testid="active-war-name">{activeWar.name}</strong>
              <span>
                {formatWarDates(activeWar)} · {activeWar.sphere}
              </span>
            </div>
            <a
              href={activeWar.link}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.sourceLink}
            >
              Read source ↗
            </a>
          </div>

          <div ref={chartHostRef} style={styles.chartScroller}>
            <OrdinalCustomChart
              data={US_WARS}
              layout={warTimelineLayout}
              chartId="us-war-timeline"
              // Hover rides the shared selection store instead of layoutConfig:
              // the layout's `restyle` re-paints existing bars (no re-pack of
              // ~120 intervals, no quadtree rebuild) on every hover change.
              selection={{ name: "us-wars-hover" }}
              linkedHover={{ name: "us-wars-hover", fields: ["id"] }}
              categoryAccessor="sphere"
              valueAccessor="startYear"
              oExtent={WAR_SPHERES}
              rExtent={WAR_DOMAIN}
              projection="horizontal"
              annotations={WAR_PERIOD_ANNOTATIONS}
              width={chartWidth}
              height={CHART_HEIGHT}
              margin={{ top: 72, right: 24, bottom: 36, left: 112 }}
              enableHover
              onObservation={handleObservation}
              description={`Timeline of ${US_WARS.length} United States conflicts from 1775 through 2026, grouped into European, Native, Colonial, Latin American, and Internal spheres.`}
              summary={`${PEACE_YEARS.length} years in the period have no listed active war.`}
              accessibleTable
              frameProps={{
                background: "transparent",
                tooltipContent: renderWarTooltip,
              }}
            />
          </div>

          <div style={styles.legend} aria-label="Conflict sphere legend">
            {WAR_SPHERES.map((sphere) => (
              <div key={sphere} style={styles.legendItem}>
                <span style={{ ...styles.legendSwatch, background: WAR_COLORS[sphere] }} />
                {sphere}
              </div>
            ))}
          </div>
        </section>
      </ThemeProvider>

      <section style={styles.editorial}>
        <h2>Four eras of violence</h2>
        <p>
          The early conflicts center on sovereignty and survival. The long nineteenth-century middle
          is dominated by forced expansion across Native lands. Later periods shift toward overseas
          intervention, regional influence, and finally sustained global military reach.
        </p>

        <h2>Concurrency makes continuity visible</h2>
        <p>
          The line beneath the lanes counts active conflicts in each year. Long-running campaigns
          overlap many shorter actions, making the timeline read less like isolated episodes and
          more like overlapping systems of military activity.
        </p>
      </section>

      <section style={styles.peaceSection}>
        <div style={styles.peaceHeader}>
          <div>
            <div style={styles.kicker}>The inverse view</div>
            <h2 style={styles.peaceTitle}>All the Peace of the United States</h2>
          </div>
          <div style={styles.peaceCount}>{PEACE_YEARS.length} years</div>
        </div>
        <p style={styles.peaceCopy}>
          Each dot marks a year in which none of the conflicts in this dataset was active. Reading
          the absences alongside the war lanes makes their scarcity explicit.
        </p>
        <div style={styles.chartScroller}>
          <PeaceTimeline width={chartWidth} />
        </div>
      </section>

      <section style={styles.editorial}>
        <h2>Why a custom ordinal layout?</h2>
        <p>
          Semiotic owns the frame, responsive rendering, scene graph, accessibility table, and
          theme. The custom layout supplies the domain-specific geometry: packed interval bars
          within five ordinal lanes, period bands, a shared time axis, focus targets, and the
          concurrent-war line.
        </p>
        <CodeBlock language="jsx" showCopyButton code={implementationCode} />

        <p style={styles.sourceNote}>
          Adapted from Elijah Meeks&apos;{" "}
          <a href="https://elijahmeeks.com/wars/" target="_blank" rel="noopener noreferrer">
            full war timeline
          </a>{" "}
          and the earlier{" "}
          <a
            href="https://blocks.roadtolarissa.com/emeeks/3184af35f4937d878ac0"
            target="_blank"
            rel="noopener noreferrer"
          >
            categorized timeline
          </a>
          . The historical list begins with the source&apos;s 2015 snapshot and is extended through
          July 1, 2026 from official Defense Department, combatant-command, and NATO records. It
          remains one contestable perspective, not an authoritative taxonomy.
        </p>
      </section>
    </ExamplePageLayout>
  )
}

function warTimelineLayout(ctx) {
  const { width, height } = ctx.dimensions.plot
  const concurrencyHeight = 82

  // intervalLanesLayout owns the generic timeline geometry: greedy-packed
  // sub-tracks per sphere (packIntervals), alternating period bands, lane
  // labels, and the dashed time axis (linearAxis). We reserve the bottom strip
  // for the concurrency line and compose the era labels + step line on top of
  // the recipe's own overlays.
  const base = intervalLanesLayout({
    ...ctx,
    config: {
      laneAccessor: "sphere",
      startAccessor: "startYear",
      endAccessor: "endYear",
      domain: WAR_DOMAIN,
      lanes: WAR_SPHERES,
      unit: 1,
      minBarWidth: 5,
      idAccessor: "id",
      bottomInset: concurrencyHeight,
      axisTicks: AXIS_TICKS,
      color: (war, sphere) => withAlpha(WAR_COLORS[sphere], 0.96),
    },
  })
  const nodes = base.nodes

  // Bespoke chrome: the concurrency step line, anchored to the frame's own
  // resolved r-scale (the same one the x-band era annotations use) so the line
  // cannot drift from the bars or bands. Era shading is supplied by native
  // x-band annotations on the frame.
  const xPx = (year) => ctx.scales.r(year)
  const maxConcurrent = Math.max(1, ...WAR_COUNTS_BY_YEAR.map((entry) => entry.count))
  const lineTop = height - concurrencyHeight + 18
  const lineBottom = height - 12
  const countY = (count) => lineBottom - (count / maxConcurrent) * (lineBottom - lineTop)
  const concurrentPath = WAR_COUNTS_BY_YEAR.map((entry, index) =>
    index === 0
      ? `M${xPx(entry.year)},${countY(entry.count)}`
      : `H${xPx(entry.year)} V${countY(entry.count)}`,
  ).join(" ")

  const overlays = (
    <g>
      {base.overlays}
      <line y1={lineTop - 6} y2={lineTop - 6} x2={width} stroke="var(--semiotic-border)" />
      <text
        x="-12"
        y={lineTop + 10}
        textAnchor="end"
        fill="var(--semiotic-text-secondary)"
        fontSize="10"
      >
        Concurrent
      </text>
      <text
        x="-12"
        y={lineTop + 23}
        textAnchor="end"
        fill="var(--semiotic-text-secondary)"
        fontSize="10"
      >
        wars
      </text>
      <path
        d={concurrentPath}
        fill="none"
        stroke="var(--semiotic-text-secondary)"
        strokeWidth="1.75"
        opacity="0.9"
      />
    </g>
  )

  return {
    nodes,
    overlays,
    // Hover styling without a relayout: the frame re-applies this to the
    // existing bars (off each bar's base style) and repaints — geometry and
    // quadtree stay untouched. The hovered conflict keeps full ink and gains
    // the white outline; everything else recedes.
    restyle: (node, selection) => {
      const war = node.datum
      if (!selection?.isActive || !war?.id) return undefined
      return selection.predicate(war)
        ? { stroke: "var(--semiotic-text)", strokeWidth: 1.5 }
        : { fillOpacity: 0.22 }
    },
  }
}

function yearScale(width) {
  return (year) => ((year - WAR_DOMAIN[0]) / (WAR_DOMAIN[1] - WAR_DOMAIN[0])) * width
}

function formatWarDates(war) {
  if (war.ongoing) return `${war.startYear}–present`
  if (war.startYear === war.endYear) return String(war.startYear)
  return `${war.startYear}–${war.endYear}`
}

const WAR_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

function renderWarTooltip(hoverData) {
  const war = unwrapDatum(hoverData)
  if (!war?.name) return null
  return (
    <div style={{ minWidth: 190 }}>
      <div style={{ fontWeight: 700 }}>{war.name}</div>
      <div style={{ marginTop: 4 }}>
        <span style={{ opacity: 0.7 }}>Category:</span> {war.sphere}
      </div>
      <div style={{ marginTop: 2 }}>
        <span style={{ opacity: 0.7 }}>Start:</span>{" "}
        {WAR_DATE_FORMAT.format(new Date(war.startTime))}
      </div>
      <div style={{ marginTop: 2 }}>
        <span style={{ opacity: 0.7 }}>End:</span>{" "}
        {war.ongoing
          ? "Ongoing (as of Jul 1, 2026)"
          : WAR_DATE_FORMAT.format(new Date(war.endTime))}
      </div>
    </div>
  )
}

function PeaceTimeline({ width }) {
  const height = 92
  const x = yearScale(width - 20)
  const ticks = [1775, 1825, 1875, 1925, 1975, 2026]
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${PEACE_YEARS.length} years without a listed active conflict between 1776 and 2026`}
      style={{ display: "block", minWidth: width }}
    >
      <line x1="10" x2={width - 10} y1="48" y2="48" stroke="var(--semiotic-border)" />
      {ticks.map((year) => (
        <g key={year} transform={`translate(${10 + x(year)},0)`}>
          <line y1="42" y2="54" stroke="var(--semiotic-border)" />
          <text
            y="72"
            textAnchor={year === 1775 ? "start" : year === 2026 ? "end" : "middle"}
            fill="var(--semiotic-text-secondary)"
            fontSize="11"
          >
            {year}
          </text>
        </g>
      ))}
      {PEACE_YEARS.map((year) => (
        <circle key={year} cx={10 + x(year)} cy="48" r="3.2" fill="var(--accent)">
          <title>{year}</title>
        </circle>
      ))}
    </svg>
  )
}

const styles = {
  lede: {
    maxWidth: "820px",
    margin: "0 0 30px",
    color: "var(--text-secondary)",
    fontSize: "19px",
    lineHeight: 1.6,
  },
  visualPanel: {
    overflow: "hidden",
    border: "1px solid var(--semiotic-border)",
    borderRadius: "var(--semiotic-border-radius)",
    background: "var(--semiotic-bg)",
    color: "var(--semiotic-text)",
  },
  chartIntro: {
    padding: "20px 22px 15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: "16px",
    borderBottom: "1px solid var(--semiotic-border)",
  },
  kicker: {
    color: "var(--semiotic-primary)",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.09em",
    textTransform: "uppercase",
  },
  chartTitle: {
    margin: "4px 0 0",
    color: "var(--semiotic-text)",
    fontSize: "22px",
  },
  interactionHint: {
    color: "var(--semiotic-text-secondary)",
    fontSize: "12px",
  },
  activeWar: {
    minHeight: "58px",
    padding: "10px 22px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    borderBottom: "1px solid var(--semiotic-border)",
    background: "var(--semiotic-surface)",
  },
  activeSwatch: {
    width: "9px",
    height: "32px",
    borderRadius: "2px",
    flexShrink: 0,
  },
  activeCopy: {
    display: "grid",
    minWidth: 0,
    fontSize: "13px",
  },
  sourceLink: {
    marginLeft: "auto",
    color: "var(--semiotic-primary)",
    fontSize: "12px",
    fontWeight: 700,
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  chartScroller: {
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
  },
  legend: {
    padding: "12px 22px 16px",
    display: "flex",
    flexWrap: "wrap",
    gap: "9px 18px",
    borderTop: "1px solid var(--semiotic-border)",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    color: "var(--semiotic-text-secondary)",
    fontSize: "11px",
  },
  legendSwatch: {
    width: "14px",
    height: "6px",
    borderRadius: "2px",
  },
  editorial: {
    maxWidth: "780px",
    margin: "52px auto 0",
    color: "var(--text-primary)",
    fontSize: "16px",
    lineHeight: 1.7,
  },
  peaceSection: {
    marginTop: "54px",
    padding: "26px 24px 18px",
    borderTop: "4px solid var(--accent)",
    borderBottom: "1px solid var(--surface-3)",
    background: "var(--surface-1)",
  },
  peaceHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "20px",
  },
  peaceTitle: {
    margin: "5px 0 0",
    color: "var(--text-primary)",
    fontSize: "clamp(1.7rem, 5vw, 3rem)",
  },
  peaceCount: {
    color: "var(--text-primary)",
    fontSize: "24px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  peaceCopy: {
    maxWidth: "720px",
    color: "var(--text-secondary)",
    lineHeight: 1.55,
  },
  sourceNote: {
    marginTop: "30px",
    color: "var(--text-secondary)",
    fontSize: "13px",
  },
}
