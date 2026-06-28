import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const DAYS = 365
const DAY_MS = 86_400_000
const BASELINE_START_YEAR = 1991
const BASELINE_END_YEAR = 2020
const DAILY_FIELDS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "temperature_2m_mean",
  "precipitation_sum",
  "snowfall_sum",
  "cloud_cover_mean",
].join(",")
const PRESETS = [
  { label: "Amsterdam, NL", lat: 52.37, lon: 4.9 },
  { label: "New York", lat: 40.71, lon: -74.01 },
  { label: "San Francisco, CA", lat: 37.77, lon: -122.42 },
  { label: "Austin, TX", lat: 30.27, lon: -97.74 },
  { label: "Mumbai, IN", lat: 19.08, lon: 72.88 },
]

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const outputPath = resolve(
  repoRoot,
  "docs/src/pages/examples/data/openMeteoPresetBaselines.json"
)

const existing = existsSync(outputPath)
  ? JSON.parse(readFileSync(outputPath, "utf8"))
  : null
const locations = existing?.locations || {}

for (const preset of PRESETS) {
  if (locations[pointKey(preset)]?.stats?.length === DAYS) {
    console.log(`Keeping cached ${preset.label}.`)
    continue
  }
  console.log(`Fetching ${preset.label}...`)
  const daily = await fetchBaseline(preset)
  locations[pointKey(preset)] = {
    label: preset.label,
    lat: preset.lat,
    lon: preset.lon,
    stats: computeBaselineStats(daily),
  }
  writeOutput()
  await delay(3500)
}

console.log(`Wrote ${outputPath}`)

function writeOutput() {
  const output = {
    source: "Open-Meteo Historical Weather API",
    baselineYears: `${BASELINE_START_YEAR}-${BASELINE_END_YEAR}`,
    generatedAt: new Date().toISOString(),
    locations,
  }
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
}

async function fetchBaseline(point) {
  const params = new URLSearchParams({
    latitude: String(point.lat),
    longitude: String(point.lon),
    start_date: `${BASELINE_START_YEAR}-01-01`,
    end_date: `${BASELINE_END_YEAR}-12-31`,
    daily: DAILY_FIELDS,
    temperature_unit: "fahrenheit",
    timezone: "auto",
  })
  const url = `https://archive-api.open-meteo.com/v1/archive?${params}`

  for (let attempt = 0; attempt < 8; attempt++) {
    const response = await fetch(url)
    if (response.ok) {
      const json = await response.json()
      return json.daily || {}
    }
    if (response.status !== 429 || attempt === 7) {
      throw new Error(`${point.label}: Open-Meteo returned ${response.status}`)
    }
    const wait = 8000 + 4000 * attempt
    console.log(`Rate limited; retrying ${point.label} in ${wait / 1000}s...`)
    await delay(wait)
  }

  throw new Error(`${point.label}: Open-Meteo request failed`)
}

function computeBaselineStats(daily) {
  const grouped = Array.from({ length: DAYS }, () => ({
    lows: [],
    highs: [],
    means: [],
    clouds: [],
    wetDays: 0,
    snowDays: 0,
    count: 0,
  }))

  dailyRows(daily).forEach((row) => {
    const day = dayOfYear(row.time)
    if (day == null) return
    const group = grouped[day]
    pushNumber(group.lows, row.min)
    pushNumber(group.highs, row.max)
    pushNumber(group.means, row.mean)
    pushNumber(group.clouds, row.cloud)
    if ((row.precip || 0) > 0.8) group.wetDays += 1
    if ((row.snowfall || 0) > 0.1) group.snowDays += 1
    group.count += 1
  })

  return grouped.map((group, day) => {
    const means = group.means.sort((a, b) => a - b)
    const lows = group.lows.sort((a, b) => a - b)
    const highs = group.highs.sort((a, b) => a - b)
    const avgLow = average(lows)
    const avgHigh = average(highs)
    const avgMean = average(means)
    return {
      day,
      avgLow: round(avgLow),
      avgHigh: round(avgHigh),
      avgMean: round(avgMean),
      recLow: round(lows[0] ?? avgLow - 12),
      recHigh: round(highs[highs.length - 1] ?? avgHigh + 12),
      p05: round(quantile(means, 0.05) ?? avgMean - 6),
      p95: round(quantile(means, 0.95) ?? avgMean + 6),
      avgCloud: round(average(group.clouds)),
      precipChance: roundThree(group.count ? group.wetDays / group.count : 0),
      snowChance: roundThree(group.count ? group.snowDays / group.count : 0),
    }
  })
}

function dailyRows(daily) {
  return (daily.time || []).map((time, index) => ({
    time,
    max: valueAt(daily.temperature_2m_max, index),
    min: valueAt(daily.temperature_2m_min, index),
    mean: valueAt(daily.temperature_2m_mean, index),
    precip: valueAt(daily.precipitation_sum, index),
    snowfall: valueAt(daily.snowfall_sum, index),
    cloud: valueAt(daily.cloud_cover_mean, index),
  }))
}

function dayOfYear(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number)
  if (!year || !month || !day || month === 2 && day === 29) return null
  return Math.round(
    (Date.UTC(2026, month - 1, day) - Date.UTC(2026, 0, 1)) / DAY_MS
  )
}

function pointKey(point) {
  return `${Number(point.lat).toFixed(3)},${Number(point.lon).toFixed(3)}`
}

function valueAt(values, index) {
  const value = values?.[index]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function pushNumber(values, value) {
  if (typeof value === "number" && Number.isFinite(value)) values.push(value)
}

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function quantile(values, q) {
  if (!values.length) return null
  const index = (values.length - 1) * q
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return values[lower]
  return values[lower] + (values[upper] - values[lower]) * (index - lower)
}

function round(value) {
  return Math.round(value)
}

function roundThree(value) {
  return Math.round(value * 1000) / 1000
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
