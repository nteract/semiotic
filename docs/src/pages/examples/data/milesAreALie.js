/**
 * Miles Are a Lie — checked-in metro fixtures + pure projections.
 *
 * Live weather/alerts re-cost these destinations; the fixtures keep the
 * example honest offline and under SSR.
 */

import {
  alertFrictionFactor,
  alertToAnnotation,
  costPointsFromCenter,
  stretchIndex,
  summarizeStretch,
  weatherFrictionFactor,
} from "semiotic/recipes"

const DAY_MS = 24 * 60 * 60 * 1000

/** Anchor "today" for deterministic snapshots (matches docs climate examples). */
export const MILES_SNAPSHOT_TODAY = Date.UTC(2026, 6, 10)

export const KIND_META = {
  center: { label: "You are here", color: "#1f3a34" },
  airport: { label: "Airport", color: "#2f6f7e" },
  hospital: { label: "Hospital", color: "#8b3a3a" },
  peer: { label: "Peer city", color: "#5c4d7a" },
  stadium: { label: "Stadium / venue", color: "#8a6a2f" },
  transit: { label: "Transit hub", color: "#3d6b4f" },
}

/**
 * @typedef {object} MilesDestination
 * @property {string} id
 * @property {string} label
 * @property {number} lat
 * @property {number} lon
 * @property {keyof typeof KIND_META} kind
 * @property {number} [baselineMinutes]
 */

/**
 * @typedef {object} MilesMetro
 * @property {string} id
 * @property {string} label
 * @property {string} region
 * @property {number} lat
 * @property {number} lon
 * @property {boolean} nws
 * @property {MilesDestination[]} destinations
 * @property {Array<{ dayOffset: number, precipitationMm: number, windKmh: number, visibilityM: number, temperatureC: number }>} weatherSeries
 * @property {Array<{ id: string, label: string, severity: string, dayOffset: number, ttlHint: string, event: string }>} alerts
 */

/** @type {MilesMetro[]} */
export const METROS = [
  {
    id: "san-francisco",
    label: "San Francisco Bay",
    region: "US-West",
    lat: 37.7749,
    lon: -122.4194,
    nws: true,
    destinations: [
      { id: "sf-home", label: "Civic Center", lat: 37.7793, lon: -122.4192, kind: "center", baselineMinutes: 0 },
      { id: "sfo", label: "SFO Airport", lat: 37.6213, lon: -122.379, kind: "airport", baselineMinutes: 32 },
      { id: "oak", label: "Oakland", lat: 37.8044, lon: -122.2712, kind: "peer", baselineMinutes: 28 },
      { id: "sjc", label: "San José", lat: 37.3382, lon: -121.8863, kind: "peer", baselineMinutes: 55 },
      { id: "ucsf", label: "UCSF Parnassus", lat: 37.7631, lon: -122.458, kind: "hospital", baselineMinutes: 18 },
      { id: "oracle-park", label: "Oracle Park", lat: 37.7786, lon: -122.3893, kind: "stadium", baselineMinutes: 14 },
      { id: "bart-emeryville", label: "Emeryville", lat: 37.8313, lon: -122.2852, kind: "transit", baselineMinutes: 26 },
      { id: "marin", label: "San Rafael", lat: 37.9735, lon: -122.5311, kind: "peer", baselineMinutes: 42 },
    ],
    weatherSeries: buildWeatherSeries([
      [0, 0, 14, 20000, 18],
      [1, 0.2, 16, 18000, 17],
      [2, 1.5, 22, 12000, 16],
      [3, 8, 35, 6000, 15],
      [4, 18, 48, 1200, 14],
      [5, 12, 40, 3000, 14],
      [6, 4, 28, 8000, 15],
      [7, 0.5, 18, 16000, 17],
      [8, 0, 12, 22000, 19],
      [9, 0, 14, 20000, 20],
      [10, 2, 24, 10000, 18],
      [11, 6, 30, 7000, 16],
      [12, 14, 44, 2000, 15],
      [13, 3, 20, 14000, 17],
    ]),
    alerts: [
      {
        id: "sf-wind-1",
        label: "Wind Advisory — Golden Gate approaches",
        severity: "moderate",
        dayOffset: 4,
        ttlHint: "P2D",
        event: "Wind Advisory",
      },
      {
        id: "sf-flood-1",
        label: "Urban Flooding — East Bay corridors",
        severity: "severe",
        dayOffset: 12,
        ttlHint: "P1D",
        event: "Flash Flood Watch",
      },
    ],
  },
  {
    id: "new-york",
    label: "New York City",
    region: "US-East",
    lat: 40.7128,
    lon: -74.006,
    nws: true,
    destinations: [
      { id: "nyc-home", label: "City Hall", lat: 40.7127, lon: -74.006, kind: "center", baselineMinutes: 0 },
      { id: "jfk", label: "JFK Airport", lat: 40.6413, lon: -73.7781, kind: "airport", baselineMinutes: 55 },
      { id: "lga", label: "LaGuardia", lat: 40.7769, lon: -73.874, kind: "airport", baselineMinutes: 35 },
      { id: "ewr", label: "Newark", lat: 40.6895, lon: -74.1745, kind: "airport", baselineMinutes: 45 },
      { id: "brooklyn", label: "Downtown Brooklyn", lat: 40.692, lon: -73.9866, kind: "peer", baselineMinutes: 22 },
      { id: "columbia", label: "CUIMC", lat: 40.841, lon: -73.941, kind: "hospital", baselineMinutes: 40 },
      { id: "msg", label: "Madison Square Garden", lat: 40.7505, lon: -73.9934, kind: "stadium", baselineMinutes: 18 },
      { id: "hoboken", label: "Hoboken", lat: 40.744, lon: -74.0324, kind: "transit", baselineMinutes: 28 },
    ],
    weatherSeries: buildWeatherSeries([
      [0, 0, 12, 22000, 26],
      [1, 0, 14, 20000, 27],
      [2, 3, 20, 14000, 28],
      [3, 10, 28, 8000, 29],
      [4, 22, 38, 2500, 30],
      [5, 15, 32, 4000, 29],
      [6, 2, 18, 16000, 27],
      [7, 0, 12, 22000, 26],
      [8, 0, 10, 24000, 25],
      [9, 1, 16, 18000, 27],
      [10, 5, 22, 11000, 31],
      [11, 12, 30, 5000, 33],
      [12, 0.5, 14, 20000, 32],
      [13, 0, 11, 22000, 28],
    ]),
    alerts: [
      {
        id: "nyc-heat-1",
        label: "Heat Advisory — metro area",
        severity: "moderate",
        dayOffset: 11,
        ttlHint: "P2D",
        event: "Heat Advisory",
      },
      {
        id: "nyc-storm-1",
        label: "Severe Thunderstorm Watch",
        severity: "severe",
        dayOffset: 4,
        ttlHint: "P1D",
        event: "Severe Thunderstorm Watch",
      },
    ],
  },
  {
    id: "austin",
    label: "Austin",
    region: "US-South",
    lat: 30.2672,
    lon: -97.7431,
    nws: true,
    destinations: [
      { id: "atx-home", label: "Downtown", lat: 30.2672, lon: -97.7431, kind: "center", baselineMinutes: 0 },
      { id: "aus", label: "AUS Airport", lat: 30.1975, lon: -97.6664, kind: "airport", baselineMinutes: 20 },
      { id: "round-rock", label: "Round Rock", lat: 30.5083, lon: -97.6789, kind: "peer", baselineMinutes: 32 },
      { id: "dell-seton", label: "Dell Seton", lat: 30.275, lon: -97.735, kind: "hospital", baselineMinutes: 12 },
      { id: "moody", label: "Moody Center", lat: 30.281, lon: -97.731, kind: "stadium", baselineMinutes: 10 },
      { id: "san-marcos", label: "San Marcos", lat: 29.883, lon: -97.941, kind: "peer", baselineMinutes: 48 },
      { id: "domain", label: "The Domain", lat: 30.402, lon: -97.725, kind: "transit", baselineMinutes: 24 },
    ],
    weatherSeries: buildWeatherSeries([
      [0, 0, 14, 24000, 34],
      [1, 0, 16, 22000, 35],
      [2, 0, 18, 20000, 36],
      [3, 2, 22, 16000, 37],
      [4, 0, 20, 18000, 38],
      [5, 8, 28, 9000, 36],
      [6, 20, 42, 1800, 33],
      [7, 6, 24, 10000, 32],
      [8, 0, 14, 22000, 34],
      [9, 0, 12, 24000, 35],
      [10, 0, 15, 22000, 37],
      [11, 1, 18, 20000, 39],
      [12, 0, 16, 21000, 38],
      [13, 4, 26, 12000, 36],
    ]),
    alerts: [
      {
        id: "atx-heat-1",
        label: "Excessive Heat Warning",
        severity: "severe",
        dayOffset: 11,
        ttlHint: "P2D",
        event: "Excessive Heat Warning",
      },
      {
        id: "atx-flood-1",
        label: "Flash Flood Watch — Hill Country runoff",
        severity: "moderate",
        dayOffset: 6,
        ttlHint: "P1D",
        event: "Flash Flood Watch",
      },
    ],
  },
  {
    id: "chicago",
    label: "Chicago",
    region: "US-Midwest",
    lat: 41.8781,
    lon: -87.6298,
    nws: true,
    destinations: [
      { id: "chi-home", label: "The Loop", lat: 41.8819, lon: -87.6278, kind: "center", baselineMinutes: 0 },
      { id: "ord", label: "O'Hare", lat: 41.9742, lon: -87.9073, kind: "airport", baselineMinutes: 40 },
      { id: "mdw", label: "Midway", lat: 41.7868, lon: -87.7522, kind: "airport", baselineMinutes: 28 },
      { id: "evanston", label: "Evanston", lat: 42.0451, lon: -87.6877, kind: "peer", baselineMinutes: 35 },
      { id: "northwestern", label: "Northwestern Memorial", lat: 41.895, lon: -87.621, kind: "hospital", baselineMinutes: 14 },
      { id: "wrigley", label: "Wrigley Field", lat: 41.9484, lon: -87.6553, kind: "stadium", baselineMinutes: 26 },
      { id: "union-station", label: "Union Station", lat: 41.8786, lon: -87.6409, kind: "transit", baselineMinutes: 10 },
    ],
    weatherSeries: buildWeatherSeries([
      [0, 0, 16, 20000, 24],
      [1, 1, 20, 16000, 23],
      [2, 4, 28, 9000, 22],
      [3, 9, 36, 4000, 21],
      [4, 3, 24, 11000, 22],
      [5, 0, 14, 22000, 25],
      [6, 0, 12, 24000, 27],
      [7, 2, 18, 18000, 26],
      [8, 11, 40, 2500, 20],
      [9, 7, 30, 6000, 19],
      [10, 1, 16, 20000, 22],
      [11, 0, 14, 22000, 24],
      [12, 0, 12, 23000, 26],
      [13, 2, 18, 17000, 25],
    ]),
    alerts: [
      {
        id: "chi-wind-1",
        label: "Lake Wind Advisory",
        severity: "minor",
        dayOffset: 3,
        ttlHint: "P1D",
        event: "Lake Wind Advisory",
      },
      {
        id: "chi-storm-1",
        label: "Severe Thunderstorm Warning",
        severity: "extreme",
        dayOffset: 8,
        ttlHint: "PT12H",
        event: "Severe Thunderstorm Warning",
      },
    ],
  },
  {
    id: "london",
    label: "London",
    region: "UK",
    lat: 51.5074,
    lon: -0.1278,
    nws: false,
    destinations: [
      { id: "ldn-home", label: "Trafalgar Square", lat: 51.508, lon: -0.1281, kind: "center", baselineMinutes: 0 },
      { id: "lhr", label: "Heathrow", lat: 51.47, lon: -0.4543, kind: "airport", baselineMinutes: 50 },
      { id: "lcy", label: "London City", lat: 51.5053, lon: 0.0553, kind: "airport", baselineMinutes: 35 },
      { id: "cambridge", label: "Cambridge", lat: 52.2053, lon: 0.1218, kind: "peer", baselineMinutes: 75 },
      { id: "st-thomas", label: "St Thomas' Hospital", lat: 51.498, lon: -0.1188, kind: "hospital", baselineMinutes: 16 },
      { id: "wembley", label: "Wembley", lat: 51.556, lon: -0.2796, kind: "stadium", baselineMinutes: 40 },
      { id: "kings-cross", label: "King's Cross", lat: 51.5308, lon: -0.1238, kind: "transit", baselineMinutes: 18 },
    ],
    weatherSeries: buildWeatherSeries([
      [0, 1, 18, 14000, 16],
      [1, 3, 22, 10000, 15],
      [2, 6, 28, 7000, 14],
      [3, 10, 34, 4000, 13],
      [4, 4, 24, 9000, 14],
      [5, 0.5, 16, 16000, 17],
      [6, 0, 12, 20000, 19],
      [7, 2, 20, 12000, 18],
      [8, 8, 30, 5000, 15],
      [9, 12, 36, 2500, 14],
      [10, 5, 26, 8000, 15],
      [11, 1, 18, 14000, 16],
      [12, 0, 14, 18000, 18],
      [13, 2, 20, 12000, 17],
    ]),
    alerts: [
      {
        id: "ldn-rain-1",
        label: "Yellow rain warning — SE England",
        severity: "moderate",
        dayOffset: 3,
        ttlHint: "P1D",
        event: "Rain warning",
      },
      {
        id: "ldn-wind-1",
        label: "Amber wind warning",
        severity: "severe",
        dayOffset: 9,
        ttlHint: "P1D",
        event: "Wind warning",
      },
    ],
  },
]

function buildWeatherSeries(rows) {
  return rows.map(([dayOffset, precipitationMm, windKmh, visibilityM, temperatureC]) => ({
    dayOffset,
    precipitationMm,
    windKmh,
    visibilityM,
    temperatureC,
  }))
}

export function metroById(id) {
  return METROS.find((metro) => metro.id === id) ?? METROS[0]
}

export function dayTimestamp(dayOffset, today = MILES_SNAPSHOT_TODAY) {
  return today + dayOffset * DAY_MS
}

/**
 * Weather row for a day offset, with mild extrapolation if out of range.
 */
export function weatherForDay(metro, dayOffset) {
  const series = metro.weatherSeries
  const exact = series.find((row) => row.dayOffset === dayOffset)
  if (exact) return exact
  const sorted = [...series].sort((a, b) => a.dayOffset - b.dayOffset)
  if (dayOffset < sorted[0].dayOffset) return sorted[0]
  return sorted[sorted.length - 1]
}

export function alertsForDay(metro, dayOffset, options = {}) {
  const today = options.today ?? MILES_SNAPSHOT_TODAY
  return metro.alerts
    .filter((alert) => {
      // Active if day is within roughly the alert start and a short window.
      return dayOffset >= alert.dayOffset && dayOffset <= alert.dayOffset + 1
    })
    .map((alert) =>
      alertToAnnotation({
        id: alert.id,
        label: alert.label,
        createdAt: dayTimestamp(alert.dayOffset, today),
        ttlHint: alert.ttlHint,
        severity: alert.severity,
        event: alert.event,
        type: "callout",
        // Cartogram annotations are free-floating notes; coordinates filled by page if needed.
      }),
    )
}

/**
 * Cost destinations for a metro on a given weather day.
 * @param {MilesMetro} metro
 * @param {number} dayOffset
 * @param {{ weatherOverride?: object, extraFactors?: object[], centerId?: string }} [options]
 */
export function costedDestinations(metro, dayOffset, options = {}) {
  const weather = options.weatherOverride ?? weatherForDay(metro, dayOffset)
  const weatherFactor = weatherFrictionFactor(weather)
  const alertFactors = alertsForDay(metro, dayOffset).map((alert) =>
    alertFrictionFactor(alert.severity, {
      id: alert.id,
      label: alert.label,
      source: alert.event,
    }),
  )
  const globalFactors = [weatherFactor, ...alertFactors, ...(options.extraFactors ?? [])]
  const center = { lat: metro.lat, lon: metro.lon }

  // Always include a center mark at 0 cost for the cartogram center id.
  const centerDest =
    metro.destinations.find((d) => d.kind === "center") ??
    ({
      id: `${metro.id}-center`,
      label: metro.label,
      lat: metro.lat,
      lon: metro.lon,
      kind: "center",
      baselineMinutes: 0,
    })

  const others = metro.destinations.filter((d) => d.id !== centerDest.id)
  const costedOthers = costPointsFromCenter(center, others, { globalFactors })
  const costedCenter = {
    ...centerDest,
    geographicMinutes: 0,
    baselineMinutes: 0,
    cost: 0,
    stretch: 1,
    geographicStretch: 1,
    factors: globalFactors.map((f) =>
      typeof f === "number" ? { id: "n", multiplier: f } : f,
    ),
  }

  return {
    centerId: centerDest.id,
    weather,
    weatherFactor,
    alertFactors,
    points: [costedCenter, ...costedOthers],
    summary: summarizeStretch(costedOthers),
  }
}

/**
 * 14-day stretch index series for MinimapChart / sparklines.
 */
export function stretchSeriesForMetro(metro, options = {}) {
  const today = options.today ?? MILES_SNAPSHOT_TODAY
  const maxDay = Math.max(...metro.weatherSeries.map((row) => row.dayOffset))
  const series = []
  for (let dayOffset = 0; dayOffset <= maxDay; dayOffset += 1) {
    const { summary, weather } = costedDestinations(metro, dayOffset, options)
    series.push({
      dayOffset,
      date: dayTimestamp(dayOffset, today),
      stretch: summary.medianStretch,
      maxStretch: summary.maxStretch,
      worstId: summary.worstId,
      precipitationMm: weather.precipitationMm,
      series: "median stretch",
    })
  }
  return series
}

/**
 * Ranked corridor rows for BarChart (exclude center).
 */
export function corridorRanks(points) {
  return points
    .filter((point) => point.kind !== "center" && point.cost > 0)
    .map((point) => ({
      id: point.id,
      label: point.label,
      kind: point.kind,
      kindLabel: KIND_META[point.kind]?.label ?? point.kind,
      cost: point.cost,
      stretch: point.stretch,
      geographicMinutes: point.geographicMinutes,
      baselineMinutes: point.baselineMinutes,
      color: KIND_META[point.kind]?.color,
    }))
    .sort((a, b) => b.stretch - a.stretch)
}

export function formatMinutes(value) {
  if (!Number.isFinite(value)) return "—"
  if (value < 60) return `${Math.round(value)} min`
  const hours = Math.floor(value / 60)
  const minutes = Math.round(value % 60)
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}

export function formatStretch(value) {
  if (!Number.isFinite(value)) return "—"
  return `${value.toFixed(2)}×`
}

/**
 * Merge live Open-Meteo daily arrays into the fixture day-offset shape.
 */
export function weatherSeriesFromOpenMeteoDaily(daily, options = {}) {
  const today = options.today ?? MILES_SNAPSHOT_TODAY
  if (!daily?.time?.length) return null
  return daily.time.map((iso, index) => {
    const t = Date.parse(iso)
    const dayOffset = Number.isFinite(t)
      ? Math.round((t - today) / DAY_MS)
      : index
    return {
      dayOffset,
      precipitationMm: Number(daily.precipitation_sum?.[index]) || 0,
      windKmh: Number(daily.wind_speed_10m_max?.[index]) || 0,
      visibilityM: Number(daily.visibility_min?.[index]) || 20000,
      temperatureC: Number(daily.temperature_2m_mean?.[index] ?? daily.temperature_2m_max?.[index]) || 15,
      date: t,
      source: "open-meteo",
    }
  })
}

export function applyLiveWeatherSeries(metro, liveSeries) {
  if (!liveSeries?.length) return metro
  return {
    ...metro,
    weatherSeries: liveSeries,
    liveWeather: true,
  }
}

// re-export stretchIndex for tests that want the pure form via data module
export { stretchIndex }
