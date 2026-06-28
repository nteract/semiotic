import presetBaselines from "./data/openMeteoPresetBaselines.json"

const DAY_MS = 86_400_000
const DAYS = 365
const BASELINE_START_YEAR = 1991
const BASELINE_END_YEAR = 2020
const CURRENT_DAILY_FIELDS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "temperature_2m_mean",
  "precipitation_sum",
  "rain_sum",
  "snowfall_sum",
  "weather_code",
  "cloud_cover_mean",
].join(",")
const BASELINE_DAILY_FIELDS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "temperature_2m_mean",
  "precipitation_sum",
  "snowfall_sum",
  "cloud_cover_mean",
].join(",")

export async function geocodeOpenMeteoPoint(query, signal) {
  const normalized = query.trim()
  if (!normalized) return null

  const params = new URLSearchParams({
    name: normalized,
    count: "1",
    language: "en",
    format: "json",
  })
  const json = await fetchJson(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
    signal
  )
  const match = json.results?.[0]
  if (!match) return null

  const label = [match.name, match.admin1, match.country_code]
    .filter(Boolean)
    .join(", ")
  return {
    id: `open-meteo-${match.id || `${match.latitude}-${match.longitude}`}`,
    label,
    lat: match.latitude,
    lon: match.longitude,
    timezone: match.timezone,
  }
}

export async function fetchOpenMeteoExampleData(profile, options = {}) {
  if (profile?.lat == null || profile?.lon == null) {
    throw new Error("Open-Meteo examples require latitude and longitude.")
  }

  const {
    signal,
    year = 2026,
    todayDate = "2026-06-26",
    endDate = "2026-07-08",
  } = options
  const point = {
    lat: Number(profile.lat.toFixed(3)),
    lon: Number(profile.lon.toFixed(3)),
  }

  const [baselineResult, archiveResult, forecastResult] = await Promise.allSettled([
    fetchBaseline(point, year, signal),
    fetchArchiveDaily(
      point,
      `${year}-01-01`,
      shiftIsoDate(todayDate, -6),
      CURRENT_DAILY_FIELDS,
      signal
    ),
    fetchForecastDaily(point, signal),
  ])
  const archiveDaily = archiveResult.status === "fulfilled" ? archiveResult.value : {}
  const forecastDaily = forecastResult.status === "fulfilled" ? forecastResult.value : {}
  const currentByDay = mergeCurrentDaily(year, archiveDaily, forecastDaily)
  if (!currentByDay.size) {
    const error = archiveResult.reason || forecastResult.reason
    throw error || new Error("No current Open-Meteo daily data was returned.")
  }

  const hasLiveBaseline = baselineResult.status === "fulfilled"
  const statsByDay = hasLiveBaseline
    ? baselineResult.value.stats
    : buildFallbackStats(options.fallbackWeather, options.fallbackClimateRows, year)
  const weather = buildLiveWeatherData(
    statsByDay,
    currentByDay,
    year,
    options.fallbackWeather?.conditions
  )
  const climateRows = buildClimateRows(statsByDay, currentByDay, endDate, year)

  return {
    source: "Open-Meteo Archive and Forecast APIs",
    baselineYears: hasLiveBaseline
      ? `${BASELINE_START_YEAR}-${BASELINE_END_YEAR}`
      : "local fallback",
    baselineSource: hasLiveBaseline
      ? baselineResult.value.source
      : "local fallback",
    hasLiveBaseline,
    climateRows,
    weather,
  }
}

async function fetchBaseline(point, displayYear, signal) {
  const preset = presetBaselines.locations?.[pointKey(point)]
  if (preset?.stats?.length === DAYS) {
    return { stats: preset.stats, source: "bundled preset" }
  }

  const cacheKey = `semiotic-open-meteo-baseline-v3:${point.lat}:${point.lon}`
  const cached = readCache(cacheKey)
  if (cached?.length === DAYS) {
    return { stats: cached, source: "browser cache" }
  }

  const daily = await fetchArchiveDaily(
    point,
    `${BASELINE_START_YEAR}-01-01`,
    `${BASELINE_END_YEAR}-12-31`,
    BASELINE_DAILY_FIELDS,
    signal
  )
  const stats = computeBaselineStats(daily, displayYear)
  writeCache(cacheKey, stats)
  return { stats, source: "Open-Meteo archive" }
}

async function fetchArchiveDaily(point, startDate, endDate, fields, signal) {
  const params = new URLSearchParams({
    latitude: String(point.lat),
    longitude: String(point.lon),
    start_date: startDate,
    end_date: endDate,
    daily: fields,
    temperature_unit: "fahrenheit",
    timezone: "auto",
  })
  const json = await fetchJson(`https://archive-api.open-meteo.com/v1/archive?${params}`, signal)
  return json.daily || {}
}

async function fetchForecastDaily(point, signal) {
  const params = new URLSearchParams({
    latitude: String(point.lat),
    longitude: String(point.lon),
    daily: CURRENT_DAILY_FIELDS,
    temperature_unit: "fahrenheit",
    timezone: "auto",
    past_days: "7",
    forecast_days: "16",
  })
  const json = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`, signal)
  return json.daily || {}
}

async function fetchJson(url, signal) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(url, { signal })
    if (response.ok) return response.json()
    if (response.status !== 429 || attempt === 1) {
      throw new Error(`Open-Meteo request failed with ${response.status}`)
    }
    await delay(1400, signal)
  }
  throw new Error("Open-Meteo request failed.")
}

function mergeCurrentDaily(year, archiveDaily, forecastDaily) {
  const byDay = new Map()
  dailyRows(archiveDaily).forEach((row) => {
    const day = dayOfYear(row.time, year)
    if (day != null) byDay.set(day, row)
  })
  dailyRows(forecastDaily).forEach((row) => {
    const day = dayOfYear(row.time, year)
    if (day != null) byDay.set(day, row)
  })
  return byDay
}

function computeBaselineStats(daily, displayYear) {
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
    const day = dayOfYear(row.time, displayYear)
    if (day == null) return
    const group = grouped[day]
    pushNumber(group.lows, row.min)
    pushNumber(group.highs, row.max)
    pushNumber(group.means, row.mean)
    pushNumber(group.clouds, row.cloud)
    if ((row.precip || 0) > 0.8 || (row.rain || 0) > 0.8) group.wetDays += 1
    if ((row.snowfall || 0) > 0.1) group.snowDays += 1
    group.count += 1
  })

  return grouped.map((group, day) => {
    const means = group.means.slice().sort((a, b) => a - b)
    const lows = group.lows.slice().sort((a, b) => a - b)
    const highs = group.highs.slice().sort((a, b) => a - b)
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
      precipChance: group.count ? group.wetDays / group.count : 0,
      snowChance: group.count ? group.snowDays / group.count : 0,
    }
  })
}

function buildFallbackStats(fallbackWeather, fallbackClimateRows, year) {
  const weatherRows = fallbackWeather?.rows || []
  const climateByDay = new Map((fallbackClimateRows || []).map((row) => [row.day, row]))
  return Array.from({ length: DAYS }, (_, day) => {
    const weather = weatherRows[day]
    const climate = climateByDay.get(day)
    const meanF = climate ? cToF(climate.adjustedMean) : 50
    return {
      day,
      avgLow: weather?.avgLow ?? meanF - 7,
      avgHigh: weather?.avgHigh ?? meanF + 7,
      avgMean: weather ? (weather.avgLow + weather.avgHigh) / 2 : meanF,
      recLow: weather?.recLow ?? meanF - 20,
      recHigh: weather?.recHigh ?? meanF + 20,
      p05: climate ? cToF(climate.p05) : meanF - 8,
      p95: climate ? cToF(climate.p95) : meanF + 8,
      avgCloud: fallbackWeather?.conditions?.[day]
        ? cloudCoverForCategory(fallbackWeather.conditions[day].cloud)
        : 35,
      precipChance: fallbackWeather?.conditions?.[day]?.rain ? 0.6 : 0.1,
      snowChance: fallbackWeather?.conditions?.[day]?.freeze ? 0.4 : 0,
      year,
    }
  })
}

function buildLiveWeatherData(statsByDay, currentByDay, year, fallbackConditions = []) {
  const rows = statsByDay.map((stats) => {
    const current = currentByDay.get(stats.day)
    const min = current?.min == null ? null : Math.round(current.min)
    const max = current?.max == null ? null : Math.round(current.max)
    return {
      day: stats.day,
      date: formatDateLabel(stats.day, year),
      avgLow: Math.round(stats.avgLow),
      avgHigh: Math.round(stats.avgHigh),
      recLow: Math.round(stats.recLow),
      recHigh: Math.round(stats.recHigh),
      min,
      max,
      span: Math.max(1, Math.round(stats.recHigh - stats.recLow)),
    }
  })

  const conditions = statsByDay.map((stats) => {
    const current = currentByDay.get(stats.day)
    const fallback = fallbackConditions[stats.day]
    const daily = current || stats
    return {
      day: stats.day,
      rain: current
        ? (daily.precip || 0) > 0.8 || (daily.rain || 0) > 0.8
        : fallback?.rain ?? stats.precipChance > 0.32,
      freeze: current
        ? (daily.min ?? 100) <= 32 || (daily.snowfall || 0) > 0.1
        : fallback?.freeze ?? stats.avgLow <= 32,
      cloud: current
        ? cloudCategory(daily.cloud, daily.code)
        : fallback?.cloud || cloudCategory(stats.avgCloud),
    }
  })

  return {
    rows,
    conditions,
    conditionRuns: {
      cloud: runsForCalendar(conditions, "cloud"),
      rain: runsForCalendar(conditions.filter((d) => d.rain), "rain"),
      freeze: runsForCalendar(conditions.filter((d) => d.freeze), "freeze"),
    },
  }
}

function buildClimateRows(statsByDay, currentByDay, endDate, year) {
  const endDay = dayOfYear(endDate, year) ?? 188
  return statsByDay.slice(0, endDay + 1).map((stats) => {
    const current = currentByDay.get(stats.day)
    return {
      day: stats.day,
      date: dateFromDay(stats.day, year),
      adjustedMean: roundOne(fToC(stats.avgMean)),
      p05: roundOne(fToC(stats.p05)),
      p95: roundOne(fToC(stats.p95)),
      actual: current?.mean == null ? null : roundOne(fToC(current.mean)),
    }
  })
}

function dailyRows(daily) {
  const times = daily.time || []
  return times.map((time, index) => ({
    time,
    max: valueAt(daily.temperature_2m_max, index),
    min: valueAt(daily.temperature_2m_min, index),
    mean: valueAt(daily.temperature_2m_mean, index),
    precip: valueAt(daily.precipitation_sum, index),
    rain: valueAt(daily.rain_sum, index),
    snowfall: valueAt(daily.snowfall_sum, index),
    code: valueAt(daily.weather_code, index),
    cloud: valueAt(daily.cloud_cover_mean, index),
  }))
}

function valueAt(values, index) {
  const value = values?.[index]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function dayOfYear(isoDate, displayYear) {
  const [year, month, day] = isoDate.split("-").map(Number)
  if (!year || !month || !day || month === 2 && day === 29) return null
  const date = Date.UTC(displayYear, month - 1, day)
  return Math.round((date - Date.UTC(displayYear, 0, 1)) / DAY_MS)
}

function dateFromDay(day, year) {
  return new Date(Date.UTC(year, 0, 1 + day))
}

function shiftIsoDate(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function pointKey(point) {
  return `${Number(point.lat).toFixed(3)},${Number(point.lon).toFixed(3)}`
}

function formatDateLabel(day, year) {
  const date = dateFromDay(day, year)
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })
  return `${date.getUTCDate()}-${month}`
}

function cloudCategory(cloudCover, code) {
  if (code === 45 || code === 48) return "overcast"
  if (cloudCover == null) return "clear"
  if (cloudCover >= 82) return "overcast"
  if (cloudCover >= 56) return "cloudy"
  if (cloudCover >= 24) return "scattered"
  return "clear"
}

function cloudCoverForCategory(category) {
  if (category === "overcast") return 92
  if (category === "cloudy") return 68
  if (category === "scattered") return 38
  return 12
}

function runsForCalendar(days, field) {
  if (!days.length) return []
  const runs = []
  let current = {
    start: days[0].day,
    end: days[0].day + 1,
    category: days[0][field],
  }
  for (let i = 1; i < days.length; i++) {
    const day = days[i]
    if (day.day === current.end && day[field] === current.category) {
      current.end = day.day + 1
    } else {
      runs.push(current)
      current = { start: day.day, end: day.day + 1, category: day[field] }
    }
  }
  runs.push(current)
  return runs
}

function readCache(key) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const { savedAt, data } = JSON.parse(raw)
    if (Date.now() - savedAt > 1000 * 60 * 60 * 24 * 14) return null
    return data
  } catch {
    return null
  }
}

function writeCache(key, data) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }))
  } catch {
    // The example still works without localStorage; the request will simply repeat.
  }
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

function fToC(value) {
  return (value - 32) / 1.8
}

function cToF(value) {
  return value * 1.8 + 32
}

function delay(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, milliseconds)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout)
        reject(new DOMException("Aborted", "AbortError"))
      },
      { once: true }
    )
  })
}

function round(value) {
  return Math.round(value)
}

function roundOne(value) {
  return Math.round(value * 10) / 10
}
