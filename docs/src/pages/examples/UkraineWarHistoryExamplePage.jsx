import React, { useCallback, useMemo, useState } from "react"
import { TemporalHistogram, ThemeProvider } from "semiotic"
import { FlowMap } from "semiotic/geo"
import { StackedBarChart } from "semiotic/ordinal"
import { LineChart } from "semiotic/xy"
import { useReducedMotion } from "semiotic/utils"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  AID_DONORS,
  AID_METRICS,
  AID_YEARS,
  GDP_GROWTH,
  KYIV,
  ORYX_CATEGORY_COLORS,
  ORYX_HEADLINE,
  SNAPSHOT,
  UN_VOTE_ROWS,
  UN_VOTES,
  WAR_CHAPTERS,
  aidRowsForYear,
  aidMetricDefinition,
  buildAidFlows,
  formatEuroBillions,
  formatMonth,
  oryxMonthForIndex,
  oryxRowsForCountry,
  oryxRowsForYear,
  sumOryxRows,
} from "./data/ukraineWarHistory"
import "./UkraineWarHistoryExamplePage.css"

const CARTO_TILES = "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
const TILE_ATTRIBUTION = "© OpenStreetMap contributors © CARTO"
// The 10 stops Semiotic's built-in `colorScheme="viridis"` samples. Reusing
// them for the legend ramp guarantees the gradient matches the flow colors.
const VIRIDIS_STOPS = Object.freeze([
  "#440154",
  "#482878",
  "#3e4989",
  "#31688e",
  "#26828e",
  "#1f9e89",
  "#35b779",
  "#6ece58",
  "#b5de2b",
  "#fde725",
])
const VIRIDIS_GRADIENT = `linear-gradient(to right, ${VIRIDIS_STOPS.join(", ")})`
const COUNTRY_COLORS = Object.freeze({ Ukraine: "#5ab0d9", Russia: "#ef8354" })
const VOTE_COLORS = Object.freeze({
  Yes: "#5ab0d9",
  Abstain: "#ffd166",
  No: "#ef8354",
  "Not voting": "#596670",
})
function datumFromHover(hover) {
  return hover?.data?.data ?? hover?.data ?? hover?.datum ?? hover
}

function formatInteger(value) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 })
}

function formatPercent(value) {
  const n = Number(value)
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—"
}

function formatVoteValue(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return "—"
  return n >= 0 && n <= 1 ? `${Math.round(n * 100)}%` : formatInteger(n)
}

export default function UkraineWarHistoryExamplePage() {
  const reducedMotion = useReducedMotion()
  const [aidMetric, setAidMetric] = useState("total")
  const [aidYear, setAidYear] = useState("all")
  const [selectedDonorId, setSelectedDonorId] = useState("united-states")
  const [selectedChapterId, setSelectedChapterId] = useState("opening")
  const [oryxCountry, setOryxCountry] = useState("Russia")
  const [lossYear, setLossYear] = useState("all")
  const [animateFlows, setAnimateFlows] = useState(true)
  const [mapWidth, mapRef] = useResponsiveWidth(320, 1160)
  const [ledgerWidth, ledgerRef] = useResponsiveWidth(320, 1160)
  const [contextWidth, contextRef] = useResponsiveWidth(320, 1160)

  const compact = mapWidth < 690
  // The donor coordinates span from Washington/Ottawa in the west to Tokyo in
  // the east, so the dataset is intrinsically much wider than it is tall. Give
  // the map a banner aspect ratio and let FlowMap auto-fit to the data.
  const mapHeight = compact ? 380 : 460
  const contextChartWidth = contextWidth < 760 ? contextWidth : Math.floor((contextWidth - 30) / 2)
  const aidDefinition = aidMetricDefinition(aidMetric)
  const aidRows = useMemo(() => aidRowsForYear(aidYear), [aidYear])
  const aidFlows = useMemo(() => buildAidFlows(aidMetric, aidYear), [aidMetric, aidYear])
  const selectedDonor =
    aidRows.find((donor) => donor.id === selectedDonorId && donor[aidMetric] > 0) ??
    aidRows.find((donor) => donor[aidMetric] > 0) ??
    aidRows[0] ??
    AID_DONORS[0]
  const rankedDonors = useMemo(
    () => [...aidRows].sort((a, b) => b[aidMetric] - a[aidMetric]),
    [aidMetric, aidRows],
  )
  const maxAid = rankedDonors[0]?.[aidMetric] || 1
  const selectedChapter =
    WAR_CHAPTERS.find((chapter) => chapter.id === selectedChapterId) ?? WAR_CHAPTERS[0]
  const isBothCountries = oryxCountry === "Both"
  const russiaLossRows = useMemo(
    () =>
      lossYear === "all"
        ? oryxRowsForCountry("Russia")
        : oryxRowsForYear("Russia", Number(lossYear)),
    [lossYear],
  )
  const ukraineLossRows = useMemo(
    () =>
      lossYear === "all"
        ? oryxRowsForCountry("Ukraine")
        : oryxRowsForYear("Ukraine", Number(lossYear)),
    [lossYear],
  )
  const oryxRows = isBothCountries
    ? russiaLossRows
    : oryxCountry === "Ukraine"
      ? ukraineLossRows
      : russiaLossRows
  const featuredLossTotal = useMemo(
    () =>
      isBothCountries
        ? sumOryxRows(russiaLossRows) + sumOryxRows(ukraineLossRows)
        : sumOryxRows(oryxRows),
    [isBothCountries, russiaLossRows, ukraineLossRows, oryxRows],
  )
  // Shared upper bound for the mirrored view so Russia (up) and Ukraine (down)
  // are drawn on the same value scale and are directly comparable.
  const oryxValueMax = useMemo(() => {
    const maxMonthlyStack = (rows) => {
      const byMonth = new Map()
      for (const row of rows) {
        byMonth.set(row.monthIndex, (byMonth.get(row.monthIndex) ?? 0) + row.losses)
      }
      let max = 0
      for (const total of byMonth.values()) max = Math.max(max, total)
      return max
    }
    return Math.max(maxMonthlyStack(russiaLossRows), maxMonthlyStack(ukraineLossRows))
  }, [russiaLossRows, ukraineLossRows])
  const oryxTimeExtent = useMemo(() => {
    const indexes = oryxRows.map((row) => row.monthIndex)
    return [Math.min(...indexes), Math.max(...indexes) + 1]
  }, [oryxRows])
  const lossHeadline = isBothCountries
    ? {
        total: ORYX_HEADLINE.Russia.total + ORYX_HEADLINE.Ukraine.total,
        destroyed: ORYX_HEADLINE.Russia.destroyed + ORYX_HEADLINE.Ukraine.destroyed,
        captured: ORYX_HEADLINE.Russia.captured + ORYX_HEADLINE.Ukraine.captured,
      }
    : ORYX_HEADLINE[oryxCountry]
  const displayedAidTotal = useMemo(
    () => aidFlows.reduce((sum, flow) => sum + flow.value, 0),
    [aidFlows],
  )
  const flowByDonorId = useMemo(
    () => new Map(aidFlows.map((flow) => [flow.donorId, flow])),
    [aidFlows],
  )

  const selectChapter = useCallback((chapter) => {
    setSelectedChapterId(chapter.id)
    setLossYear(String(chapter.year))
    setAidYear(chapter.year)
  }, [])

  const aidPointStyle = useCallback(
    (datum) => {
      if (datum.id === KYIV.id) {
        return { fill: "#f8f5ea", stroke: "#0057b7", strokeWidth: 4, r: 9 }
      }
      const selected = datum.id === selectedDonor.id
      const value = Number(flowByDonorId.get(datum.id)?.value) || 0
      return {
        fill: aidDefinition.color,
        fillOpacity: value > 0 ? (selected ? 1 : 0.72) : 0.16,
        stroke: selected ? "#ffffff" : "#071319",
        strokeWidth: selected ? 2.5 : 1,
        r: value > 0 ? 3.5 + Math.sqrt(value / maxAid) * 7 : 2,
      }
    },
    [aidDefinition.color, flowByDonorId, maxAid, selectedDonor.id],
  )

  const handleMapClick = useCallback((hover) => {
    const datum = datumFromHover(hover)
    const donorId = datum?.donorId ?? datum?.source ?? datum?.id
    if (donorId && donorId !== KYIV.id) setSelectedDonorId(donorId)
  }, [])

  const lossTooltip = useCallback((hover) => {
    const datum = datumFromHover(hover)
    const monthIndex = datum?.binStart ?? datum?.monthIndex ?? 0
    const value = datum?.categoryValue ?? datum?.total ?? datum?.losses ?? 0
    return (
      <div className="uwh-tooltip">
        <strong>{formatMonth(oryxMonthForIndex(monthIndex))}</strong>
        <span>{datum?.category ?? "featured equipment"}</span>
        <p>{formatInteger(value)} reported losses</p>
      </div>
    )
  }, [])

  // Props shared by the single-country and mirrored loss histograms.
  const lossChartHeight = lossYear === "all" ? 430 : 390
  const oryxBaseProps = {
    timeAccessor: "monthIndex",
    valueAccessor: "losses",
    categoryAccessor: "category",
    binSize: 1,
    colors: ORYX_CATEGORY_COLORS,
    timeExtent: oryxTimeExtent,
    width: ledgerWidth,
    background: "transparent",
    stroke: "#071319",
    strokeWidth: 0.8,
    opacity: 0.92,
    gap: 2,
    enableHover: true,
    tickFormatValue: (value) => formatInteger(value),
    tooltip: lossTooltip,
  }
  // Mirror math: split the single-view height into two halves with equal plot
  // areas (top has 30px of chrome, bottom 62px for the date axis) so Russia
  // (up) and Ukraine (down) share one value scale and line up bin-for-bin.
  const mirrorPlot = Math.floor((lossChartHeight - 92) / 2)
  const mirrorTopHeight = mirrorPlot + 30
  const mirrorBottomHeight = mirrorPlot + 62
  const mirrorValueExtent = [0, Math.ceil(oryxValueMax * 1.04) || 1]

  return (
    <ExamplePageLayout title="Ukraine: Four Clocks of a Long War">
      <main className="uwh-page">
        <header className="uwh-hero">
          <div className="uwh-hero__copy">
            <p className="uwh-kicker">A Semiotic evidence atlas · 2022–2026</p>
            <h1>The war has more than one clock.</h1>
            <p className="uwh-hero__lede">
              Territory changes by the day. Photographs enter a ledger later. Aid moves through
              appropriations and allocations. Economies and coalitions turn by the year. This
              dashboard keeps those clocks separate, then lets you read their rhythms together.
            </p>
          </div>
          <dl className="uwh-snapshot">
            <div>
              <dt>reported equipment losses</dt>
              <dd>through {SNAPSHOT.oryxThrough}</dd>
            </div>
            <div>
              <dt>aid allocations</dt>
              <dd>through April 2026</dd>
            </div>
            <div>
              <dt>economic series</dt>
              <dd>through 2025</dd>
            </div>
          </dl>
        </header>

        <nav className="uwh-chapters" aria-label="War chapters">
          {WAR_CHAPTERS.map((chapter) => (
            <button
              key={chapter.id}
              type="button"
              className={chapter.id === selectedChapterId ? "is-active" : ""}
              aria-pressed={chapter.id === selectedChapterId}
              onClick={() => selectChapter(chapter)}
            >
              <span>{chapter.ordinal}</span>
              <strong>{chapter.title}</strong>
              <small>{chapter.range}</small>
            </button>
          ))}
        </nav>

        <section className="uwh-section uwh-atlas" aria-labelledby="uwh-atlas-title">
          <div className="uwh-section-head">
            <div>
              <p className="uwh-section-number">01 · geography and support</p>
              <h2 id="uwh-atlas-title">Aid crosses borders on a political timetable</h2>
              <p>
                Every arc terminates in Kyiv; width and a viridis color scale both encode the value
                of dated allocations, with color normalized to the largest flow in view. Change the
                aid definition and year to see the coalition’s weight shift between North America, EU
                institutions, and European states.
              </p>
            </div>
            <div className="uwh-chapter-readout" aria-live="polite">
              <p>{selectedChapter.range}</p>
              <strong>{selectedChapter.title}</strong>
              <span>{selectedChapter.dek}</span>
            </div>
          </div>

          <div className="uwh-aid-controls">
            <div>
              <span className="uwh-control-label">Aid type</span>
              <div className="uwh-metric-strip" aria-label="Aid type">
                {AID_METRICS.map((metric) => (
                  <button
                    type="button"
                    key={metric.id}
                    className={metric.id === aidMetric ? "is-active" : ""}
                    aria-pressed={metric.id === aidMetric}
                    style={{ "--metric-color": metric.color }}
                    onClick={() => setAidMetric(metric.id)}
                  >
                    <span aria-hidden="true" />
                    {metric.shortLabel}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="uwh-control-label">Allocation year</span>
              <div className="uwh-year-filter" aria-label="Aid allocation year">
                {AID_YEARS.map((year) => (
                  <button
                    type="button"
                    key={year}
                    className={year === aidYear ? "is-active" : ""}
                    aria-pressed={year === aidYear}
                    onClick={() => setAidYear(year)}
                  >
                    {year === "all" ? "All years" : year}
                  </button>
                ))}
              </div>
            </div>
            <label className="uwh-motion-toggle">
              <input
                type="checkbox"
                checked={animateFlows && !reducedMotion}
                disabled={reducedMotion}
                onChange={(event) => setAnimateFlows(event.target.checked)}
              />
              animate direction
            </label>
          </div>

          <div className="uwh-atlas-grid">
            <div className="uwh-map-shell" ref={mapRef}>
              <ThemeProvider theme="carbon-dark">
                <FlowMap
                  key={`ukraine-aid-${aidMetric}-${aidYear}-${mapWidth}`}
                  chartId="ukraine-war-aid-flows"
                  nodes={[...AID_DONORS, KYIV]}
                  flows={aidFlows}
                  nodeIdAccessor="id"
                  xAccessor="lon"
                  yAccessor="lat"
                  valueAccessor="value"
                  projection="mercator"
                  lineType="line"
                  flowStyle="arc"
                  width={mapWidth}
                  height={mapHeight}
                  fitPadding={0.08}
                  margin={{ top: 12, right: 12, bottom: 32, left: 12 }}
                  edgeColorBy="value"
                  colorScheme="viridis"
                  showLegend={false}
                  edgeWidthRange={compact ? [1, 7] : [1.2, 11]}
                  edgeOpacity={0.58}
                  edgeLinecap="round"
                  tileURL={CARTO_TILES}
                  tileAttribution={TILE_ATTRIBUTION}
                  zoomable
                  zoomExtent={[1, 8]}
                  showParticles={animateFlows && !reducedMotion}
                  particleStyle={{
                    radius: 2.1,
                    color: "source",
                    opacity: 0.88,
                    speedMultiplier: 0.38,
                    spawnRate: 0.08,
                    maxPerLine: 12,
                  }}
                  enableHover
                  tooltip={(hover) => {
                    const datum = datumFromHover(hover)
                    if (datum?.id === KYIV.id) {
                      return (
                        <div className="uwh-tooltip">
                          <strong>Kyiv, Ukraine</strong>
                          <span>recipient hub</span>
                        </div>
                      )
                    }
                    const flow = datum?.source ? datum : flowByDonorId.get(datum?.id)
                    if (!flow) return null
                    return (
                      <div className="uwh-tooltip">
                        <strong>{flow.donor}</strong>
                        <span>
                          {aidDefinition.shortLabel} · {aidYear === "all" ? "2022–26" : aidYear}
                        </span>
                        <p>{formatEuroBillions(flow.value)} allocated to Ukraine</p>
                      </div>
                    )
                  }}
                  onClick={handleMapClick}
                  accessibleTable
                  title={`${aidDefinition.label} flowing to Ukraine`}
                  description={`Flow map of ${aidDefinition.label.toLowerCase()} to Ukraine in ${aidYear === "all" ? "2022 through April 2026" : aidYear}. Arc width is proportional to allocation value in current euros; arc color runs a viridis scale normalized to the largest flow (${formatEuroBillions(maxAid)}).`}
                  summary={`${formatEuroBillions(displayedAidTotal)} shown across ${aidFlows.length} donor flows. Particles indicate direction; arc width and viridis color both encode magnitude, color normalized to the largest flow.`}
                  animate={reducedMotion ? false : { duration: 320, intro: true }}
                  frameProps={{
                    pointStyle: aidPointStyle,
                    background: "#071319",
                    seed: 2022,
                  }}
                />
              </ThemeProvider>
              <div className="uwh-map-legend">
                <span className="uwh-map-legend__title">
                  Allocation magnitude · {aidDefinition.shortLabel}
                </span>
                <div
                  className="uwh-map-legend__ramp"
                  role="img"
                  aria-label={`Viridis color scale from zero to ${formatEuroBillions(maxAid)}, the largest single flow`}
                  style={{ backgroundImage: VIRIDIS_GRADIENT }}
                />
                <div className="uwh-map-legend__scale" aria-hidden="true">
                  <span>€0</span>
                  <span>{formatEuroBillions(maxAid)}</span>
                </div>
              </div>
            </div>

            <aside className="uwh-map-note" aria-live="polite">
              <div className="uwh-map-note__headline">
                <p className="uwh-card-kicker">
                  Kiel allocations · {aidYear === "all" ? "2022–Apr 2026" : aidYear}
                </p>
                <h3>{selectedDonor.donor}</h3>
                <p className="uwh-aid-big" style={{ color: aidDefinition.color }}>
                  {formatEuroBillions(selectedDonor[aidMetric] ?? 0)}
                </p>
                <p>{aidDefinition.label} in the selected period.</p>
              </div>
              <ol className="uwh-donor-rank" aria-label={`Donors ranked by ${aidDefinition.label}`}>
                {rankedDonors
                  .filter((donor) => donor[aidMetric] > 0)
                  .slice(0, 8)
                  .map((donor) => (
                    <li key={donor.id} className={donor.id === selectedDonor.id ? "is-active" : ""}>
                      <button type="button" onClick={() => setSelectedDonorId(donor.id)}>
                        <span>{donor.donor}</span>
                        <strong>{formatEuroBillions(donor[aidMetric])}</strong>
                        <i
                          aria-hidden="true"
                          style={{
                            width: `${Math.max(2, (donor[aidMetric] / maxAid) * 100)}%`,
                            background: aidDefinition.color,
                          }}
                        />
                      </button>
                    </li>
                  ))}
              </ol>
              <p className="uwh-fineprint">
                “Civilian” is Kiel humanitarian aid. “Unspecified” is Kiel financial aid, whose
                eventual military/civilian use is not encoded in the general aid-type field. Only
                allocations with a tracked month are mapped, so the yearly views add to the total.
              </p>
            </aside>
          </div>
        </section>

        <section className="uwh-section uwh-ledger" aria-labelledby="uwh-ledger-title">
          <div className="uwh-section-head">
            <div>
              <p className="uwh-section-number">02 · documented equipment losses</p>
              <h2 id="uwh-ledger-title">Losses plotted by the date they were reported</h2>
              <p>
                Each bar is one month, stacked by equipment class. A loss is placed in the month it
                was reported to the public Oryx archive, which can lag the actual event. Pick a
                country, or compare both with Russia above the axis and Ukraine below it.
              </p>
            </div>
            <div className="uwh-segmented" aria-label="Equipment loss country">
              {["Russia", "Ukraine", "Both"].map((country) => (
                <button
                  key={country}
                  type="button"
                  className={country === oryxCountry ? "is-active" : ""}
                  aria-pressed={country === oryxCountry}
                  onClick={() => setOryxCountry(country)}
                >
                  {country}
                </button>
              ))}
            </div>
          </div>

          <div className="uwh-loss-kpis">
            <div>
              <span>{isBothCountries ? "reported losses · both" : "reported losses"}</span>
              <strong>{formatInteger(lossHeadline.total)}</strong>
            </div>
            <div>
              <span>destroyed</span>
              <strong>{formatInteger(lossHeadline.destroyed)}</strong>
            </div>
            <div>
              <span>captured</span>
              <strong>{formatInteger(lossHeadline.captured)}</strong>
            </div>
            <div>
              <span>featured classes · {lossYear === "all" ? "2022–25" : lossYear}</span>
              <strong>{formatInteger(featuredLossTotal)}</strong>
            </div>
          </div>

          <div className="uwh-year-filter" aria-label="Equipment-loss time window">
            {["all", "2022", "2023", "2024", "2025"].map((year) => (
              <button
                type="button"
                key={year}
                className={year === lossYear ? "is-active" : ""}
                aria-pressed={year === lossYear}
                onClick={() => setLossYear(year)}
              >
                {year === "all" ? "All months" : year}
              </button>
            ))}
          </div>

          <div
            className="uwh-chart-host"
            ref={ledgerRef}
            role="img"
            aria-label={
              isBothCountries
                ? `Reported equipment losses by month, Russia above the axis and Ukraine mirrored below it on the same scale. ${formatInteger(featuredLossTotal)} reported losses across tanks, infantry carriers, and artillery in the selected period.`
                : `${oryxCountry} reported equipment losses by month. ${formatInteger(featuredLossTotal)} losses across tanks, infantry carriers, and artillery in the selected period.`
            }
          >
            <ThemeProvider theme="carbon-dark">
              {isBothCountries ? (
                <div className="uwh-mirror">
                  <div className="uwh-mirror__legend" aria-label="Equipment classes">
                    {Object.entries(ORYX_CATEGORY_COLORS).map(([label, color]) => (
                      <span key={label}>
                        <i style={{ background: color }} aria-hidden="true" />
                        {label}
                      </span>
                    ))}
                  </div>
                  <div className="uwh-mirror__half">
                    <span className="uwh-mirror__country">Russia</span>
                    <TemporalHistogram
                      {...oryxBaseProps}
                      key={`russia-${lossYear}-${ledgerWidth}`}
                      chartId="ukraine-war-oryx-losses-russia"
                      data={russiaLossRows}
                      valueExtent={mirrorValueExtent}
                      height={mirrorTopHeight}
                      margin={{ top: 24, right: 22, bottom: 6, left: 54 }}
                      showAxes
                      tickFormatTime={() => ""}
                    />
                  </div>
                  <div className="uwh-mirror__half uwh-mirror__half--down">
                    <span className="uwh-mirror__country">Ukraine</span>
                    <TemporalHistogram
                      {...oryxBaseProps}
                      key={`ukraine-${lossYear}-${ledgerWidth}`}
                      chartId="ukraine-war-oryx-losses-ukraine"
                      data={ukraineLossRows}
                      direction="down"
                      valueExtent={mirrorValueExtent}
                      height={mirrorBottomHeight}
                      margin={{ top: 6, right: 22, bottom: 56, left: 54 }}
                      showAxes
                      tickFormatTime={(value) => formatMonth(oryxMonthForIndex(value))}
                    />
                  </div>
                </div>
              ) : (
                <TemporalHistogram
                  {...oryxBaseProps}
                  key={`${oryxCountry}-${lossYear}-${ledgerWidth}`}
                  chartId="ukraine-war-oryx-monthly-losses"
                  data={oryxRows}
                  height={lossChartHeight}
                  margin={{ top: 22, right: 22, bottom: 72, left: 54 }}
                  showAxes
                  showLegend
                  legendPosition="bottom"
                  legendInteraction="isolate"
                  tickFormatTime={(value) => formatMonth(oryxMonthForIndex(value))}
                />
              )}
            </ThemeProvider>
          </div>
          <div className="uwh-reading-note">
            <strong>Reading the bars</strong>
            <p>
              Every bar shares a zero baseline, so monthly counts are directly comparable, and the
              stack shows the equipment mix. Hover for a month&apos;s exact count; in the single
              views, click a legend item to isolate a class. Dates are when losses were reported, not
              necessarily when they happened.
            </p>
          </div>
        </section>

        <section className="uwh-section" aria-labelledby="uwh-context-title">
          <div className="uwh-section-head">
            <div>
              <p className="uwh-section-number">03 · economic and political aftershocks</p>
              <h2 id="uwh-context-title">
                Annual indicators move more slowly—and still break sharply
              </h2>
              <p>
                GDP growth records the asymmetric 2022 shock and partial recovery. UN votes show a
                different kind of movement: a much narrower coalition in 2025 and a reversal by the
                United States.
              </p>
            </div>
          </div>

          <div className="uwh-context-grid" ref={contextRef}>
            <article className="uwh-context-card">
              <header>
                <p>World Bank · annual</p>
                <h3>Real GDP growth</h3>
                <span>year-over-year percent</span>
              </header>
              <ThemeProvider theme="carbon-dark">
                <LineChart
                  chartId="ukraine-war-gdp-growth"
                  data={GDP_GROWTH}
                  xAccessor="year"
                  yAccessor="value"
                  lineBy="country"
                  colorBy="country"
                  colorScheme={COUNTRY_COLORS}
                  width={contextChartWidth}
                  height={360}
                  margin={{ top: 22, right: 24, bottom: 58, left: 56 }}
                  curve="linear"
                  lineWidth={3}
                  showPoints
                  pointRadius={4}
                  showGrid
                  showLegend
                  legendPosition="bottom"
                  tooltip="multi"
                  xFormat={(year) => String(Math.round(Number(year)))}
                  yFormat={formatPercent}
                  title="Real GDP growth in Ukraine and Russia"
                  description="World Bank annual percentage growth of real GDP for Ukraine and Russia, 2021 through 2025."
                  summary="Ukraine contracted 28.8 percent in 2022, then returned to positive growth. Russia contracted 1.4 percent in 2022; growth slowed to 1.0 percent in 2025."
                  accessibleTable
                  frameProps={{ background: "transparent" }}
                />
              </ThemeProvider>
              <p className="uwh-card-note">
                Growth rates describe the whole economy, not living standards, reconstruction need,
                sanctions effectiveness, or the counterfactual path without war.
              </p>
            </article>

            <article className="uwh-context-card">
              <header>
                <p>UN General Assembly · 193 members</p>
                <h3>The diplomatic coalition changes shape</h3>
                <span>share of all member states</span>
              </header>
              <ThemeProvider theme="carbon-dark">
                <StackedBarChart
                  chartId="ukraine-war-un-votes"
                  data={UN_VOTE_ROWS}
                  categoryAccessor="resolution"
                  valueAccessor="count"
                  stackBy="vote"
                  colorBy="vote"
                  colorScheme={VOTE_COLORS}
                  orientation="horizontal"
                  normalize
                  sort={false}
                  width={contextChartWidth}
                  height={360}
                  margin={{ top: 22, right: 20, bottom: 74, left: 74 }}
                  barPadding={24}
                  roundedTop={3}
                  showGrid
                  showLegend
                  legendPosition="bottom"
                  legendInteraction="highlight"
                  valueFormat={formatVoteValue}
                  tooltip
                  title="Three UN General Assembly votes on Ukraine"
                  description="Normalized stacked bars for yes, abstain, no, and not-voting positions in three General Assembly resolutions on Ukraine in 2022, 2023, and 2025."
                  summary="The yes vote fell from 141 in March 2022 and February 2023 to 93 in February 2025. The United States moved from yes to no."
                  accessibleTable
                  frameProps={{ background: "transparent" }}
                />
              </ThemeProvider>
              <div className="uwh-us-shift" aria-label="United States vote by resolution">
                <span>United States</span>
                {UN_VOTES.map((vote) => (
                  <div key={vote.id} className={vote.usPosition === "No" ? "is-no" : "is-yes"}>
                    <small>{vote.shortLabel}</small>
                    <strong>{vote.usPosition}</strong>
                  </div>
                ))}
              </div>
              <p className="uwh-card-note">
                The wording changed between resolutions. This view compares coalition size and vote
                position; it does not treat the three texts as identical measures.
              </p>
            </article>
          </div>
        </section>

        <section className="uwh-section uwh-method" aria-labelledby="uwh-method-title">
          <div>
            <p className="uwh-section-number">04 · source ledger</p>
            <h2 id="uwh-method-title">What each layer can—and cannot—say</h2>
          </div>
          <div className="uwh-source-grid">
            <article>
              <span>equipment</span>
              <h3>Oryx / public archive</h3>
              <p>
                Visually confirmed records are a conservative, lagging record. Monthly values are
                archive additions grouped into broad classes, not loss-event dates or a census of
                all equipment lost.
              </p>
              <p>
                <a
                  href="https://www.oryxspioenkop.com/2022/02/attack-on-europe-documenting-equipment.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Original Russian list
                </a>
                {" · "}
                <a
                  href="https://www.oryxspioenkop.com/2022/02/attack-on-europe-documenting-ukrainian.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Original Ukrainian list
                </a>
                {" · "}
                <a
                  href="https://github.com/leedrake5/Russia-Ukraine"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  daily public archive
                </a>
              </p>
            </article>
            <article>
              <span>support</span>
              <h3>Kiel Ukraine Support Tracker</h3>
              <p>
                Release 29 dated allocations through April 2026, expressed in current euros.
                “Civilian” recodes Kiel humanitarian aid; “unspecified” recodes financial aid whose
                ultimate use is not identified as military or humanitarian. Capital coordinates are
                presentation metadata; only the largest donors are mapped here.
              </p>
              <a
                href="https://www.kielinstitut.de/publications/ukraine-support-tracker-data-6453"
                target="_blank"
                rel="noopener noreferrer"
              >
                Tracker and methodology
              </a>
            </article>
            <article>
              <span>economy</span>
              <h3>World Bank WDI</h3>
              <p>
                Indicator NY.GDP.MKTP.KD.ZG: annual percentage growth of GDP at constant prices,
                downloaded for Ukraine and Russia for 2021–2025.
              </p>
              <a
                href="https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=UA-RU"
                target="_blank"
                rel="noopener noreferrer"
              >
                Indicator series
              </a>
            </article>
            <article>
              <span>politics</span>
              <h3>UN General Assembly</h3>
              <p>
                Official records for ES-11/1, ES-11/6, and ES-11/7. Not-voting counts are the
                remainder from 193 members after yes, no, and abstentions.
              </p>
              <p>
                <a
                  href="https://digitallibrary.un.org/record/3965290/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ES-11/1
                </a>
                {" · "}
                <a
                  href="https://digitallibrary.un.org/record/4004933"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ES-11/6
                </a>
                {" · "}
                <a
                  href="https://digitallibrary.un.org/record/4076916"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ES-11/7
                </a>
              </p>
            </article>
          </div>
          <footer>
            Fixed reproducible snapshots; page assembled 20 July 2026. The chapter rail is an
            editorial orientation layer, not an independent dataset. Tile data © OpenStreetMap
            contributors; tiles © CARTO.
          </footer>
        </section>
      </main>
    </ExamplePageLayout>
  )
}
