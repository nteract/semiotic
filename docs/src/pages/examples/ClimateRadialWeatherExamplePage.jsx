import React, { useMemo, useState } from "react"
import { ChartContainer, ThemeProvider } from "semiotic"
import CodeBlock from "../../components/CodeBlock"
import ExamplePageLayout from "./ExamplePageLayout"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import { useOpenMeteoLoader } from "./useOpenMeteoLoader"
import {
  RadialWeatherOrdinalChart,
  LinearDetail,
  WeatherLegend,
  buildWeatherData,
  selectRows,
  formatDateLabel,
} from "./radialWeather"

// Day-of-year of the baked fixture's "today" (2026-06-26 — keep in sync with
// openMeteoExampleData's `todayDate`), derived rather than hardcoded so the
// two Climate pages can't drift.
const TODAY_DAY = Math.round((Date.UTC(2026, 5, 26) - Date.UTC(2026, 0, 1)) / (24 * 60 * 60 * 1000))

const PRESET_PROFILES = [
  {
    id: "new-york",
    label: "New York",
    lat: 40.71,
    lon: -74.01,
    baseShift: 0,
    amplitudeScale: 1,
    volatilityScale: 1,
    warming: 0.8,
    seed: 4,
  },
  {
    id: "san-francisco",
    label: "San Francisco, CA",
    lat: 37.77,
    lon: -122.42,
    baseShift: -11,
    amplitudeScale: 0.46,
    volatilityScale: 0.72,
    warming: 0.5,
    seed: 9,
  },
  {
    id: "austin",
    label: "Austin, TX",
    lat: 30.27,
    lon: -97.74,
    baseShift: 12,
    amplitudeScale: 0.8,
    volatilityScale: 1.05,
    warming: 0.9,
    seed: 12,
  },
  {
    id: "mumbai",
    label: "Mumbai, IN",
    lat: 19.08,
    lon: 72.88,
    baseShift: 27,
    amplitudeScale: 0.22,
    volatilityScale: 0.58,
    warming: 1.1,
    seed: 15,
  },
]

const combinedCode = `<RadialWeatherOrdinalChart
  weather={weather}
  brush={brush}
  setBrush={setBrush}
  selectedLabel={selectedLabel}
/>

<LinearDetail
  rows={selectedRows}
  conditions={selectedConditions}
/>`

export default function ClimateRadialWeatherExamplePage() {
  const [brush, setBrush] = useState({ start: 352, end: 176 })
  const [docsTheme] = useDocsTheme()
  const carbonTheme = docsTheme === "dark" ? "carbon-dark" : "carbon"

  // Shared Open-Meteo loading state machine (abort lifecycle, slow-request
  // escalation, historical fallback, geolocation) — the page supplies its own
  // fallback generator, coordinate→profile mapping, and status copy.
  const {
    profile,
    liveData,
    view,
    isSlow,
    isLoading,
    showHistorical,
    loadCurrentData,
    requestBrowserLocation,
  } = useOpenMeteoLoader({
    initialProfile: PRESET_PROFILES[0],
    buildFallback: buildWeatherData,
    fallbackKey: "fallbackWeather",
    profileFromCoordinates,
    loadingMessage: "Loading current weather data…",
    locationLoadingMessage: "Waiting for your location and loading its weather…",
    liveMessage: (data) =>
      data.hasLiveBaseline
        ? `Updated from Open-Meteo with a ${data.baselineYears} baseline (${data.baselineSource}).`
        : "Current observations and forecast are shown with the local historical reference.",
    failureMessage: "Current weather is unavailable, so the historical reference remains in view.",
  })

  const fallbackWeather = useMemo(() => buildWeatherData(profile), [profile])
  const weather = liveData?.weather || fallbackWeather
  const selectedRows = useMemo(() => selectRows(weather.rows, brush), [weather, brush])
  const selectedConditions = useMemo(() => selectRows(weather.conditions, brush), [weather, brush])
  const selectedLabel = `${formatDateLabel(selectedRows[0]?.day)} - ${formatDateLabel(selectedRows[selectedRows.length - 1]?.day)}`
  const today = weather.rows[TODAY_DAY]
  const title = profile.label.length > 23 ? `${profile.label.slice(0, 22)}...` : profile.label

  const banner =
    isLoading && !isSlow ? null : (
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
    <ExamplePageLayout title="Brushable Weather Rings">
      <p style={styles.lede}>
        The rings align the same dates across years, making seasonal timing and unusual spells easy
        to compare. Brush a span to inspect those days on a straight timeline, where
        here's a radial brush to get that, too.
      </p>

      <ThemeProvider theme={carbonTheme}>
        <ChartContainer
          title={profile.label}
          subtitle="Daily temperature range and conditions with a 1991–2020 baseline"
          height={620}
          loading={isLoading}
          banner={banner}
          controls={
            !isLoading ? (
              <div style={styles.temperatureReadout}>
                <span style={styles.temperatureValue}>{formatF(today?.max)}</span>
                <span style={styles.temperatureLabel}>
                  {view.kind === "live" ? "Jun 26 high" : "Historical Jun 26 high"}
                </span>
              </div>
            ) : null
          }
          style={styles.visualPanel}
        >
          <section
            style={styles.chartContent}
            aria-label={`Radial climate weather for ${profile.label}`}
          >
            <div style={styles.controls}>
              <div style={styles.locationGroup} aria-label="Historical example locations">
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

              <button type="button" onClick={requestBrowserLocation} style={styles.secondaryButton}>
                Use my point
              </button>
            </div>

            <section style={styles.figurePanel}>
              <div style={styles.figureGrid}>
                <div style={styles.sidePanel}>
                  <svg
                    viewBox="0 0 330 344"
                    style={styles.sideSvg}
                    role="img"
                    aria-label={`${profile.label} radial climate legend`}
                  >
                    <WeatherLegend
                      title={title}
                      subtitle={
                        view.kind === "live"
                          ? "Historical range and current weather"
                          : "Historical weather reference"
                      }
                      comparisonLabel={view.kind === "live" ? "Current year" : "Historical sample"}
                      textColor="var(--semiotic-text)"
                    />
                  </svg>
                  <LinearDetail
                    rows={selectedRows}
                    conditions={selectedConditions}
                    textColor="var(--semiotic-text)"
                  />
                </div>

                <RadialWeatherOrdinalChart
                  weather={weather}
                  brush={brush}
                  setBrush={setBrush}
                  selectedLabel={selectedLabel}
                />
              </div>
            </section>
          </section>
        </ChartContainer>
      </ThemeProvider>

      <h2>How it works</h2>
      <p>
        The controls use browser geolocation and Open-Meteo&apos;s archive and forecast APIs. The
        display is a radial/linear pair: an <code>OrdinalCustomChart</code> in radial projection, an
        external custom control (in this case a circular brush), and two aligned{" "}
        <code>TemporalHistogram</code> detail charts. The current-year marks and condition rings use
        available daily observations and forecast values; the full-year reference uses a computed
        1991-2020 baseline. The orange marks show when temperature goes beyond the normal variation
        of temperature during that time of year while still showing min and max for context.
      </p>

      <h2>Implementation Excerpt</h2>
      <CodeBlock language="jsx" showCopyButton code={combinedCode} />

      <p style={styles.sourceNote}>
        Live data comes from Open-Meteo without an API key. Preset locations use bundled 1991-2020
        summaries; a browser-provided location computes and caches its baseline locally. The
        deterministic generator remains available when the network or service is unavailable.
      </p>
    </ExamplePageLayout>
  )
}

function profileFromCoordinates(lat, lon) {
  const distanceFromEquator = Math.min(1, Math.abs(lat) / 70)
  const coastalOffset = Math.abs(Math.sin((lon * Math.PI) / 180)) * 0.8
  return {
    id: `point-${lat.toFixed(2)}-${lon.toFixed(2)}`,
    label: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    lat,
    lon,
    baseShift: Math.round((20 - distanceFromEquator * 32 - coastalOffset * 4) * 10) / 10,
    amplitudeScale:
      Math.round((0.25 + distanceFromEquator * 0.95 - coastalOffset * 0.12) * 100) / 100,
    volatilityScale: Math.round((0.62 + distanceFromEquator * 0.58) * 100) / 100,
    warming: Math.round((0.55 + distanceFromEquator * 0.72) * 10) / 10,
    seed: Math.abs(lat * 0.17 + lon * 0.03) % 30,
    derived: true,
  }
}

function formatF(value) {
  if (value == null || !Number.isFinite(value)) return "Unavailable"
  return `${Math.round(value)} F`
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
    height: "100%",
    padding: "18px",
    boxSizing: "border-box",
    overflow: "hidden",
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
  secondaryButton: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--semiotic-border)",
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
  figurePanel: {
    background: "var(--semiotic-surface)",
    borderRadius: "var(--semiotic-border-radius)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--semiotic-border)",
    overflowX: "auto",
  },
  figureGrid: {
    display: "grid",
    gridTemplateColumns: "330px 420px",
    gap: "12px",
    minWidth: "778px",
    padding: "14px 14px 10px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  sidePanel: {
    minWidth: 0,
  },
  sideSvg: {
    display: "block",
    width: "100%",
    height: "auto",
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
}
