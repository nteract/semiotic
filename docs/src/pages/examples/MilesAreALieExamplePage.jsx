import React, { useCallback, useEffect, useMemo, useState } from "react"
import { BarChart, ChartContainer, LineChart, ThemeProvider } from "semiotic"
import { applyAnnotationLifecycle } from "semiotic/ai"
import { DistanceCartogram } from "semiotic/geo"
import { stretchStyleRules } from "semiotic/recipes"
import { BigNumber } from "semiotic/value"
import CodeBlock from "../../components/CodeBlock"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  KIND_META,
  METROS,
  MILES_SNAPSHOT_TODAY,
  alertsForDay,
  applyLiveWeatherSeries,
  corridorRanks,
  costedDestinations,
  formatMinutes,
  formatStretch,
  metroById,
  stretchSeriesForMetro,
  weatherSeriesFromOpenMeteoDaily,
} from "./data/milesAreALie"
import "./MilesAreALieExamplePage.css"

const DAY_MS = 24 * 60 * 60 * 1000
const OPEN_METEO =
  "https://api.open-meteo.com/v1/forecast?daily=precipitation_sum,wind_speed_10m_max,temperature_2m_mean&timezone=auto&past_days=7&forecast_days=7"

const implementationCode = `import {
  costPointsFromCenter,
  weatherFrictionFactor,
  stretchStyleRules,
  summarizeStretch,
  alertToAnnotation,
} from "semiotic/recipes"
import { DistanceCartogram } from "semiotic/geo"
import { applyAnnotationLifecycle } from "semiotic/ai"
import { BigNumber } from "semiotic/value"

const weather = weatherFrictionFactor({ precipitationMm: 18, windKmh: 48, visibilityM: 1200 })
const points = costPointsFromCenter(center, destinations, { globalFactors: [weather] })
const summary = summarizeStretch(points.filter((p) => p.kind !== "center"))

<DistanceCartogram
  points={points}
  center={centerId}
  costAccessor="cost"
  strength={strength}
  colorBy="kind"
  costLabel="min"
  styleRules={stretchStyleRules()}
  showRings
/>

<BarChart
  data={corridors}
  categoryAccessor="label"
  valueAccessor="stretch"
  styleRules={stretchStyleRules()}
  orientation="horizontal"
/>
`

function dayLabel(dayOffset, today = MILES_SNAPSHOT_TODAY) {
  const date = new Date(today + dayOffset * DAY_MS)
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

async function fetchOpenMeteoWeather(lat, lon, signal) {
  const url = `${OPEN_METEO}&latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Open-Meteo ${response.status}`)
  const json = await response.json()
  const series = weatherSeriesFromOpenMeteoDaily(json.daily, {
    today: Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
    ),
  })
  if (!series?.length) throw new Error("Open-Meteo returned no daily series")
  return { series, raw: json }
}

export default function MilesAreALieExamplePage() {
  const [docsTheme] = useDocsTheme()
  const themeName = docsTheme === "dark" ? "tufte-dark" : "tufte"
  // Floor at 320 so the first paint (and ResizeObserver gaps) never feed NaN
  // sizes into canvas charts — a 0-height canvas makes hatch createPattern throw.
  const [width, hostRef] = useResponsiveWidth(320, 1120)
  const chartWidth = Math.max(320, Math.min(width - 48, 720))

  const [metroId, setMetroId] = useState(METROS[0].id)
  const [dayOffset, setDayOffset] = useState(4)
  const [strength, setStrength] = useState(0.85)
  const [selectedId, setSelectedId] = useState(null)
  const [liveMetro, setLiveMetro] = useState(null)
  const [dataState, setDataState] = useState({
    kind: "snapshot",
    message: "Showing the checked-in weather friction series for this metro.",
  })
  const [loadingLive, setLoadingLive] = useState(false)

  const baseMetro = useMemo(() => metroById(metroId), [metroId])
  const metro = liveMetro?.id === metroId ? liveMetro : baseMetro

  const maxDay = useMemo(
    () => Math.max(...metro.weatherSeries.map((row) => row.dayOffset)),
    [metro],
  )

  useEffect(() => {
    setDayOffset((current) => Math.min(current, maxDay))
    setSelectedId(null)
    setLiveMetro(null)
    setDataState({
      kind: "snapshot",
      message: "Showing the checked-in weather friction series for this metro.",
    })
  }, [metroId, maxDay])

  const costed = useMemo(
    () => costedDestinations(metro, dayOffset),
    [metro, dayOffset],
  )

  const ranks = useMemo(() => corridorRanks(costed.points), [costed.points])
  const stretchSeries = useMemo(() => stretchSeriesForMetro(metro), [metro])
  const stretchYExtent = useMemo(() => {
    if (!stretchSeries.length) return [0.9, 1.6]
    const values = stretchSeries.map((row) => row.stretch).filter((v) => Number.isFinite(v))
    const lo = Math.min(1, ...values)
    const hi = Math.max(1.2, ...values)
    const pad = Math.max(0.08, (hi - lo) * 0.12)
    return [Math.max(0.85, lo - pad), hi + pad]
  }, [stretchSeries])

  const nowMs = useMemo(() => {
    // Age alerts relative to the selected day so lifecycle bands are visible.
    return MILES_SNAPSHOT_TODAY + dayOffset * DAY_MS + 12 * 60 * 60 * 1000
  }, [dayOffset])

  const rawAlerts = useMemo(() => alertsForDay(metro, dayOffset), [metro, dayOffset])
  const alerts = useMemo(
    () =>
      applyAnnotationLifecycle(rawAlerts, {
        now: nowMs,
        showExpiredAnnotations: true,
        labelSuffix: {
          aging: " · aging",
          stale: " · stale",
          expired: " · expired",
        },
      }),
    [rawAlerts, nowMs],
  )

  const selected =
    ranks.find((row) => row.id === selectedId) ?? ranks[0] ?? null

  const styleRules = useMemo(() => stretchStyleRules({ hatchDanger: true }), [])

  const cartogramColorScheme = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(KIND_META).map(([key, value]) => [key, value.color]),
      ),
    [],
  )

  const loadLive = useCallback(async () => {
    const controller = new AbortController()
    setLoadingLive(true)
    setDataState({
      kind: "live",
      message: "Requesting Open-Meteo daily weather for this metro…",
    })
    try {
      const { series } = await fetchOpenMeteoWeather(
        baseMetro.lat,
        baseMetro.lon,
        controller.signal,
      )
      // Re-index live series onto 0…n for the day slider while keeping absolute dates in rows.
      const normalized = series
        .slice()
        .sort((a, b) => a.dayOffset - b.dayOffset)
        .map((row, index) => ({ ...row, dayOffset: index }))
      const next = applyLiveWeatherSeries(baseMetro, normalized)
      setLiveMetro(next)
      // Prefer "today" in the live window: last past day / middle of series.
      const todayIndex = Math.min(
        Math.max(0, normalized.findIndex((row) => row.dayOffset >= 7)),
        Math.max(0, normalized.length - 1),
      )
      setDayOffset(todayIndex >= 0 ? Math.min(7, normalized.length - 1) : 0)
      setDataState({
        kind: "live",
        message: `Live Open-Meteo daily friction for ${baseMetro.label}. Costs are modeled travel minutes, not door-to-door guarantees.`,
      })
    } catch (error) {
      setLiveMetro(null)
      setDataState({
        kind: "error",
        message: `Live weather unavailable (${error.message}). The checked-in snapshot remains in view.`,
      })
    } finally {
      setLoadingLive(false)
    }
  }, [baseMetro])

  const weather = costed.weather
  const summary = costed.summary
  const panelWidth = Math.max(280, Math.min(chartWidth, 420))
  const cartogramWidth = Math.max(300, chartWidth > 700 ? chartWidth - 20 : chartWidth)

  const geographicHonesty = useMemo(() => {
    const rows = costed.points.filter((point) => point.kind !== "center" && point.geographicMinutes > 0)
    if (!rows.length) return 1
    const values = rows.map((point) => point.geographicStretch ?? point.cost / point.geographicMinutes)
    values.sort((a, b) => a - b)
    const mid = Math.floor(values.length / 2)
    return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid]
  }, [costed.points])

  const liveSentence = selected
    ? `On ${dayLabel(dayOffset)}, weather and alerts stretch ${metro.label} to ${formatStretch(summary.medianStretch)} normal travel time (and ${formatStretch(geographicHonesty)} pure crow-flies time). ${selected.label} leads at ${formatStretch(selected.stretch)} — ${formatMinutes(selected.cost)} lived vs ${formatMinutes(selected.baselineMinutes)} baseline.`
    : `On ${dayLabel(dayOffset)}, weather and alerts stretch ${metro.label} to ${formatStretch(summary.medianStretch)} normal travel time.`

  return (
    <ExamplePageLayout title="Miles Are a Lie">
      <ThemeProvider theme={themeName}>
        <div className="miles-page" ref={hostRef}>
          <header className="miles-hero">
            <div className="miles-kicker">Distance cartogram · lived cost · threshold styling</div>
            <h2>Miles are a lie. Cost is the map.</h2>
            <p>
              Euclidean maps are precise about dirt and imprecise about time. This page centers a
              metro on you, then warps every destination by authored baseline travel minutes
              multiplied by weather and alert friction — the shape{" "}
              <code>DistanceCartogram</code> was built for, finally given a live story. Threshold{" "}
              <code>styleRules</code> and hatch fills mark corridors that have become dishonest.
              Pure helpers ship from <code>semiotic/recipes</code> so agents do not re-derive
              haversine math in page code.
            </p>
          </header>

          <div className="miles-controls" aria-label="Cartogram controls">
            <div className="miles-control">
              <label htmlFor="miles-metro">Metro</label>
              <select
                id="miles-metro"
                value={metroId}
                onChange={(event) => setMetroId(event.target.value)}
              >
                {METROS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="miles-control">
              <label htmlFor="miles-day">
                Weather day <span className="miles-control-value">{dayLabel(dayOffset)}</span>
              </label>
              <input
                id="miles-day"
                type="range"
                min={0}
                max={maxDay}
                step={1}
                value={Math.min(dayOffset, maxDay)}
                onChange={(event) => setDayOffset(Number(event.target.value))}
              />
            </div>

            <div className="miles-control">
              <label htmlFor="miles-strength">
                Warp strength{" "}
                <span className="miles-control-value">{strength.toFixed(2)}</span>
              </label>
              <input
                id="miles-strength"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={strength}
                onChange={(event) => setStrength(Number(event.target.value))}
              />
            </div>

            <div className="miles-control-actions">
              <button
                type="button"
                className="miles-button miles-button--primary"
                onClick={loadLive}
                disabled={loadingLive}
              >
                {loadingLive ? "Loading weather…" : "Load live Open-Meteo"}
              </button>
              <button
                type="button"
                className="miles-button"
                onClick={() => {
                  setLiveMetro(null)
                  setDataState({
                    kind: "snapshot",
                    message: "Showing the checked-in weather friction series for this metro.",
                  })
                }}
              >
                Use snapshot
              </button>
            </div>
          </div>

          <div className="miles-status" data-kind={dataState.kind} role="status" aria-live="polite">
            <div>
              <strong>
                {dataState.kind === "live"
                  ? "Live weather friction"
                  : dataState.kind === "error"
                    ? "Live unavailable"
                    : "Snapshot friction series"}
              </strong>
              <span>{dataState.message}</span>
            </div>
          </div>

          <p className="miles-sentence" aria-live="polite">
            {liveSentence}
          </p>

          <div className="miles-tiles">
            <div className="miles-tile">
              <BigNumber
                value={summary.medianStretch}
                label="Metro stretch"
                format={(value) => formatStretch(value)}
                caption="median lived ÷ baseline"
                mode="tile"
                thresholds={[
                  { at: 1.15, level: "warning" },
                  { at: 1.35, level: "danger" },
                ]}
                description={`Median stretch index ${formatStretch(summary.medianStretch)}`}
              />
            </div>
            <div className="miles-tile">
              <BigNumber
                value={summary.maxStretch}
                label="Worst corridor"
                format={(value) => formatStretch(value)}
                caption={summary.worstId ?? "—"}
                mode="tile"
                thresholds={[
                  { at: 1.15, level: "warning" },
                  { at: 1.35, level: "danger" },
                ]}
                description={`Maximum corridor stretch ${formatStretch(summary.maxStretch)}`}
              />
            </div>
            <div className="miles-tile">
              <BigNumber
                value={costed.weatherFactor.multiplier}
                label="Weather friction"
                format={(value) => `${Number(value).toFixed(2)}×`}
                caption={`${weather.precipitationMm ?? 0} mm · wind ${weather.windKmh ?? 0} km/h`}
                mode="tile"
                description={`Weather friction multiplier ${costed.weatherFactor.multiplier}`}
              />
            </div>
          </div>

          <div className="miles-grid">
            <section className="miles-panel miles-panel--wide" aria-label="Distance cartogram">
              <div className="miles-panel__header">
                <div>
                  <h3>Lived-cost cartogram</h3>
                  <p>
                    Pixel distance from center tracks <code>cost</code> (minutes), not great-circle
                    miles. Strength {strength === 0 ? "shows geography" : strength === 1 ? "is pure cost" : "blends geography and cost"}.
                  </p>
                </div>
              </div>
              <ChartContainer
                title={`${metro.label} by lived minutes`}
                subtitle={`center · weather day ${dayLabel(dayOffset)}`}
              >
                <DistanceCartogram
                  points={costed.points}
                  center={costed.centerId}
                  xAccessor="lon"
                  yAccessor="lat"
                  nodeIdAccessor="id"
                  costAccessor="cost"
                  strength={strength}
                  costLabel="min"
                  colorBy="kind"
                  colorScheme={cartogramColorScheme}
                  styleRules={styleRules}
                  pointRadius={7}
                  showRings
                  showNorth
                  transition={docsTheme === "dark" ? 0 : 450}
                  width={cartogramWidth}
                  height={Math.round(cartogramWidth * 0.62)}
                  margin={{ top: 24, right: 24, bottom: 24, left: 24 }}
                  description={`Distance cartogram of ${metro.label} destinations warped by lived travel cost on ${dayLabel(dayOffset)}.`}
                  summary={liveSentence}
                  tooltip={{
                    title: (d) => d.label ?? d.id,
                    fields: [
                      { field: "kind", label: "Kind" },
                      {
                        field: "cost",
                        label: "Lived",
                        format: (value) => formatMinutes(value),
                      },
                      {
                        field: "geographicMinutes",
                        label: "Geographic",
                        format: (value) => formatMinutes(value),
                      },
                      {
                        field: "stretch",
                        label: "Stretch",
                        format: (value) => formatStretch(value),
                      },
                    ],
                  }}
                  onObservation={(obs) => {
                    const datum = obs?.datum
                    if (datum?.id && datum.kind !== "center") setSelectedId(datum.id)
                  }}
                  annotations={alerts.slice(0, 2).map((alert, index) => ({
                    type: "text",
                    label: alert.label,
                    x: 16,
                    y: 28 + index * 22,
                    opacity: alert.opacity,
                    color: "var(--semiotic-warning)",
                  }))}
                />
              </ChartContainer>
              <div className="miles-legend" aria-label="Destination kinds">
                {Object.entries(KIND_META)
                  .filter(([key]) => key !== "center")
                  .map(([key, meta]) => (
                    <span key={key}>
                      <i className="miles-swatch" style={{ background: meta.color }} aria-hidden />
                      {meta.label}
                    </span>
                  ))}
                <span>
                  <i
                    className="miles-swatch"
                    style={{
                      background:
                        "repeating-linear-gradient(-35deg,#b33a2b,#b33a2b 2px,transparent 2px,transparent 5px)",
                    }}
                    aria-hidden
                  />
                  stretch ≥ 1.35× (hatched)
                </span>
              </div>
            </section>

            <section className="miles-panel" aria-label="Corridor ranking">
              <div className="miles-panel__header">
                <div>
                  <h3>Stretched corridors</h3>
                  <p>
                    Ranked by stretch index. <code>styleRules</code> + hatch mark warning and
                    danger bands without relying on color alone.
                  </p>
                </div>
              </div>
              <BarChart
                data={ranks}
                categoryAccessor="label"
                valueAccessor="stretch"
                orientation="horizontal"
                styleRules={styleRules}
                color="var(--semiotic-secondary, #5c4d7a)"
                width={Math.max(280, panelWidth)}
                height={Math.max(280, ranks.length * 38 + 56)}
                margin={{ left: 118, right: 24, top: 12, bottom: 32 }}
                barPadding={28}
                showGrid
                description="Horizontal bar chart of corridor stretch indices"
                summary={`Worst corridor ${ranks[0]?.label ?? "—"} at ${formatStretch(ranks[0]?.stretch ?? 1)}`}
                tooltip={{
                  title: "label",
                  fields: [
                    { field: "stretch", label: "Stretch", format: (v) => formatStretch(v) },
                    { field: "cost", label: "Lived", format: (v) => formatMinutes(v) },
                    {
                      field: "geographicMinutes",
                      label: "Geographic",
                      format: (v) => formatMinutes(v),
                    },
                  ],
                }}
                onObservation={(obs) => {
                  const datum = obs?.datum
                  if (datum?.id) setSelectedId(datum.id)
                }}
              />
            </section>

            <section className="miles-panel" aria-label="Stretch index history">
              <div className="miles-panel__header">
                <div>
                  <h3>Stretch index over the weather window</h3>
                  <p>
                    Median lived ÷ baseline for each day. The selected weather day is the vertical
                    mark — move the day slider above to scrub the series.
                  </p>
                </div>
              </div>
              <LineChart
                data={stretchSeries}
                xAccessor="date"
                yAccessor="stretch"
                curve="monotoneX"
                lineWidth={2.5}
                color="var(--semiotic-danger, #b33a2b)"
                showPoints
                pointRadius={3.5}
                width={panelWidth}
                height={280}
                margin={{ left: 48, right: 16, top: 16, bottom: 36 }}
                showGrid
                yExtent={stretchYExtent}
                xFormat={(value) => dayLabel(Math.round((Number(value) - MILES_SNAPSHOT_TODAY) / DAY_MS))}
                yFormat={(value) => Number(value).toFixed(2)}
                description="Metro median stretch index over the weather window"
                summary={`Stretch ranges from ${stretchYExtent[0].toFixed(2)}× to ${stretchYExtent[1].toFixed(2)}× in this window.`}
                annotations={[
                  {
                    type: "y-threshold",
                    value: 1.15,
                    label: "warn",
                    color: "var(--semiotic-warning)",
                    labelBackground: "halo",
                  },
                  {
                    type: "y-threshold",
                    value: 1.35,
                    label: "danger",
                    color: "var(--semiotic-danger)",
                    labelBackground: "halo",
                  },
                  {
                    type: "x-threshold",
                    value: MILES_SNAPSHOT_TODAY + dayOffset * DAY_MS,
                    label: dayLabel(dayOffset),
                    color: "var(--semiotic-info)",
                    labelBackground: "box",
                  },
                ]}
                tooltip={{
                  title: () => "Median stretch",
                  fields: [
                    {
                      field: "date",
                      label: "Day",
                      format: (value) =>
                        dayLabel(Math.round((Number(value) - MILES_SNAPSHOT_TODAY) / DAY_MS)),
                    },
                    {
                      field: "stretch",
                      label: "Stretch",
                      format: (value) => formatStretch(value),
                    },
                  ],
                }}
              />
            </section>

            <section className="miles-panel" aria-label="Friction ledger">
              <div className="miles-panel__header">
                <div>
                  <h3>Friction ledger</h3>
                  <p>Every multiplier is visible. Nothing is a black-box “AI score.”</p>
                </div>
              </div>
              <ul className="miles-factor-list">
                <li>
                  <span>Weather</span>
                  <strong>{costed.weatherFactor.multiplier.toFixed(3)}×</strong>
                  <small>{costed.weatherFactor.source}</small>
                </li>
                {costed.alertFactors.map((factor) => (
                  <li key={factor.id}>
                    <span>{factor.label}</span>
                    <strong>{factor.multiplier.toFixed(3)}×</strong>
                    <small>{factor.source}</small>
                  </li>
                ))}
                {costed.alertFactors.length === 0 && (
                  <li>
                    <span>Active alerts</span>
                    <strong>1.000×</strong>
                    <small>No alert friction on this day</small>
                  </li>
                )}
                {selected && (
                  <li>
                    <span>Selected · {selected.label}</span>
                    <strong>{formatStretch(selected.stretch)}</strong>
                    <small>
                      baseline {formatMinutes(selected.baselineMinutes)} → lived{" "}
                      {formatMinutes(selected.cost)}
                    </small>
                  </li>
                )}
              </ul>

              <div className="miles-panel__header" style={{ marginTop: 16 }}>
                <div>
                  <h3>Aging alerts</h3>
                  <p>
                    System-authored notes stamped with <code>alertToAnnotation</code>, then aged by{" "}
                    <code>applyAnnotationLifecycle</code>.
                  </p>
                </div>
              </div>
              {alerts.length === 0 ? (
                <p className="miles-panel__note">No active alerts on this weather day.</p>
              ) : (
                <ul className="miles-alert-list">
                  {alerts.map((alert) => (
                    <li key={alert.id} data-freshness={alert.lifecycle?.freshness}>
                      <strong>{alert.label}</strong>
                      <div className="miles-panel__note">
                        {alert.severity} · freshness {alert.lifecycle?.freshness ?? "fresh"} ·{" "}
                        {alert.provenance?.basis}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="miles-methods">
            <p>
              <strong>Method.</strong> For each destination,{" "}
              <code>cost = baselineMinutes × Π friction</code>. Baseline minutes are authored
              metro estimates (not live traffic). Friction comes from{" "}
              <code>weatherFrictionFactor</code> and optional <code>alertFrictionFactor</code> in{" "}
              <code>semiotic/recipes</code>. <code>stretch</code> is lived ÷ baseline (today&apos;s
              warp for thresholds); <code>geographicStretch</code> is lived ÷ crow-flies minutes
              (how much miles lie even on a calm day). This is a readability model for distance
              cartograms — not a routing engine.
            </p>
            <p>
              <strong>Information engine.</strong> The same helpers that build this page are public
              imports: <code>costPointsFromCenter</code>, <code>stretchStyleRules</code>,{" "}
              <code>summarizeStretch</code>, <code>alertToAnnotation</code>. Agents can recombine
              them for any center/destination set without copying example JSX. A companion strategy
              for the power-grid twin of AI infrastructure lives at{" "}
              <code>docs/strategy/examples-thegrid.md</code>.
            </p>
          </div>

          <div className="miles-engine">
            <h3>Semiotic as information engine — minimal spine</h3>
            <p className="miles-panel__note">
              Threshold style rules are serializable (no closures), so they survive{" "}
              <code>renderChart</code>, MCP, and config round-trips.
            </p>
            <pre>{`const weather = weatherFrictionFactor(daily)
const points = costPointsFromCenter(center, destinations, { globalFactors: [weather] })
const rules = stretchStyleRules({ warnAt: 1.15, dangerAt: 1.35, hatchDanger: true })
// → DistanceCartogram costAccessor="cost" + BarChart styleRules={rules}`}</pre>
          </div>
        </div>
      </ThemeProvider>

      <CodeBlock language="jsx" code={implementationCode} />
    </ExamplePageLayout>
  )
}
