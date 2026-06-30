const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000

export const PORT_REPLAY_START = Date.UTC(2025, 8, 3, 6)

export const PORT_LOCATIONS = [
  { id: "shanghai", name: "Shanghai", lon: 121.49, lat: 31.23, type: "origin" },
  { id: "singapore", name: "Singapore", lon: 103.82, lat: 1.26, type: "origin" },
  { id: "mumbai", name: "Mumbai", lon: 72.88, lat: 19.08, type: "origin" },
  { id: "rotterdam", name: "Rotterdam", lon: 4.48, lat: 51.92, type: "origin" },
  { id: "santos", name: "Santos", lon: -46.33, lat: -23.96, type: "origin" },
  { id: "newark", name: "Newark", lon: -74.14, lat: 40.67, type: "destination" },
  { id: "taiwan-strait", name: "Taiwan Strait", lon: 119.55, lat: 23.65, type: "chokepoint" },
  { id: "midway", name: "Midway Atoll", lon: -177.37, lat: 28.21, type: "waypoint" },
  { id: "panama-canal", name: "Panama Canal", lon: -79.65, lat: 9.08, type: "chokepoint" },
  { id: "malacca", name: "Strait of Malacca", lon: 100.45, lat: 3.15, type: "chokepoint" },
  { id: "colombo", name: "Colombo", lon: 79.85, lat: 6.93, type: "waypoint" },
  { id: "bab-el-mandeb", name: "Bab el-Mandeb", lon: 43.33, lat: 12.58, type: "chokepoint" },
  { id: "suez", name: "Suez Canal", lon: 32.55, lat: 30.02, type: "chokepoint" },
  { id: "gibraltar", name: "Strait of Gibraltar", lon: -5.35, lat: 35.96, type: "chokepoint" },
  { id: "cape-good-hope", name: "Cape of Good Hope", lon: 18.47, lat: -34.35, type: "chokepoint" },
  { id: "saint-helena", name: "St Helena", lon: -5.72, lat: -15.95, type: "waypoint" },
  { id: "english-channel", name: "English Channel", lon: -1.55, lat: 50.15, type: "chokepoint" },
  { id: "azores", name: "Azores", lon: -28.0, lat: 38.5, type: "waypoint" },
  { id: "recife", name: "Recife", lon: -34.88, lat: -8.05, type: "waypoint" },
  { id: "windward-passage", name: "Windward Passage", lon: -74.5, lat: 20.0, type: "chokepoint" },
]

export const PORT_ROUTES = [
  {
    id: "shanghai-newark",
    label: "Shanghai → Newark",
    shortLabel: "Shanghai",
    origin: "shanghai",
    destination: "newark",
    waypoints: ["shanghai", "taiwan-strait", "midway", "panama-canal", "newark"],
    itinerary: ["Taiwan Strait", "Midway", "Panama Canal"],
    bottleneck: "Panama Canal",
    carrier: "Meridian",
    color: "#ff7043",
    departureDay: 0,
    transitDays: 27.4,
    dwellHours: 67,
    delayHours: 43,
    costIndex: 138,
    carbonTons: 72,
    reliability: 68,
    teu: 720,
    customsRate: 0.18,
  },
  {
    id: "singapore-newark",
    label: "Singapore → Newark",
    shortLabel: "Singapore",
    origin: "singapore",
    destination: "newark",
    waypoints: ["singapore", "malacca", "colombo", "bab-el-mandeb", "suez", "gibraltar", "newark"],
    itinerary: ["Malacca", "Bab el-Mandeb", "Suez", "Gibraltar"],
    bottleneck: "Malacca + Suez",
    carrier: "Northstar",
    color: "#36d6b3",
    departureDay: 1.2,
    transitDays: 32.8,
    dwellHours: 39,
    delayHours: 22,
    costIndex: 112,
    carbonTons: 81,
    reliability: 81,
    teu: 610,
    customsRate: 0.10,
  },
  {
    id: "mumbai-newark",
    label: "Mumbai → Newark",
    shortLabel: "Mumbai",
    origin: "mumbai",
    destination: "newark",
    waypoints: ["mumbai", "cape-good-hope", "saint-helena", "newark"],
    itinerary: ["Cape of Good Hope", "St Helena"],
    bottleneck: "Cape of Good Hope",
    carrier: "Kestrel",
    color: "#ffd166",
    departureDay: 2.1,
    transitDays: 29.6,
    dwellHours: 31,
    delayHours: 16,
    costIndex: 104,
    carbonTons: 76,
    reliability: 88,
    teu: 520,
    customsRate: 0.08,
  },
  {
    id: "rotterdam-newark",
    label: "Rotterdam → Newark",
    shortLabel: "Rotterdam",
    origin: "rotterdam",
    destination: "newark",
    waypoints: ["rotterdam", "english-channel", "azores", "newark"],
    itinerary: ["English Channel", "Azores"],
    bottleneck: "English Channel",
    carrier: "Pelagic",
    color: "#68a7ff",
    departureDay: 3.3,
    transitDays: 11.2,
    dwellHours: 54,
    delayHours: 35,
    costIndex: 127,
    carbonTons: 34,
    reliability: 74,
    teu: 650,
    customsRate: 0.15,
  },
  {
    id: "santos-newark",
    label: "Santos → Newark",
    shortLabel: "Santos",
    origin: "santos",
    destination: "newark",
    waypoints: ["santos", "recife", "windward-passage", "newark"],
    itinerary: ["Recife", "Windward Passage"],
    bottleneck: "Windward Passage",
    carrier: "Atlas Blue",
    color: "#c996ff",
    departureDay: 4.6,
    transitDays: 15.8,
    dwellHours: 45,
    delayHours: 28,
    costIndex: 121,
    carbonTons: 41,
    reliability: 78,
    teu: 580,
    customsRate: 0.12,
  },
]

const PROCESS_STAGES = [
  { id: "Factory gates", category: "origin" },
  { id: "Export yards", category: "origin" },
  { id: "At sea", category: "ocean" },
  { id: "Anchorage", category: "delay" },
  { id: "Terminal", category: "port" },
  { id: "Customs", category: "port" },
  { id: "Inland release", category: "clear" },
]

const cohortAdjustments = [
  { day: 0, teu: 0.86, transit: -0.2, dwell: 0.82 },
  { day: 2.4, teu: 1, transit: 0.15, dwell: 1.08 },
  { day: 4.9, teu: 0.72, transit: 0.45, dwell: 1.22 },
]

function atDay(day) {
  return PORT_REPLAY_START + day * DAY
}

export const PORT_COHORTS = PORT_ROUTES.flatMap((route) =>
  cohortAdjustments.map((adjustment, cohortIndex) => {
    const departAt = atDay(route.departureDay + adjustment.day)
    const transitDays = route.transitDays + adjustment.transit
    const arriveAt = departAt + transitDays * DAY
    const dwellHours = Math.round(route.dwellHours * adjustment.dwell)
    const berthAt = arriveAt + dwellHours * HOUR
    const customsAt = berthAt + (12 + cohortIndex * 5) * HOUR
    const releaseAt = customsAt + (18 + route.delayHours * 0.22) * HOUR
    const teu = Math.round(route.teu * adjustment.teu)

    return {
      id: `${route.id}-${cohortIndex + 1}`,
      routeId: route.id,
      carrier: route.carrier,
      origin: route.origin,
      destination: route.destination,
      cohort: cohortIndex + 1,
      teu,
      departAt,
      arriveAt,
      berthAt,
      customsAt,
      releaseAt,
      dwellHours,
    }
  })
)

export const PORT_PROCESS_NODES = PROCESS_STAGES.map((stage, index) => ({
  ...stage,
  xExtent:
    index === 0
      ? [PORT_REPLAY_START - DAY, PORT_REPLAY_START]
      : undefined,
}))

export const PORT_PROCESS_EDGES = PORT_COHORTS.flatMap((cohort) => {
  const factoryAt = cohort.departAt - 18 * HOUR
  const yardAt = cohort.departAt - 4 * HOUR
  const seaAt = cohort.departAt
  const route = PORT_ROUTES.find((candidate) => candidate.id === cohort.routeId)
  const common = {
    routeId: cohort.routeId,
    route: route.shortLabel,
    carrier: cohort.carrier,
    cohortId: cohort.id,
    category: route.shortLabel,
    value: cohort.teu,
  }

  return [
    {
      ...common,
      id: `${cohort.id}-factory-yard`,
      source: "Factory gates",
      target: "Export yards",
      startTime: factoryAt,
      endTime: yardAt,
    },
    {
      ...common,
      id: `${cohort.id}-yard-sea`,
      source: "Export yards",
      target: "At sea",
      startTime: yardAt,
      endTime: seaAt,
    },
    {
      ...common,
      id: `${cohort.id}-sea-anchor`,
      source: "At sea",
      target: "Anchorage",
      startTime: seaAt,
      endTime: cohort.arriveAt,
    },
    {
      ...common,
      id: `${cohort.id}-anchor-terminal`,
      source: "Anchorage",
      target: "Terminal",
      startTime: cohort.arriveAt,
      endTime: cohort.berthAt,
    },
    {
      ...common,
      id: `${cohort.id}-terminal-customs`,
      source: "Terminal",
      target: "Customs",
      startTime: cohort.berthAt,
      endTime: cohort.customsAt,
    },
    {
      ...common,
      id: `${cohort.id}-customs-inland`,
      source: "Customs",
      target: "Inland release",
      startTime: cohort.customsAt,
      endTime: cohort.releaseAt,
    },
  ]
})

export const PORT_REPLAY_EVENTS = PORT_COHORTS.flatMap((cohort) => {
  const route = PORT_ROUTES.find((candidate) => candidate.id === cohort.routeId)
  const customsTeu = Math.round(cohort.teu * route.customsRate)
  return [
    {
      id: `${cohort.id}-queue`,
      time: cohort.arriveAt,
      value: cohort.teu,
      routeId: cohort.routeId,
      route: route.shortLabel,
      cohortId: cohort.id,
      kind: "anchorage arrival",
      label: `${route.shortLabel} cohort enters anchorage`,
    },
    {
      id: `${cohort.id}-berth`,
      time: cohort.berthAt,
      value: -cohort.teu,
      routeId: cohort.routeId,
      route: route.shortLabel,
      cohortId: cohort.id,
      kind: "berth assignment",
      label: `${route.shortLabel} cohort receives a berth`,
    },
    {
      id: `${cohort.id}-customs-hold`,
      time: cohort.berthAt + 4 * HOUR,
      value: customsTeu,
      routeId: cohort.routeId,
      route: route.shortLabel,
      cohortId: cohort.id,
      kind: "customs hold",
      label: `${route.shortLabel} containers enter customs hold`,
    },
    {
      id: `${cohort.id}-customs-release`,
      time: cohort.customsAt,
      value: -customsTeu,
      routeId: cohort.routeId,
      route: route.shortLabel,
      cohortId: cohort.id,
      kind: "customs release",
      label: `${route.shortLabel} containers clear customs`,
    },
  ]
}).sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))

export const PORT_ROUTE_SUMMARIES = PORT_ROUTES.map((route) => {
  const cohorts = PORT_COHORTS.filter((cohort) => cohort.routeId === route.id)
  return {
    routeId: route.id,
    route: route.shortLabel,
    label: route.label,
    carrier: route.carrier,
    origin: route.origin,
    destination: route.destination,
    color: route.color,
    totalTeu: cohorts.reduce((sum, cohort) => sum + cohort.teu, 0),
    transitDays: route.transitDays,
    dwellHours: route.dwellHours,
    delayHours: route.delayHours,
    costIndex: route.costIndex,
    carbonTons: route.carbonTons,
    reliability: route.reliability,
  }
})

const lastRelease = Math.max(...PORT_COHORTS.map((cohort) => cohort.releaseAt))

export const PORT_REPLAY_DOMAIN = [
  PORT_REPLAY_START - DAY,
  lastRelease + DAY,
]

const tickCount = Math.ceil(
  (PORT_REPLAY_DOMAIN[1] - PORT_REPLAY_DOMAIN[0]) / (5 * DAY)
) + 1

export const PORT_AXIS_TICKS = Array.from({ length: tickCount }, (_, index) => {
  const date = PORT_REPLAY_DOMAIN[0] + index * 5 * DAY
  return {
    date,
    label: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(date),
  }
}).filter((tick) => tick.date <= PORT_REPLAY_DOMAIN[1])

export function replayTimeForCursor(cursor) {
  if (cursor <= 0) return PORT_REPLAY_DOMAIN[0]
  return PORT_REPLAY_EVENTS[Math.min(cursor - 1, PORT_REPLAY_EVENTS.length - 1)].time
}

export function flowsAtTime(time, routeId = null) {
  return PORT_ROUTE_SUMMARIES
    .filter((route) => !routeId || route.routeId === routeId)
    .flatMap((route) => {
      const value = PORT_COHORTS
        .filter(
          (cohort) =>
            cohort.routeId === route.routeId &&
            cohort.departAt <= time
        )
        .reduce((sum, cohort) => sum + cohort.teu, 0)
      const sourceRoute = PORT_ROUTES.find(
        (candidate) => candidate.id === route.routeId
      )
      if (!sourceRoute || value <= 0) return []

      return sourceRoute.waypoints.slice(0, -1).map((source, index) => {
        const target = sourceRoute.waypoints[index + 1]
        const sourceLocation = PORT_LOCATIONS.find(
          (location) => location.id === source
        )
        const targetLocation = PORT_LOCATIONS.find(
          (location) => location.id === target
        )
        return {
          ...route,
          id: `${route.routeId}-leg-${index}`,
          source,
          target,
          sourceName: sourceLocation?.name || source,
          targetName: targetLocation?.name || target,
          legIndex: index,
          bottleneck: sourceRoute.bottleneck,
          itinerary: sourceRoute.itinerary,
          value,
        }
      })
    })
    .filter((flow) => flow.value > 0)
}

export function processEdgesAtTime(time, routeId = null) {
  return PORT_PROCESS_EDGES.filter(
    (edge) =>
      edge.startTime <= time &&
      (!routeId || edge.routeId === routeId)
  ).map((edge) => ({
    ...edge,
    endTime: Math.max(edge.startTime + 60 * 1000, Math.min(edge.endTime, time)),
  }))
}

export function backlogAtCursor(cursor, routeId = null) {
  return PORT_REPLAY_EVENTS
    .slice(0, cursor)
    .filter((event) => !routeId || event.routeId === routeId)
    .reduce((sum, event) => sum + event.value, 0)
}

export function aggregateBacklogEvents(events) {
  const byDay = new Map()

  for (const event of events) {
    const date = new Date(event.time)
    const day = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      12
    )
    const current = byDay.get(day) || {
      id: `backlog-${day}`,
      time: day,
      value: 0,
      signalCount: 0,
      routeIds: new Set(),
      routes: new Set(),
      kind: "daily net change",
    }
    current.value += event.value
    current.signalCount += 1
    current.routeIds.add(event.routeId)
    current.routes.add(event.route)
    byDay.set(day, current)
  }

  if (byDay.size === 0) return []

  const days = [...byDay.keys()]
  const firstDay = Math.min(...days)
  const lastDay = Math.max(...days)
  const completeDays = []

  for (let day = firstDay; day <= lastDay; day += DAY) {
    completeDays.push(byDay.get(day) || {
      id: `backlog-${day}`,
      time: day,
      value: 0,
      signalCount: 0,
      routeIds: new Set(),
      routes: new Set(),
      kind: "daily net change",
    })
  }

  return completeDays
    .map((day) => ({
      ...day,
      routeId:
        day.routeIds.size === 1
          ? [...day.routeIds][0]
          : day.routeIds.size === 0
            ? "no-signal"
            : "all-routes",
      route:
        day.routes.size === 1
          ? [...day.routes][0]
          : day.routes.size === 0
            ? "No signal"
            : "All lanes",
      routeIds: undefined,
      routes: undefined,
    }))
    .sort((a, b) => a.time - b.time)
}

export function formatPortTime(time) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    timeZone: "UTC",
  }).format(time)
}
