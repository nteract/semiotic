/**
 * Deterministic multi-region grid fixtures for The Grid Is the Real AI Infrastructure.
 *
 * Shaped like EIA Hourly Electric Grid Monitor BA series (demand, forecast,
 * net generation, fuel mix) but fully offline and SSR-safe. Chart projections
 * (fuel stack, demand/forecast pairs, reserve proxy, styleRules) live in
 * `semiotic/recipes` (`gridObservatory`) — this module is fixtures + narrative only.
 *
 * Reserve margin is the recipes proxy — never label it ISO contingency reserve.
 */

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

/** Stable fuel keys — mirrors GRID_FUEL_KEYS in semiotic/recipes. */
export const GRID_FUEL_KEYS = Object.freeze([
  "naturalGas",
  "coal",
  "nuclear",
  "hydro",
  "wind",
  "solar",
  "other",
])

export const GRID_FUEL_LABELS = Object.freeze({
  naturalGas: "Natural gas",
  coal: "Coal",
  nuclear: "Nuclear",
  hydro: "Hydro",
  wind: "Wind",
  solar: "Solar",
  other: "Other",
})

/** Fuel categorical colors — cool generation stack on dusk slate (not theme category10). */
export const GRID_FUEL_COLOR_MAP = Object.freeze({
  naturalGas: "#6b8fad",
  coal: "#5c5346",
  nuclear: "#8b7ec8",
  hydro: "#3d9e9a",
  wind: "#7ec8e3",
  solar: "#e0a84a",
  other: "#7a8494",
})

/** Same palette keyed by human fuel labels (StackedArea `areaBy: "fuelLabel"`). */
export const GRID_FUEL_LABEL_COLOR_MAP = Object.freeze(
  Object.fromEntries(
    Object.entries(GRID_FUEL_COLOR_MAP).map(([key, color]) => [GRID_FUEL_LABELS[key], color]),
  ),
)

export const GRID_SNAPSHOT_CAPTURED_AT = "2026-07-10T18:00:00-05:00"
export const GRID_DATA_SCHEMA_VERSION = "1"

export const GRID_REGIONS = Object.freeze([
  {
    id: "ercot",
    ba: "ERCO",
    label: "ERCOT",
    longLabel: "Electric Reliability Council of Texas",
    timezone: "America/Chicago",
    timezoneLabel: "CT",
    corridor: "West Texas and Central Texas cloud build-out",
    aiContext: {
      summary:
        "A lot of the new AI training load is showing up on ERCOT. The buildings page counts facilities; here you can see what the Texas grid is actually burning and how little spare capacity it has at peak.",
      sources: [
        {
          title: "EIA Hourly Grid Monitor (ERCOT)",
          url: "https://www.eia.gov/electricity/gridmonitor/",
        },
        {
          title: "The Buildings Behind AI",
          url: "/examples/data-centers-isotype",
        },
      ],
    },
  },
  {
    id: "caiso",
    ba: "CISO",
    label: "CAISO",
    longLabel: "California Independent System Operator",
    timezone: "America/Los_Angeles",
    timezoneLabel: "PT",
    corridor: "Northern California and the broader West Coast cloud belt",
    aiContext: {
      summary:
        "California’s famous afternoon solar drop meets evening demand. If you run inference on the West Coast, this is the shape of the grid underneath it—fuel mix by hour, and whether the day-ahead forecast kept up.",
      sources: [
        {
          title: "EIA Hourly Grid Monitor (CAISO)",
          url: "https://www.eia.gov/electricity/gridmonitor/",
        },
        {
          title: "The Buildings Behind AI",
          url: "/examples/data-centers-isotype",
        },
      ],
    },
  },
  {
    id: "pjm",
    ba: "PJM",
    label: "PJM",
    longLabel: "PJM Interconnection",
    timezone: "America/New_York",
    timezoneLabel: "ET",
    corridor: "Northern Virginia data-center corridor",
    aiContext: {
      summary:
        "Northern Virginia is one of the densest data-center markets on the planet. This does not prove any single campus caused a peak hour. It does show the regional grid those campuses sit on.",
      sources: [
        {
          title: "EIA Hourly Grid Monitor (PJM)",
          url: "https://www.eia.gov/electricity/gridmonitor/",
        },
        {
          title: "The Buildings Behind AI",
          url: "/examples/data-centers-isotype",
        },
      ],
    },
  },
  {
    id: "nyiso",
    ba: "NYIS",
    label: "NYISO",
    longLabel: "New York Independent System Operator",
    timezone: "America/New_York",
    timezoneLabel: "ET",
    corridor: "Upstate generation, downstate load",
    aiContext: {
      summary:
        "New York is not the main AI building boom story. It is here so you can switch regions and see that the same reading rules work when the fuel mix and demand shape change.",
      sources: [
        {
          title: "EIA Hourly Grid Monitor (NYISO)",
          url: "https://www.eia.gov/electricity/gridmonitor/",
        },
      ],
    },
  },
])

const REGION_BY_ID = new Map(GRID_REGIONS.map((r) => [r.id, r]))
const REGION_BY_BA = new Map(GRID_REGIONS.map((r) => [r.ba, r]))

export function regionById(id) {
  return REGION_BY_ID.get(id) ?? GRID_REGIONS[0]
}

export function regionByBa(ba) {
  return REGION_BY_BA.get(ba) ?? null
}

/**
 * Named replay windows (like Port Congestion scenarios).
 * Each pins a region + multi-day range inside the snapshot generator seed.
 */
export const GRID_SCENARIOS = Object.freeze([
  {
    id: "quiet-shoulder",
    label: "Quiet spring shoulder",
    shortLabel: "Quiet shoulder",
    regionId: "ercot",
    dayOffset: 2,
    days: 5,
    teaching:
      "An ordinary day: demand rises in the morning, peaks in the afternoon, falls overnight. The fuel mix still changes; spare capacity stays comfortable.",
    events: [
      {
        id: "qs-note",
        day: 1,
        hour: 14,
        durationHours: 6,
        label: "Quiet afternoon",
        kind: "baseline",
        note: "No heat emergency. Forecast error stays small.",
      },
    ],
  },
  {
    id: "summer-heat",
    label: "Summer heat peak",
    shortLabel: "Heat peak",
    regionId: "ercot",
    dayOffset: 6,
    days: 4,
    teaching:
      "A hot week. Demand runs above the day-ahead forecast into the evening, and spare capacity gets thin—even while gas and solar rearrange under the stack.",
    events: [
      {
        id: "heat-crest",
        day: 1,
        hour: 15,
        durationHours: 8,
        label: "Heat crest",
        kind: "heat-wave",
        note: "Watch demand versus forecast here. The story is not one fuel.",
      },
      {
        id: "evening-ramp",
        day: 2,
        hour: 17,
        durationHours: 5,
        label: "Evening climb",
        kind: "demand-spike",
        note: "Solar drops off while air-conditioning load hangs around.",
      },
    ],
  },
  {
    id: "wind-night",
    label: "Wind-heavy night",
    shortLabel: "Wind night",
    regionId: "ercot",
    dayOffset: 10,
    days: 3,
    teaching:
      "A windy night. Wind can dominate generation while demand is low. That is interesting, and it still is not a carbon accounting.",
    events: [
      {
        id: "wind-surge",
        day: 0,
        hour: 22,
        durationHours: 10,
        label: "Windy overnight",
        kind: "mix-shift",
        note: "High wind share. Demand still decides how tight the system is.",
      },
    ],
  },
  {
    id: "pjm-corridor",
    label: "Virginia data-center corridor",
    shortLabel: "PJM corridor",
    regionId: "pjm",
    dayOffset: 4,
    days: 5,
    teaching:
      "Northern Virginia context without blaming a single campus for a peak. Read fuel mix, spare capacity, and forecast miss as the system the buildings plug into.",
    events: [
      {
        id: "corridor-note",
        day: 2,
        hour: 16,
        durationHours: 4,
        label: "Afternoon peak window",
        kind: "demand-spike",
        note: "Dense compute load is background, not a smoking gun.",
      },
    ],
  },
  {
    id: "caiso-ramp",
    label: "California evening ramp",
    shortLabel: "CAISO ramp",
    regionId: "caiso",
    dayOffset: 5,
    days: 4,
    teaching:
      "Solar falls off into the dinner peak—the duck curve. Watch whether the forecast keeps up with the ramp.",
    events: [
      {
        id: "duck-ramp",
        day: 1,
        hour: 16,
        durationHours: 6,
        label: "Solar off, load on",
        kind: "demand-spike",
        note: "You can see the fuel mix change in the stack and the tightness in the spare-capacity strip.",
      },
    ],
  },
])

const SCENARIO_BY_ID = new Map(GRID_SCENARIOS.map((s) => [s.id, s]))

export function scenarioById(id) {
  return SCENARIO_BY_ID.get(id) ?? GRID_SCENARIOS[0]
}

/** Shared scenario epoch so all BA series align on calendar time. */
export const GRID_SCENARIO_EPOCH = Date.UTC(2026, 5, 28, 5, 0, 0)

function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Region base profiles — rough diurnal + fuel mix priors (illustrative). */
const REGION_PROFILES = {
  ercot: {
    baseDemand: 42000,
    peakAdd: 28000,
    weekendFactor: 0.92,
    forecastBias: -400,
    forecastNoise: 900,
    fuels: {
      naturalGas: 0.42,
      wind: 0.22,
      coal: 0.14,
      nuclear: 0.1,
      solar: 0.08,
      hydro: 0.01,
      other: 0.03,
    },
    solarPeak: 0.55,
    windNight: 0.35,
  },
  caiso: {
    baseDemand: 22000,
    peakAdd: 16000,
    weekendFactor: 0.9,
    forecastBias: 200,
    forecastNoise: 700,
    fuels: {
      naturalGas: 0.35,
      solar: 0.22,
      hydro: 0.12,
      nuclear: 0.08,
      wind: 0.1,
      coal: 0.02,
      other: 0.11,
    },
    solarPeak: 0.75,
    windNight: 0.2,
  },
  pjm: {
    baseDemand: 78000,
    peakAdd: 32000,
    weekendFactor: 0.88,
    forecastBias: -200,
    forecastNoise: 1100,
    fuels: {
      naturalGas: 0.4,
      nuclear: 0.32,
      coal: 0.14,
      hydro: 0.03,
      wind: 0.05,
      solar: 0.02,
      other: 0.04,
    },
    solarPeak: 0.25,
    windNight: 0.12,
  },
  nyiso: {
    baseDemand: 16000,
    peakAdd: 9000,
    weekendFactor: 0.9,
    forecastBias: 100,
    forecastNoise: 500,
    fuels: {
      naturalGas: 0.38,
      nuclear: 0.28,
      hydro: 0.18,
      wind: 0.05,
      solar: 0.02,
      coal: 0.01,
      other: 0.08,
    },
    solarPeak: 0.3,
    windNight: 0.15,
  },
}

function diurnalShape(hour) {
  const morning = Math.exp(-0.5 * ((hour - 9) / 2.4) ** 2)
  const evening = Math.exp(-0.5 * ((hour - 18) / 2.8) ** 2)
  const night = 0.55 + 0.1 * Math.sin(((hour - 3) / 24) * Math.PI * 2)
  return night + 0.55 * morning + 0.85 * evening
}

function scenarioStress(scenarioId, dayIndex, hour) {
  if (scenarioId === "summer-heat") {
    const heat = dayIndex >= 1 ? 1.12 + 0.04 * dayIndex : 1.04
    const eveningPull = hour >= 15 && hour <= 21 ? 1.08 : 1
    const forecastLag = hour >= 16 && hour <= 20 ? 1.04 : 1
    return {
      demandMul: heat * eveningPull,
      forecastMul: (heat * eveningPull) / forecastLag,
      windMul: 0.75,
      solarMul: 1.05,
    }
  }
  if (scenarioId === "wind-night") {
    const night = hour >= 21 || hour <= 6
    return {
      demandMul: night ? 0.88 : 0.96,
      forecastMul: night ? 0.9 : 0.97,
      windMul: night ? 1.85 : 1.15,
      solarMul: 0.7,
    }
  }
  if (scenarioId === "caiso-ramp") {
    const ramp = hour >= 16 && hour <= 21
    return {
      demandMul: ramp ? 1.1 : 1,
      forecastMul: ramp ? 1.02 : 1,
      windMul: 1,
      solarMul: hour >= 10 && hour <= 15 ? 1.35 : hour >= 17 ? 0.35 : 1,
    }
  }
  if (scenarioId === "pjm-corridor") {
    const business = hour >= 10 && hour <= 18
    return {
      demandMul: business ? 1.06 : 1,
      forecastMul: business ? 1.03 : 1,
      windMul: 0.95,
      solarMul: 1,
    }
  }
  return { demandMul: 0.94, forecastMul: 0.95, windMul: 1.05, solarMul: 1 }
}

/**
 * Generate deterministic hourly series for a region over `days` starting at epoch + dayOffset.
 */
export function generateRegionHours({
  regionId = "ercot",
  scenarioId = "quiet-shoulder",
  dayOffset = 0,
  days = 14,
  epoch = GRID_SCENARIO_EPOCH,
} = {}) {
  const region = regionById(regionId)
  const profile = REGION_PROFILES[regionId] ?? REGION_PROFILES.ercot
  const rand = mulberry32(hashString(`${regionId}:${scenarioId}:${dayOffset}:${days}`))
  const hours = []
  const totalHours = days * 24

  for (let i = 0; i < totalHours; i++) {
    const t = epoch + (dayOffset * 24 + i) * HOUR
    const date = new Date(t)
    const hour = date.getUTCHours()
    const dayIndex = Math.floor(i / 24)
    const dow = date.getUTCDay()
    const weekend = dow === 0 || dow === 6 ? profile.weekendFactor : 1
    const stress = scenarioStress(scenarioId, dayIndex, hour)
    const shape = diurnalShape(hour)
    const noise = (rand() - 0.5) * 0.04
    const demandMw = Math.max(
      1000,
      (profile.baseDemand + profile.peakAdd * (shape - 0.6)) *
        weekend *
        stress.demandMul *
        (1 + noise),
    )
    const forecastNoise = (rand() - 0.5) * profile.forecastNoise
    const forecastMw = Math.max(
      1000,
      demandMw * stress.forecastMul + profile.forecastBias + forecastNoise,
    )

    const mix = { ...profile.fuels }
    const solarBoost =
      hour >= 8 && hour <= 17
        ? profile.solarPeak * Math.sin(((hour - 8) / 10) * Math.PI) * stress.solarMul
        : 0.02 * stress.solarMul
    const windBoost = (hour >= 20 || hour <= 7 ? profile.windNight : 0.12) * stress.windMul
    mix.solar = (mix.solar ?? 0) * 0.35 + solarBoost * 0.45
    mix.wind = (mix.wind ?? 0) * 0.45 + windBoost * 0.4
    mix.naturalGas = (mix.naturalGas ?? 0) * (stress.demandMul > 1.05 ? 1.08 : 1)
    let sum = 0
    for (const k of GRID_FUEL_KEYS) sum += mix[k] ?? 0
    for (const k of GRID_FUEL_KEYS) mix[k] = (mix[k] ?? 0) / (sum || 1)

    const headroom =
      scenarioId === "summer-heat" && hour >= 16 && hour <= 20
        ? 0.985 + rand() * 0.02
        : 1.02 + (rand() - 0.5) * 0.03
    const netGenMw = demandMw * headroom
    const interchangeMw = (rand() - 0.55) * demandMw * 0.04

    const fuels = {}
    for (const k of GRID_FUEL_KEYS) {
      fuels[k] = Math.round(netGenMw * mix[k])
    }
    const fuelSum = GRID_FUEL_KEYS.reduce((a, k) => a + fuels[k], 0)
    const drift = Math.round(netGenMw) - fuelSum
    fuels.naturalGas = Math.max(0, fuels.naturalGas + drift)

    hours.push({
      t,
      ba: region.ba,
      demandMw: Math.round(demandMw),
      forecastMw: Math.round(forecastMw),
      netGenMw: Math.round(netGenMw),
      interchangeMw: Math.round(interchangeMw),
      fuels,
    })
  }
  return hours
}

/** Full multi-region snapshot used by the page default (14 days × 4 BAs). */
export function buildSnapshotBundle() {
  const byRegion = {}
  for (const region of GRID_REGIONS) {
    byRegion[region.id] = generateRegionHours({
      regionId: region.id,
      scenarioId: "quiet-shoulder",
      dayOffset: 0,
      days: 14,
    })
  }
  return {
    schemaVersion: GRID_DATA_SCHEMA_VERSION,
    capturedAt: GRID_SNAPSHOT_CAPTURED_AT,
    kind: "snapshot",
    source: "Deterministic BA-shaped fixture (EIA Grid Monitor concepts)",
    byRegion,
  }
}

export const GRID_SNAPSHOT = buildSnapshotBundle()

/** Hours for a named scenario (region + window). */
export function hoursForScenario(scenarioId) {
  const scenario = scenarioById(scenarioId)
  return generateRegionHours({
    regionId: scenario.regionId,
    scenarioId: scenario.id,
    dayOffset: scenario.dayOffset,
    days: scenario.days,
  })
}

/** Event windows in epoch ms for a scenario. */
export function eventsForScenario(scenarioId) {
  const scenario = scenarioById(scenarioId)
  const hours = hoursForScenario(scenarioId)
  if (!hours.length) return []
  const start = hours[0].t
  return scenario.events.map((ev) => ({
    id: ev.id,
    start: start + (ev.day * 24 + ev.hour) * HOUR,
    end: start + (ev.day * 24 + ev.hour + ev.durationHours) * HOUR,
    label: ev.label,
    kind: ev.kind,
    note: ev.note,
  }))
}

export function formatHourTick(t) {
  const d = new Date(t)
  const mon = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })
  const day = d.getUTCDate()
  const hh = String(d.getUTCHours()).padStart(2, "0")
  return `${mon} ${day} ${hh}:00Z`
}

export function formatRegionTime(t, timezoneLabel = "CT") {
  const d = new Date(t)
  return `${d.toISOString().slice(0, 16).replace("T", " ")} ${timezoneLabel}`
}

export function formatMwLocal(value, digits = 0) {
  if (!Number.isFinite(value)) return "—"
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })} MW`
}

export function formatReservePctLocal(value, digits = 1) {
  if (!Number.isFinite(value)) return "—"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(digits)}%`
}

export function operatingSentence(operating, region) {
  if (!operating) return "No hour selected yet."
  const fuel = operating.topFuel ? GRID_FUEL_LABELS[operating.topFuel] : "unknown fuel"
  const share = operating.topFuelShare ? `${Math.round(operating.topFuelShare * 100)}%` : "—"
  const err =
    operating.forecastErrorMw == null
      ? "no day-ahead forecast in this window"
      : operating.forecastErrorMw >= 0
        ? `${Math.round(operating.forecastErrorMw).toLocaleString()} MW above the day-ahead forecast`
        : `${Math.round(Math.abs(operating.forecastErrorMw)).toLocaleString()} MW below the day-ahead forecast`
  return (
    `${region.label}, last hour in view: demand ${formatMwLocal(operating.demandMw)}, ` +
    `spare capacity about ${formatReservePctLocal(operating.reserveMarginPct)}, ` +
    `mostly ${fuel} (${share}), ${err}.`
  )
}

export function fallbackHours(regionId = "ercot") {
  return generateRegionHours({
    regionId,
    scenarioId: "quiet-shoulder",
    dayOffset: 0,
    days: 3,
  })
}

export { HOUR, DAY }
