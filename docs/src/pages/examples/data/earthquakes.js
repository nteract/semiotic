/**
 * Deterministic M6+ earthquake fixture for the Earthquakes example page.
 *
 * Seeded synthetic events are clustered along real tectonic zones so the
 * orthographic globe, magnitude bins, regional ranks, and quarterly series
 * read as a credible USGS-style catalog without a live network fetch.
 * A handful of landmark quakes (including the 2021 South Sandwich M8.1)
 * are embedded so KPI captions stay stable.
 *
 * Schema: { id, time, lon, lat, magnitude, depth, place, region }
 */

const MAGNITUDE_BINS = Object.freeze([
  { id: "m6", label: "M 6.0–6.4", min: 6.0, max: 6.5, color: "#f0c4a0" },
  { id: "m65", label: "M 6.5–6.9", min: 6.5, max: 7.0, color: "#e89a6a" },
  { id: "m7", label: "M 7.0–7.4", min: 7.0, max: 7.5, color: "#e07060" },
  { id: "m75", label: "M 7.5+", min: 7.5, max: Infinity, color: "#9b6bb0" },
])

const MAGNITUDE_COLOR_BY_BIN = Object.freeze(
  Object.fromEntries(MAGNITUDE_BINS.map((bin) => [bin.id, bin.color])),
)

/**
 * Initial globe orientation: bring the Americas + South Sandwich corridor
 * to the front (d3 rotate [λ, φ] centers lon=-λ, lat=-φ).
 */
const INITIAL_ROTATE = Object.freeze([90, 10, 0])

const START_MS = Date.UTC(2021, 0, 1)
const END_MS = Date.UTC(2025, 11, 31, 23, 59, 59)

/**
 * Tectonic corridors used to seed the catalog. Weights control relative density.
 * Lon/lat ranges are inclusive; depth is km.
 */
const ZONES = Object.freeze([
  {
    id: "south-sandwich",
    region: "South Sandwich Islands",
    place: "South Sandwich Islands region",
    weight: 22,
    lon: [-30, -20],
    lat: [-62, -54],
    depth: [10, 180],
  },
  {
    id: "chile",
    region: "Chile",
    place: "offshore Chile",
    weight: 18,
    lon: [-76, -68],
    lat: [-45, -18],
    depth: [10, 220],
  },
  {
    id: "argentina",
    region: "Argentina",
    place: "western Argentina",
    weight: 14,
    lon: [-70, -64],
    lat: [-36, -22],
    depth: [80, 280],
  },
  {
    id: "panama",
    region: "Panama",
    place: "Panama-Costa Rica border region",
    weight: 10,
    lon: [-84, -77],
    lat: [5, 11],
    depth: [10, 80],
  },
  {
    id: "peru",
    region: "Peru",
    place: "near the coast of Peru",
    weight: 12,
    lon: [-80, -70],
    lat: [-18, -5],
    depth: [20, 160],
  },
  {
    id: "mexico",
    region: "Mexico",
    place: "offshore Guerrero, Mexico",
    weight: 14,
    lon: [-105, -92],
    lat: [14, 20],
    depth: [10, 90],
  },
  {
    id: "alaska",
    region: "Alaska",
    place: "Aleutian Islands, Alaska",
    weight: 16,
    lon: [-175, -145],
    lat: [50, 60],
    depth: [10, 140],
  },
  {
    id: "japan",
    region: "Japan",
    place: "near the east coast of Honshu, Japan",
    weight: 18,
    lon: [138, 148],
    lat: [30, 42],
    depth: [10, 120],
  },
  {
    id: "indonesia",
    region: "Indonesia",
    place: "southern Sumatra, Indonesia",
    weight: 16,
    lon: [95, 130],
    lat: [-12, 5],
    depth: [10, 180],
  },
  {
    id: "png",
    region: "Papua New Guinea",
    place: "Papua New Guinea region",
    weight: 12,
    lon: [140, 155],
    lat: [-10, 0],
    depth: [10, 160],
  },
  {
    id: "vanuatu",
    region: "Vanuatu",
    place: "Vanuatu region",
    weight: 10,
    lon: [165, 172],
    lat: [-22, -12],
    depth: [10, 200],
  },
  {
    id: "tonga",
    region: "Tonga",
    place: "Tonga region",
    weight: 14,
    lon: [-178, -170],
    lat: [-24, -14],
    depth: [40, 500],
  },
  {
    id: "fiji",
    region: "Fiji",
    place: "Fiji region",
    weight: 8,
    lon: [-180, -174],
    lat: [-22, -14],
    depth: [200, 620],
  },
  {
    id: "philippines",
    region: "Philippines",
    place: "Mindanao, Philippines",
    weight: 10,
    lon: [120, 128],
    lat: [5, 15],
    depth: [10, 140],
  },
  {
    id: "new-zealand",
    region: "New Zealand",
    place: "Kermadec Islands, New Zealand",
    weight: 10,
    lon: [-180, -172],
    lat: [-35, -28],
    depth: [10, 180],
  },
  {
    id: "greece",
    region: "Greece",
    place: "Dodecanese Islands, Greece",
    weight: 6,
    lon: [24, 30],
    lat: [34, 40],
    depth: [5, 80],
  },
  {
    id: "turkey",
    region: "Turkey",
    place: "central Turkey",
    weight: 6,
    lon: [34, 40],
    lat: [36, 40],
    depth: [5, 40],
  },
  {
    id: "iran",
    region: "Iran",
    place: "southern Iran",
    weight: 6,
    lon: [50, 60],
    lat: [26, 36],
    depth: [5, 50],
  },
  {
    id: "himalaya",
    region: "Nepal",
    place: "western Nepal",
    weight: 5,
    lon: [80, 90],
    lat: [27, 32],
    depth: [5, 40],
  },
  {
    id: "caribbean",
    region: "Caribbean",
    place: "Leeward Islands",
    weight: 7,
    lon: [-64, -58],
    lat: [14, 18],
    depth: [10, 120],
  },
])

/** Landmark events that keep KPI captions deterministic. */
const LANDMARKS = Object.freeze([
  {
    id: "us7000f93v",
    time: Date.UTC(2021, 7, 12, 18, 35, 17),
    lon: -25.32,
    lat: -58.42,
    magnitude: 8.1,
    depth: 22.8,
    place: "South Sandwich Islands region",
    region: "South Sandwich Islands",
  },
  {
    id: "us7000dflf",
    time: Date.UTC(2021, 2, 4, 19, 28, 31),
    lon: 142.0,
    lat: 38.45,
    magnitude: 7.1,
    depth: 44,
    place: "near the east coast of Honshu, Japan",
    region: "Japan",
  },
  {
    id: "us6000jlqa",
    time: Date.UTC(2023, 1, 6, 1, 17, 35),
    lon: 37.014,
    lat: 37.226,
    magnitude: 7.8,
    depth: 10,
    place: "central Turkey",
    region: "Turkey",
  },
  {
    id: "us6000m0xl",
    time: Date.UTC(2023, 11, 2, 14, 37, 4),
    lon: 162.11,
    lat: -17.52,
    magnitude: 7.1,
    depth: 10,
    place: "Vanuatu region",
    region: "Vanuatu",
  },
  {
    id: "us7000n8n8",
    time: Date.UTC(2024, 3, 2, 23, 58, 12),
    lon: -77.24,
    lat: -19.28,
    magnitude: 7.4,
    depth: 28,
    place: "near the coast of northern Chile",
    region: "Chile",
  },
  {
    id: "us7000qdhg",
    time: Date.UTC(2025, 0, 7, 1, 5, 16),
    lon: 126.72,
    lat: 28.64,
    magnitude: 7.1,
    depth: 30,
    place: "280 km NW of Naze, Japan",
    region: "Japan",
  },
  {
    id: "us7000deep",
    time: Date.UTC(2022, 10, 9, 9, 51, 2),
    lon: 178.45,
    lat: -17.8,
    magnitude: 6.8,
    depth: 623,
    place: "Fiji region",
    region: "Fiji",
  },
])

function mulberry32(seed) {
  let t = seed >>> 0
  return function next() {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function pickWeighted(rng, items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let roll = rng() * total
  for (const item of items) {
    roll -= item.weight
    if (roll <= 0) return item
  }
  return items[items.length - 1]
}

/** Gutenberg–Richter-ish magnitude: lots of M6, few M7.5+. */
function sampleMagnitude(rng) {
  const u = rng()
  if (u < 0.68) return +(6.0 + rng() * 0.5).toFixed(1)
  if (u < 0.9) return +(6.5 + rng() * 0.5).toFixed(1)
  if (u < 0.97) return +(7.0 + rng() * 0.5).toFixed(1)
  // Cap synthetics below the 8.1 landmark so the KPI stays deterministic.
  return +(7.5 + rng() * 0.5).toFixed(1)
}

function sampleInRange(rng, [min, max]) {
  return lerp(min, max, rng())
}

function buildCatalog(seed = 20210512, count = 340) {
  const rng = mulberry32(seed)
  const events = LANDMARKS.map((event) => ({ ...event }))

  for (let i = events.length; i < count; i += 1) {
    const zone = pickWeighted(rng, ZONES)
    const magnitude = sampleMagnitude(rng)
    // Bias deeper hypocenters toward Tonga/Fiji-style zones.
    let depth = sampleInRange(rng, zone.depth)
    if (zone.id === "fiji" && rng() < 0.35) depth = lerp(480, 623, rng())
    if (zone.id === "tonga" && rng() < 0.2) depth = lerp(350, 560, rng())

    const time = Math.round(lerp(START_MS, END_MS, rng()))
    events.push({
      id: `eq-${i.toString(36)}`,
      time,
      lon: +sampleInRange(rng, zone.lon).toFixed(3),
      lat: +sampleInRange(rng, zone.lat).toFixed(3),
      magnitude,
      depth: +depth.toFixed(1),
      place: zone.place,
      region: zone.region,
    })
  }

  events.sort((a, b) => a.time - b.time)
  return Object.freeze(events.map((event) => Object.freeze(event)))
}

export const EARTHQUAKES = buildCatalog()

export { MAGNITUDE_BINS, MAGNITUDE_COLOR_BY_BIN, INITIAL_ROTATE }

export function magnitudeBinId(magnitude) {
  const bin = MAGNITUDE_BINS.find((entry) => magnitude >= entry.min && magnitude < entry.max)
  return bin?.id ?? "m6"
}

export function magnitudeColor(magnitude) {
  return MAGNITUDE_COLOR_BY_BIN[magnitudeBinId(magnitude)] ?? MAGNITUDE_BINS[0].color
}

/**
 * Orthographic front-hemisphere test.
 * With d3 rotate [λ, φ, γ], the globe center is at lon = -λ, lat = -φ.
 * A point is visible when angular distance from that center is < 90°.
 */
export function isFacingViewer(event, rotate = INITIAL_ROTATE) {
  const [lambda = 0, phi = 0] = rotate
  const centerLon = -lambda
  const centerLat = -phi
  return angularDistanceDegrees(centerLon, centerLat, event.lon, event.lat) < 90
}

export function angularDistanceDegrees(lon1, lat1, lon2, lat2) {
  const toRad = Math.PI / 180
  const φ1 = lat1 * toRad
  const φ2 = lat2 * toRad
  const Δφ = (lat2 - lat1) * toRad
  const Δλ = (lon2 - lon1) * toRad
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / toRad
}

export function filterFacing(events, rotate = INITIAL_ROTATE) {
  return events.filter((event) => isFacingViewer(event, rotate))
}

export function summarizeFacing(events) {
  if (!events.length) {
    return {
      count: 0,
      strongest: null,
      deepest: null,
      byMagnitude: MAGNITUDE_BINS.map((bin) => ({
        ...bin,
        count: 0,
      })),
      byRegion: [],
      byQuarter: buildEmptyQuarters(),
    }
  }

  let strongest = events[0]
  let deepest = events[0]
  const magCounts = Object.fromEntries(MAGNITUDE_BINS.map((bin) => [bin.id, 0]))
  const regionCounts = new Map()
  const quarterCounts = new Map(buildEmptyQuarters().map((row) => [row.key, 0]))

  for (const event of events) {
    if (event.magnitude > strongest.magnitude) strongest = event
    else if (
      event.magnitude === strongest.magnitude &&
      event.time < strongest.time
    ) {
      strongest = event
    }
    if (event.depth > deepest.depth) deepest = event

    magCounts[magnitudeBinId(event.magnitude)] += 1
    regionCounts.set(event.region, (regionCounts.get(event.region) || 0) + 1)

    const quarterKey = quarterKeyFor(event.time)
    if (quarterCounts.has(quarterKey)) {
      quarterCounts.set(quarterKey, quarterCounts.get(quarterKey) + 1)
    }
  }

  const byMagnitude = MAGNITUDE_BINS.map((bin) => ({
    label: bin.label,
    id: bin.id,
    color: bin.color,
    count: magCounts[bin.id] || 0,
  }))

  const byRegion = [...regionCounts.entries()]
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count || a.region.localeCompare(b.region))
    .slice(0, 4)

  const byQuarter = buildEmptyQuarters().map((row) => ({
    ...row,
    count: quarterCounts.get(row.key) || 0,
  }))

  return { count: events.length, strongest, deepest, byMagnitude, byRegion, byQuarter }
}

function quarterKeyFor(timeMs) {
  const date = new Date(timeMs)
  const year = date.getUTCFullYear()
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1
  return `${year}-Q${quarter}`
}

function buildEmptyQuarters() {
  const rows = []
  for (let year = 2021; year <= 2025; year += 1) {
    for (let q = 1; q <= 4; q += 1) {
      const month = (q - 1) * 3
      rows.push({
        key: `${year}-Q${q}`,
        year,
        quarter: q,
        label: q === 1 ? String(year) : "",
        time: Date.UTC(year, month, 1),
        count: 0,
      })
    }
  }
  return rows
}

export function formatMagnitude(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return "M —"
  return `M ${n.toFixed(1)}`
}

export function formatDepth(km) {
  const n = Number(km)
  if (!Number.isFinite(n)) return "— km"
  return `${Math.round(n)} km`
}

export function formatStrongestCaption(event) {
  if (!event) return "—"
  const year = safeUtcYear(event.time)
  const place = event.region || event.place || "unknown"
  return year != null ? `strongest · ${year} ${place}` : `strongest · ${place}`
}

/**
 * Safe calendar formatter. `Date#toISOString` throws RangeError("Invalid time value")
 * on NaN/undefined; hover paths can deliver land-feature datums without `time`.
 */
export function formatDateTime(timeMs) {
  const date = toValidDate(timeMs)
  if (!date) return "—"
  return date.toISOString().replace("T", " ").slice(0, 16) + " UTC"
}

export function toValidDate(value) {
  if (value == null || value === "") return null
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? date : null
  }
  if (typeof value === "string") {
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? date : null
  }
  return null
}

function safeUtcYear(value) {
  const date = toValidDate(value)
  return date ? date.getUTCFullYear() : null
}

/** True when a hover/table datum looks like a catalog earthquake row. */
export function isEarthquakeDatum(value) {
  if (!value || typeof value !== "object") return false
  return (
    typeof value.magnitude === "number" &&
    Number.isFinite(value.magnitude) &&
    typeof value.lon === "number" &&
    typeof value.lat === "number"
  )
}
