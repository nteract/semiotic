const NASA_APOLLO_NUMBERS_URL =
  "https://www.nasa.gov/wp-content/uploads/2023/04/sp-4029.pdf"
const NASA_MISSION_TIMELINES_URL =
  "https://history.nasa.gov/wp-content/uploads/static/history/alsj/WOTM/WOTM-sleep.html"
const NASA_APOLLO_13_URL =
  "https://www.nasa.gov/missions/apollo/apollo-13-mission-details/"

/** Convert NASA Ground Elapsed Time (`hhh:mm:ss`) to decimal hours. */
export function elapsedHours(value) {
  const parts = String(value).split(":").map(Number)
  if (parts.some((part) => !Number.isFinite(part)) || parts.length < 2) {
    throw new Error(`Invalid Apollo elapsed time: ${value}`)
  }
  const [hours, minutes, seconds = 0] = parts
  return hours + minutes / 60 + seconds / 3600
}

function crew(name, role) {
  return Object.freeze({ name, role })
}

function mission(config) {
  return Object.freeze({
    ...config,
    crew: Object.freeze(config.crew),
    missionHours: elapsedHours(config.splashdown),
    lunarOrbitInsertion: config.lunarOrbitInsertion
      ? elapsedHours(config.lunarOrbitInsertion)
      : null,
    lunarLanding: config.lunarLanding ? elapsedHours(config.lunarLanding) : null,
    lunarLiftoff: config.lunarLiftoff ? elapsedHours(config.lunarLiftoff) : null,
    transEarthInjection: config.transEarthInjection
      ? elapsedHours(config.transEarthInjection)
      : null,
    surfaceHours:
      config.lunarLanding && config.lunarLiftoff
        ? elapsedHours(config.lunarLiftoff) - elapsedHours(config.lunarLanding)
        : 0,
  })
}

/**
 * Checked-in transcription of the major mission milestones in NASA's
 * Apollo summaries. Times are Ground Elapsed Time from launch.
 */
export const APOLLO_MISSIONS = Object.freeze([
  mission({
    id: "apollo-8",
    label: "Apollo 8",
    year: 1968,
    kind: "orbit",
    color: "#8ecae6",
    crew: [crew("Frank Borman", "CDR"), crew("Jim Lovell", "CMP"), crew("Bill Anders", "LMP")],
    lunarOrbitInsertion: "69:08:20",
    transEarthInjection: "89:19:17",
    splashdown: "146:46:14",
    destination: "Ten lunar orbits",
    story: "The first people to reach and orbit the Moon; all three remained together.",
  }),
  mission({
    id: "apollo-10",
    label: "Apollo 10",
    year: 1969,
    kind: "rehearsal",
    color: "#cdb4db",
    crew: [crew("Tom Stafford", "CDR"), crew("John Young", "CMP"), crew("Gene Cernan", "LMP")],
    lunarOrbitInsertion: "75:55:54",
    undocking: elapsedHours("98:11:57"),
    lowPass: elapsedHours("100:51:00"),
    // A display segmentation after closest approach; docking remains
    // the published endpoint for the low-pass crew's return ribbon.
    ascentStart: elapsedHours("102:00:00"),
    docking: elapsedHours("106:22:02"),
    transEarthInjection: "137:36:29",
    splashdown: "192:03:23",
    destination: "47,400-foot low pass",
    story: "The dress rehearsal: two descended to aircraft altitude, then returned to John Young.",
  }),
  mission({
    id: "apollo-11",
    label: "Apollo 11",
    year: 1969,
    kind: "landing",
    color: "#f4a261",
    crew: [crew("Neil Armstrong", "CDR"), crew("Michael Collins", "CMP"), crew("Buzz Aldrin", "LMP")],
    lunarOrbitInsertion: "75:49:50",
    lunarLanding: "102:45:40",
    lunarLiftoff: "124:22:01",
    transEarthInjection: "135:23:42",
    splashdown: "195:18:35",
    destination: "Sea of Tranquility",
    story: "The first landing. Armstrong and Aldrin descended while Collins kept lunar orbit.",
  }),
  mission({
    id: "apollo-12",
    label: "Apollo 12",
    year: 1969,
    kind: "landing",
    color: "#e9c46a",
    crew: [crew("Pete Conrad", "CDR"), crew("Dick Gordon", "CMP"), crew("Alan Bean", "LMP")],
    lunarOrbitInsertion: "83:25:23",
    lunarLanding: "110:32:36",
    lunarLiftoff: "142:03:48",
    transEarthInjection: "172:27:17",
    splashdown: "244:36:25",
    destination: "Ocean of Storms",
    story: "A precision landing near Surveyor 3; Gordon orbited while Conrad and Bean explored.",
  }),
  mission({
    id: "apollo-13",
    label: "Apollo 13",
    year: 1970,
    kind: "abort",
    color: "#ef476f",
    crew: [crew("Jim Lovell", "CDR"), crew("Jack Swigert", "CMP"), crew("Fred Haise", "LMP")],
    accident: elapsedHours("55:54:00"),
    lifeboatStart: elapsedHours("58:40:00"),
    returnBurn: elapsedHours("79:28:00"),
    splashdown: "142:54:41",
    destination: "Free-return rescue",
    story: "An oxygen-tank explosion sent all three into the lunar module lifeboat instead of orbit.",
  }),
  mission({
    id: "apollo-14",
    label: "Apollo 14",
    year: 1971,
    kind: "landing",
    color: "#e76f51",
    crew: [crew("Alan Shepard", "CDR"), crew("Stu Roosa", "CMP"), crew("Ed Mitchell", "LMP")],
    lunarOrbitInsertion: "81:56:41",
    lunarLanding: "108:15:09",
    lunarLiftoff: "141:45:40",
    transEarthInjection: "148:36:02",
    splashdown: "216:01:58",
    destination: "Fra Mauro",
    story: "The destination Apollo 13 missed; Roosa stayed above while Shepard and Mitchell landed.",
  }),
  mission({
    id: "apollo-15",
    label: "Apollo 15",
    year: 1971,
    kind: "landing",
    color: "#f6bd60",
    crew: [crew("Dave Scott", "CDR"), crew("Al Worden", "CMP"), crew("Jim Irwin", "LMP")],
    lunarOrbitInsertion: "78:32:00",
    lunarLanding: "104:42:29",
    lunarLiftoff: "171:37:23",
    transEarthInjection: "223:49:00",
    splashdown: "295:11:53",
    destination: "Hadley–Apennine",
    story: "The first long-stay science mission and first lunar rover; Worden remained in orbit.",
  }),
  mission({
    id: "apollo-16",
    label: "Apollo 16",
    year: 1972,
    kind: "landing",
    color: "#84a59d",
    crew: [crew("John Young", "CDR"), crew("Ken Mattingly", "CMP"), crew("Charlie Duke", "LMP")],
    lunarOrbitInsertion: "74:28:28",
    lunarLanding: "104:29:35",
    lunarLiftoff: "175:31:48",
    transEarthInjection: "200:21:33",
    splashdown: "265:51:05",
    destination: "Descartes Highlands",
    story: "A delayed landing opened the lunar highlands; Mattingly watched from orbit.",
  }),
  mission({
    id: "apollo-17",
    label: "Apollo 17",
    year: 1972,
    kind: "landing",
    color: "#2a9d8f",
    crew: [crew("Gene Cernan", "CDR"), crew("Ron Evans", "CMP"), crew("Jack Schmitt", "LMP")],
    lunarOrbitInsertion: "86:14:23",
    lunarLanding: "110:21:58",
    lunarLiftoff: "185:21:37",
    transEarthInjection: "234:02:09",
    splashdown: "301:51:59",
    destination: "Taurus–Littrow",
    story: "The longest surface stay and Apollo's final lunar landing; Evans orbited alone.",
  }),
])

// Keep every story lens on the same clock so changing the mission selection
// never changes the visual meaning of horizontal distance. The four-hour
// buffer clears Apollo 17's splashdown and rounds the comparison to Day 13.
export const APOLLO_MAX_DOMAIN_HOURS = Math.ceil(
  (Math.max(...APOLLO_MISSIONS.map((row) => row.missionHours)) + 4) / 24,
) * 24

export const APOLLO_PHASE_COLORS = Object.freeze({
  launch: "#f3c969",
  orbit: "#8ecae6",
  surface: "#e8875f",
  rehearsal: "#cdb4db",
  lifeboat: "#ef476f",
  recovery: "#72c7a5",
})

export const APOLLO_PROCESS_NODES = Object.freeze([
  { id: "LAUNCH", label: "Launch", category: "launch", xExtent: [0, 4] },
  { id: "LUNAR ORBIT", label: "Lunar orbit", category: "orbit" },
  { id: "LOW PASS", label: "Low pass", category: "rehearsal" },
  { id: "SURFACE", label: "Lunar surface", category: "surface" },
  { id: "LIFEBOAT", label: "LM lifeboat", category: "lifeboat" },
  {
    id: "RECOVERY",
    label: "Recovery",
    category: "recovery",
    xExtent: [0, APOLLO_MAX_DOMAIN_HOURS],
  },
])

function edge(missionRow, suffix, source, target, value, startTime, endTime, people, note) {
  return Object.freeze({
    id: `${missionRow.id}-${suffix}`,
    missionId: missionRow.id,
    mission: missionRow.label,
    missionColor: missionRow.color,
    source,
    target,
    value,
    startTime,
    endTime,
    people: Object.freeze(people),
    note,
  })
}

function edgesForMission(missionRow) {
  const everyone = missionRow.crew.map((member) => member.name)
  if (missionRow.kind === "abort") {
    return [
      edge(
        missionRow,
        "accident",
        "LAUNCH",
        "LIFEBOAT",
        3,
        0,
        missionRow.lifeboatStart,
        everyone,
        "Launch to command-module power-down after the oxygen-tank accident",
      ),
      edge(
        missionRow,
        "free-return",
        "LIFEBOAT",
        "RECOVERY",
        3,
        missionRow.returnBurn,
        missionRow.missionHours,
        everyone,
        "PC+2 return burn to Pacific splashdown",
      ),
    ]
  }

  const rows = [
    edge(
      missionRow,
      "outbound",
      "LAUNCH",
      "LUNAR ORBIT",
      3,
      0,
      missionRow.lunarOrbitInsertion,
      everyone,
      "Launch to lunar-orbit insertion",
    ),
  ]

  if (missionRow.kind === "rehearsal") {
    const descentCrew = missionRow.crew.filter((member) => member.role !== "CMP").map((d) => d.name)
    rows.push(
      edge(
        missionRow,
        "low-pass",
        "LUNAR ORBIT",
        "LOW PASS",
        2,
        missionRow.undocking,
        missionRow.lowPass,
        descentCrew,
        "Snoopy undocking to its 47,400-foot pass",
      ),
      edge(
        missionRow,
        "low-pass-return",
        "LOW PASS",
        "LUNAR ORBIT",
        2,
        missionRow.ascentStart,
        missionRow.docking,
        descentCrew,
        "Ascent-stage return and rendezvous docking (display interval)",
      ),
    )
  }

  if (missionRow.kind === "landing") {
    const surfaceCrew = missionRow.crew.filter((member) => member.role !== "CMP").map((d) => d.name)
    // NASA's compact summary publishes landing/liftoff but not every LM
    // separation and docking. The short 2.5 h descent / 4 h ascent ribbons
    // are explicit display intervals; the surface band's endpoints remain
    // the exact published landing and liftoff times.
    const descentStart = Math.max(missionRow.lunarOrbitInsertion + 0.25, missionRow.lunarLanding - 2.5)
    const docking = Math.min(missionRow.lunarLiftoff + 4, missionRow.transEarthInjection - 0.25)
    rows.push(
      edge(
        missionRow,
        "descent",
        "LUNAR ORBIT",
        "SURFACE",
        2,
        descentStart,
        missionRow.lunarLanding,
        surfaceCrew,
        "Lunar-module separation and descent (display interval)",
      ),
      edge(
        missionRow,
        "ascent",
        "SURFACE",
        "LUNAR ORBIT",
        2,
        missionRow.lunarLiftoff,
        docking,
        surfaceCrew,
        "Liftoff and command-module rendezvous (display interval)",
      ),
    )
  }

  rows.push(
    edge(
      missionRow,
      "homebound",
      "LUNAR ORBIT",
      "RECOVERY",
      3,
      missionRow.transEarthInjection,
      missionRow.missionHours,
      everyone,
      "Trans-Earth injection to splashdown",
    ),
  )
  return rows
}

export const APOLLO_PROCESS_EDGES = Object.freeze(APOLLO_MISSIONS.flatMap(edgesForMission))

export const APOLLO_SOURCES = Object.freeze([
  {
    label: "Apollo by the Numbers",
    publisher: "NASA History Office",
    url: NASA_APOLLO_NUMBERS_URL,
    use: "Primary statistical reference and mission chronology.",
  },
  {
    label: "Apollo mission milestone summaries",
    publisher: "NASA Apollo Lunar Surface Journal",
    url: NASA_MISSION_TIMELINES_URL,
    use: "Transcribed GET for orbit insertion, landing, liftoff, return burn, and splashdown.",
  },
  {
    label: "Apollo 13 mission details",
    publisher: "NASA",
    url: NASA_APOLLO_13_URL,
    use: "Accident, lunar-module lifeboat, and free-return interpretation.",
  },
])

const uniquePeople = new Set(APOLLO_MISSIONS.flatMap((row) => row.crew.map((member) => member.name)))
const landingMissions = APOLLO_MISSIONS.filter((row) => row.kind === "landing")

export const APOLLO_SUMMARY = Object.freeze({
  missions: APOLLO_MISSIONS.length,
  crewSeats: APOLLO_MISSIONS.reduce((sum, row) => sum + row.crew.length, 0),
  uniquePeople: uniquePeople.size,
  lunarSurfacePeople: landingMissions.length * 2,
  soloOrbiters: landingMissions.length,
  landingMissions: landingMissions.length,
  repeatVoyagers: Object.freeze(
    [...uniquePeople]
      .map((name) => ({
        name,
        missions: APOLLO_MISSIONS.filter((row) => row.crew.some((member) => member.name === name))
          .map((row) => row.label),
      }))
      .filter((row) => row.missions.length > 1),
  ),
})

export function missionsForFocus(focusId) {
  if (focusId === "all") return APOLLO_MISSIONS
  if (focusId === "landings") return APOLLO_MISSIONS.filter((row) => row.kind === "landing")
  if (focusId === "long-stay") return APOLLO_MISSIONS.filter((row) => ["apollo-15", "apollo-16", "apollo-17"].includes(row.id))
  return APOLLO_MISSIONS.filter((row) => row.id === focusId)
}

export function processDataForFocus(focusId) {
  const missions = missionsForFocus(focusId)
  const missionIds = new Set(missions.map((row) => row.id))
  const edges = APOLLO_PROCESS_EDGES.filter((row) => missionIds.has(row.missionId))
  const usedNodes = new Set(edges.flatMap((row) => [row.source, row.target]))
  const nodes = APOLLO_PROCESS_NODES.filter((row) => usedNodes.has(row.id))
  return { missions, edges, nodes, domain: [0, APOLLO_MAX_DOMAIN_HOURS] }
}

export function axisTicksForMissionHours(domainEnd) {
  const step = domainEnd <= 216 ? 48 : 72
  const ticks = []
  for (let hour = 0; hour <= domainEnd; hour += step) {
    ticks.push({ date: hour, label: hour === 0 ? "Launch" : `Day ${hour / 24}` })
  }
  if (ticks.at(-1)?.date !== domainEnd) {
    ticks.push({ date: domainEnd, label: `Day ${domainEnd / 24}` })
  }
  return ticks
}

export function formatElapsedHours(value) {
  const hours = Number(value)
  if (!Number.isFinite(hours)) return "—"
  const totalMinutes = Math.round(hours * 60)
  const day = Math.floor(totalMinutes / (24 * 60))
  const hour = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minute = totalMinutes % 60
  return `T+${day}d ${String(hour).padStart(2, "0")}h ${String(minute).padStart(2, "0")}m`
}

export function formatDurationHours(value) {
  const hours = Number(value)
  if (!Number.isFinite(hours)) return "—"
  if (hours < 48) return `${hours.toFixed(1)} hours`
  return `${(hours / 24).toFixed(1)} days`
}
