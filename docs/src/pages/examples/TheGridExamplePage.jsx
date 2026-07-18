import React, { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ChartContainer,
  DifferenceChart,
  MinimapChart,
  StackedAreaChart,
  ThemeProvider,
} from "semiotic"
import { BarChart } from "semiotic/ordinal"
import { BigNumber } from "semiotic/value"
import {
  applyAnnotationLifecycle,
  buildReaderGrounding,
  profileData,
  suggestCharts,
} from "semiotic/ai"
import {
  demandForecastRows,
  formatReservePct,
  GRID_FUEL_LABELS,
  gridEventAnnotations,
  reserveSeries,
  stackFuelSeries,
  summarizeOperatingPoint,
  thresholdBandsForReserve,
  tightestHours,
} from "semiotic/recipes"
import CodeBlock from "../../components/CodeBlock"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  eventsForScenario,
  formatHourTick,
  formatRegionTime,
  generateRegionHours,
  GRID_FUEL_COLOR_MAP,
  GRID_FUEL_LABEL_COLOR_MAP,
  GRID_REGIONS,
  GRID_SCENARIOS,
  GRID_SNAPSHOT_CAPTURED_AT,
  operatingSentence,
  regionById,
  scenarioById,
} from "./data/theGridData"
import "./TheGridExamplePage.css"

const RESERVE_STYLE_RULES = thresholdBandsForReserve(
  { tight: 5, watch: 12, comfortable: 20 },
  { field: "reserveMarginPct" },
)

const RESERVE_THRESHOLDS = [
  { at: -Infinity, level: "danger", label: "tight" },
  { at: 5, level: "warning", label: "watch" },
  { at: 12, level: "info", label: "moderate" },
  { at: 20, level: "success", label: "comfortable" },
]

const implementationCode = `import {
  stackFuelSeries,
  demandForecastRows,
  reserveSeries,
  thresholdBandsForReserve,
  summarizeOperatingPoint,
  gridEventAnnotations,
} from "semiotic/recipes"
import { applyAnnotationLifecycle } from "semiotic/ai"
import { DifferenceChart, StackedAreaChart, MinimapChart } from "semiotic"
import { BarChart } from "semiotic/ordinal"
import { BigNumber } from "semiotic/value"

// Pure helpers turn BA hours into chart-ready series — agents import the same
// pipeline, not a 2k-line page fork.
const fuelStack = stackFuelSeries(hours)           // StackedAreaChart
const demandForecast = demandForecastRows(hours) // DifferenceChart a/b
const reserves = reserveSeries(hours)            // Minimap + risk bars
const operating = summarizeOperatingPoint(hours)
const styleRules = thresholdBandsForReserve({ tight: 5, watch: 12 })
const annotations = applyAnnotationLifecycle(
  gridEventAnnotations(events),
  { dataExtent: [hours[0].t, hours.at(-1).t] },
)

<DifferenceChart
  data={demandForecast}
  xAccessor="t"
  seriesAAccessor="a"
  seriesBAccessor="b"
  seriesALabel="Demand"
  seriesBLabel="Forecast"
  seriesAColor="var(--semiotic-warning)"
  seriesBColor="var(--semiotic-info)"
/>

<StackedAreaChart
  data={fuelStack}
  xAccessor="t"
  yAccessor="mw"
  areaBy="fuel"
  colorScheme={FUEL_COLOR_MAP}
/>

<BarChart
  data={tightestHours}
  categoryAccessor="label"
  valueAccessor="reserveMarginPct"
  styleRules={styleRules}   // hatch on the tight band
/>`

function dataKindLabel(kind) {
  if (kind === "live") return "LIVE"
  if (kind === "fallback") return "FALLBACK"
  if (kind === "error") return "ERROR"
  return "SNAPSHOT"
}

export default function TheGridExamplePage() {
  const [scenarioId, setScenarioId] = useState("summer-heat")
  const [regionOverride, setRegionOverride] = useState(null)
  const [pageWidth, pageRef] = useResponsiveWidth(320, 1120)
  const compact = pageWidth < 860

  const scenario = scenarioById(scenarioId)
  const regionId = regionOverride || scenario.regionId
  const region = regionById(regionId)

  // Deterministic BA-shaped hours for the selected scenario stress + region profile.
  const seriesHours = useMemo(
    () =>
      generateRegionHours({
        regionId,
        scenarioId: scenario.id,
        dayOffset: scenario.dayOffset,
        days: scenario.days,
      }),
    [regionId, scenario.id, scenario.dayOffset, scenario.days],
  )

  const dataState = useMemo(
    () => ({
      kind: "snapshot",
      message: `Showing a fixed ${region.label} week (saved ${GRID_SNAPSHOT_CAPTURED_AT}). Not a live feed.`,
      capturedAt: GRID_SNAPSHOT_CAPTURED_AT,
    }),
    [region.label],
  )

  // Pure recipes pipeline — same functions an agent would call.
  const fuelStack = useMemo(() => stackFuelSeries(seriesHours), [seriesHours])
  const demandForecast = useMemo(() => demandForecastRows(seriesHours), [seriesHours])
  const reserves = useMemo(() => reserveSeries(seriesHours), [seriesHours])
  const operating = useMemo(() => summarizeOperatingPoint(seriesHours), [seriesHours])
  const riskHours = useMemo(
    () =>
      tightestHours(reserves, 14).map((row, index) => ({
        ...row,
        label: formatHourTick(row.t),
        rank: index + 1,
        category: formatHourTick(row.t),
      })),
    [reserves],
  )

  const rawAnnotations = useMemo(
    () =>
      gridEventAnnotations(eventsForScenario(scenarioId), {
        now: operating?.t,
        author: "grid-scenario",
        source: `scenario:${scenarioId}`,
      }),
    [scenarioId, operating?.t],
  )

  const annotations = useMemo(() => {
    if (!seriesHours.length) return []
    const extent = [seriesHours[0].t, seriesHours[seriesHours.length - 1].t]
    return applyAnnotationLifecycle(rawAnnotations, {
      dataExtent: extent,
      showExpiredAnnotations: true,
    })
  }, [rawAnnotations, seriesHours])

  const chartWidth = Math.max(280, pageWidth - (compact ? 36 : 72))
  const halfWidth = compact ? chartWidth : Math.max(280, Math.floor((chartWidth - 14) / 2))

  const engine = useMemo(() => {
    const sample = demandForecast.map((d) => ({
      t: d.t,
      demandMw: d.demandMw,
      forecastMw: d.forecastMw,
    }))
    const profile = profileData(sample, { seriesField: undefined })
    const suggestions = suggestCharts(sample, {
      intent: "change-detection",
      maxResults: 4,
      minScore: 0,
    })
    const grounding = buildReaderGrounding(
      "DifferenceChart",
      {
        data: demandForecast,
        xAccessor: "t",
        seriesAAccessor: "a",
        seriesBAccessor: "b",
        seriesALabel: "Demand",
        seriesBLabel: "Forecast",
        title: `${region.label} demand vs day-ahead forecast`,
        description: operatingSentence(operating, region),
      },
      { audience: { receptionModality: "visual" } },
    )
    return { profile, suggestions, grounding }
  }, [demandForecast, operating, region])

  const onRegionChange = useCallback((event) => {
    setRegionOverride(event.target.value)
  }, [])

  const onScenarioChange = useCallback((event) => {
    const next = event.target.value
    setScenarioId(next)
    setRegionOverride(null)
  }, [])

  const topFuelLabel = operating?.topFuel
    ? GRID_FUEL_LABELS[operating.topFuel]
    : "—"
  const topFuelSharePct = operating ? Math.round(operating.topFuelShare * 100) : null
  const opsLine = operatingSentence(operating, region)

  const xTimeFormat = useCallback((t) => {
    const d = new Date(t)
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, "0")}h`
  }, [])

  return (
    <ExamplePageLayout title="The Grid Is the Real AI Infrastructure">
      <p className="the-grid__lede">
        We talk about AI infrastructure as buildings and GPUs. Those buildings still plug into a
        regional grid. This page is the twin of{" "}
        <Link to="/examples/data-centers-isotype">The Buildings Behind AI</Link>: that one counts
        facilities; this one watches what is generating, whether demand beat the forecast, and how
        little spare capacity is left. Pick a region and a week. Read the system, not a national
        percentage.
      </p>

      <div className="the-grid" ref={pageRef}>
        <header className="the-grid__masthead">
          <div>
            <p className="the-grid__eyebrow">Power under the models · {region.label}</p>
            <h2>The grid is the real AI infrastructure</h2>
            <p>
              {region.longLabel}. {region.corridor}. Fuel mix tells you what is running. Spare
              capacity tells you how close the system is to trouble. Keep those questions separate.
            </p>
          </div>
          <div className="the-grid__status">
            <span className="the-grid__status-badge" data-kind={dataState.kind}>
              <span className="the-grid__status-dot" aria-hidden="true" />
              {dataKindLabel(dataState.kind)} · {region.label}
            </span>
            <span>
              {operating
                ? formatRegionTime(operating.t, region.timezoneLabel)
                : "no hour in view"}
            </span>
            <span>{scenario.shortLabel}</span>
          </div>
        </header>

        <div className="the-grid__banner" role="status" data-kind={dataState.kind}>
          {dataState.message}
        </div>

        <div className="the-grid__controls">
          <div className="the-grid__control">
            <label htmlFor="grid-scenario">Week to replay</label>
            <select id="grid-scenario" value={scenarioId} onChange={onScenarioChange}>
              {GRID_SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="the-grid__control">
            <label htmlFor="grid-region">Grid region</label>
            <select id="grid-region" value={regionId} onChange={onRegionChange}>
              {GRID_REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} — {r.longLabel}
                </option>
              ))}
            </select>
          </div>
          <p className="the-grid__scenario-blurb">{scenario.teaching}</p>
        </div>

        <p className="the-grid__ops-sentence" aria-live="polite">
          {opsLine}
        </p>

        <ThemeProvider
          theme={{
            mode: "dark",
            colors: {
              categorical: Object.values(GRID_FUEL_COLOR_MAP),
              success: "#3dba7a",
              danger: "#e05a3c",
              warning: "#e8a23a",
              info: "#5ec8d8",
            },
          }}
        >
          <div className="the-grid__kpi-row">
            <div className="the-grid__kpi">
              <BigNumber
                value={operating?.demandMw ?? 0}
                format="compact"
                label="Demand"
                unit="MW"
                caption={
                  operating?.forecastErrorMw != null
                    ? `${operating.forecastErrorMw >= 0 ? "+" : ""}${Math.round(operating.forecastErrorMw).toLocaleString()} MW vs forecast`
                    : region.label
                }
                description={`How much power ${region.label} was using in the last hour of this week.`}
                summary={opsLine}
                mode="tile"
                background="transparent"
                borderColor="transparent"
              />
            </div>
            <div className="the-grid__kpi">
              <BigNumber
                value={operating?.reserveMarginPct ?? 0}
                format={(v) => formatReservePct(v, 1)}
                label="Spare capacity"
                caption="Rough, from public series"
                thresholds={RESERVE_THRESHOLDS}
                direction="higher-is-better"
                description={`A simple spare-capacity estimate for ${region.label}: generation plus imports, minus demand, as a percent of demand. Not the official contingency reserve operators use.`}
                summary="Higher is more comfortable. See the methods note for what this number is and is not."
                mode="tile"
                background="transparent"
                borderColor="transparent"
              />
            </div>
            <div className="the-grid__kpi">
              <BigNumber
                value={topFuelSharePct ?? 0}
                format={(v) => `${v}%`}
                label="Largest fuel"
                caption={topFuelLabel}
                description={`Which fuel made the most power in ${region.label} in that hour.`}
                summary={`${topFuelLabel} is the largest share of generation.`}
                mode="tile"
                background="transparent"
                borderColor="transparent"
              />
            </div>
            <aside className="the-grid__ai-card" aria-label="Why this region matters for AI">
              <h3>Why this region · {region.label}</h3>
              <p>{region.aiContext.summary}</p>
              <Link to="/examples/data-centers-isotype">See the buildings side of the story</Link>
              <ul className="the-grid__ai-sources">
                {region.aiContext.sources.map((src) => (
                  <li key={src.url}>
                    {src.url.startsWith("/") ? (
                      <Link to={src.url}>{src.title}</Link>
                    ) : (
                      <a href={src.url} target="_blank" rel="noopener noreferrer">
                        {src.title}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </aside>
          </div>

          <div className="the-grid__main-stack">
            <section className="the-grid__panel">
              <div className="the-grid__panel-head">
                <h3>Demand versus forecast</h3>
                <span>Amber = hotter than forecast · cyan = cooler</span>
              </div>
              <div className="the-grid__chart-host">
                <ChartContainer
                  title={`${region.label}: demand versus day-ahead forecast`}
                  subtitle="Where load ran high or low against what the day-ahead schedule expected"
                >
                  <DifferenceChart
                    data={demandForecast}
                    xAccessor="t"
                    seriesAAccessor="a"
                    seriesBAccessor="b"
                    seriesALabel="Demand"
                    seriesBLabel="Forecast"
                    seriesAColor="var(--semiotic-warning, #e8a23a)"
                    seriesBColor="var(--semiotic-info, #5ec8d8)"
                    showLines
                    lineWidth={1.5}
                    areaOpacity={0.55}
                    width={chartWidth}
                    height={compact ? 220 : 260}
                    margin={{ top: 28, right: 24, bottom: 40, left: 56 }}
                    showGrid
                    annotations={annotations}
                    xFormat={xTimeFormat}
                    yFormat={(v) => `${Math.round(v / 1000)}k`}
                    title={`${region.label} demand vs forecast`}
                    description={`Demand and day-ahead forecast in megawatts for ${region.label} over the selected week.`}
                    summary={opsLine}
                    accessibleTable
                    frameProps={{ background: "transparent" }}
                  />
                </ChartContainer>
              </div>
            </section>

            <div className="the-grid__split">
              <section className="the-grid__panel">
                <div className="the-grid__panel-head">
                  <h3>What is generating</h3>
                  <span>Stacked by fuel · not emissions</span>
                </div>
                <StackedAreaChart
                  data={fuelStack}
                  xAccessor="t"
                  yAccessor="mw"
                  areaBy="fuelLabel"
                  colorBy="fuelLabel"
                  colorScheme={GRID_FUEL_LABEL_COLOR_MAP}
                  width={halfWidth}
                  height={compact ? 230 : 280}
                  margin={{ top: 28, right: 16, bottom: 40, left: 52 }}
                  showLegend
                  legendPosition="bottom"
                  showGrid
                  tooltip="multi"
                  annotations={annotations}
                  xFormat={xTimeFormat}
                  yFormat={(v) => `${Math.round(v / 1000)}k`}
                  title={`${region.label} generation by fuel`}
                  description={`How much power each fuel was producing in ${region.label}.`}
                  summary="Fuel mix over time. This is not a real-time carbon score."
                  accessibleTable
                  frameProps={{ background: "transparent" }}
                />
              </section>

              <section className="the-grid__panel">
                <div className="the-grid__panel-head">
                  <h3>Spare capacity over the week</h3>
                  <span>Brush the strip below to zoom</span>
                </div>
                <MinimapChart
                  data={reserves}
                  xAccessor="t"
                  yAccessor="reserveMarginPct"
                  width={halfWidth}
                  height={compact ? 230 : 280}
                  margin={{ top: 28, right: 16, bottom: 40, left: 48 }}
                  showGrid
                  lineWidth={1.75}
                  fillArea
                  areaOpacity={0.18}
                  color="var(--semiotic-info, #5ec8d8)"
                  minimap={{ height: 48, brushDirection: "x", background: "transparent" }}
                  xFormat={xTimeFormat}
                  yFormat={(v) => `${v.toFixed(0)}%`}
                  title={`${region.label} spare capacity`}
                  description="Hourly spare-capacity estimate with a brushable overview. Rough, from public demand and generation series."
                  summary="Brush the lower strip to focus part of the week."
                  accessibleTable
                  frameProps={{ background: "transparent" }}
                  annotations={[
                    {
                      type: "y-threshold",
                      value: 12,
                      label: "Watch 12%",
                      color: "var(--semiotic-warning)",
                      labelPosition: "right",
                    },
                    {
                      type: "y-threshold",
                      value: 5,
                      label: "Tight 5%",
                      color: "var(--semiotic-danger)",
                      labelPosition: "right",
                    },
                  ]}
                />
              </section>
            </div>

            <section className="the-grid__panel">
              <div className="the-grid__panel-head">
                <h3>Tightest hours</h3>
                <span>Hatched bars are the danger band · color is not the only cue</span>
              </div>
              <BarChart
                data={riskHours}
                categoryAccessor="label"
                valueAccessor="reserveMarginPct"
                orientation="horizontal"
                styleRules={RESERVE_STYLE_RULES}
                sort={false}
                width={chartWidth}
                height={Math.max(200, riskHours.length * 22 + 48)}
                margin={{ top: 12, right: 36, bottom: 28, left: compact ? 88 : 110 }}
                showLegend={false}
                barPadding={28}
                title={`Tightest hours · ${region.label}`}
                description="Hours with the least spare capacity in this week. Hatched bars mark the tight band so color is not the only signal."
                summary="Worst hours first."
                accessibleTable
                frameProps={{ background: "transparent" }}
              />
            </section>
          </div>
        </ThemeProvider>

        <section className="the-grid__ledger" aria-label="How to read the spare-capacity colors">
          <h3>How to read spare capacity</h3>
          <ul className="the-grid__threshold-legend">
            <li>
              <span className="the-grid__swatch the-grid__swatch--ok" aria-hidden="true" />
              Comfortable · 20% or more
            </li>
            <li>
              <span className="the-grid__swatch the-grid__swatch--watch" aria-hidden="true" />
              Watch · 12% to 20%
            </li>
            <li>
              <span className="the-grid__swatch the-grid__swatch--tight" aria-hidden="true" />
              Tight · under 12% (hatched)
            </li>
          </ul>
          <p className="the-grid__methods">
            Spare capacity here is a simple estimate: generation plus imports, minus demand, as a
            percent of demand. It is good enough to teach the shape of a tight evening. It is not
            the official contingency reserve a control room uses. The data is a fixed week shaped
            like EIA Hourly Grid Monitor series—not a silent empty chart, and not pretending to be
            live. Emissions are out of scope on purpose; fuel mix is not a carbon ledger. The math
            helpers live in <code>semiotic/recipes</code> so you can reuse them outside this page.
          </p>
        </section>

        <details className="the-grid__drawer">
          <summary>Why these charts (and what the suggestion engine picks)</summary>
          <div className="the-grid__drawer-body">
            <p>
              We already chose the layout. This drawer asks Semiotic’s suggestion engine the same
              question on the demand-versus-forecast table—does it land near the same forms?—and
              prints a short plain-language read for anyone who cannot see the charts.
            </p>
            <ol>
              {(engine.suggestions || []).slice(0, 4).map((s) => (
                <li key={`${s.component}-${s.variant || "base"}`}>
                  <strong>{s.component}</strong>
                  {s.variant ? ` · ${s.variant}` : ""} — score {s.score?.toFixed?.(2) ?? s.score}
                  {s.reasons?.[0] ? ` · ${s.reasons[0]}` : ""}
                </li>
              ))}
            </ol>
            <div className="the-grid__grounding">
              {engine.grounding?.text ||
                engine.grounding?.description?.text ||
                "No plain-language summary for this window."}
            </div>
            <p>
              Fields it noticed:{" "}
              {[
                engine.profile?.primary?.x,
                engine.profile?.primary?.y,
                ...(engine.profile?.candidates?.y || []).map((c) => c.field),
              ]
                .filter(Boolean)
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .slice(0, 6)
                .join(", ") || "—"}
            </p>
          </div>
        </details>

        <p className="the-grid__footer-note">
          Regions: {GRID_REGIONS.map((r) => r.label).join(", ")} · {GRID_SCENARIOS.length} weeks to
          replay · companion to The Buildings Behind AI
        </p>
      </div>

      <CodeBlock language="jsx">{implementationCode}</CodeBlock>
    </ExamplePageLayout>
  )
}
