/**
 * Regenerates portwatchChokepointDaily.js from the IMF PortWatch open-data API.
 *
 *   node docs/src/pages/examples/data/fetchPortwatchData.mjs
 *
 * Source: IMF PortWatch (portwatch.imf.org), "Daily Chokepoint Transit Calls
 * and Trade Volume Estimates" — AIS-derived daily vessel transits for 28
 * maritime chokepoints, hosted as a keyless ArcGIS feature service and
 * updated weekly. The extract below bakes three historical windows so the
 * docs example replays real events without a runtime dependency.
 */

const SERVICE =
  "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/ArcGIS/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query"

const CHOKEPOINTS = {
  suez: { portid: "chokepoint1", name: "Suez Canal" },
  panama: { portid: "chokepoint2", name: "Panama Canal" },
  babElMandeb: { portid: "chokepoint4", name: "Bab el-Mandeb Strait" },
  malacca: { portid: "chokepoint5", name: "Malacca Strait" },
  capeOfGoodHope: { portid: "chokepoint7", name: "Cape of Good Hope" },
  gibraltar: { portid: "chokepoint8", name: "Gibraltar Strait" },
  dover: { portid: "chokepoint9", name: "Dover Strait" },
  taiwanStrait: { portid: "chokepoint11", name: "Taiwan Strait" },
  windwardPassage: { portid: "chokepoint23", name: "Windward Passage" },
}

// Each window carries a 7-day lead-in used for the pre-event baseline and
// trailing averages; only the days after `lead` are replayed.
const WINDOWS = {
  steady: { start: "2023-03-27", lead: 7, days: 42 },
  everGiven: { start: "2021-03-01", lead: 7, days: 42 },
  redSea: { start: "2023-11-06", lead: 7, days: 70 },
}

const DAY = 24 * 60 * 60 * 1000

function isoAfter(startISO, dayOffset) {
  return new Date(Date.parse(`${startISO}T00:00:00Z`) + dayOffset * DAY)
    .toISOString()
    .slice(0, 10)
}

async function fetchSeries(portid, startISO, totalDays) {
  const endISO = isoAfter(startISO, totalDays - 1)
  const params = new URLSearchParams({
    where: `portid='${portid}' AND date>=TIMESTAMP '${startISO}' AND date<=TIMESTAMP '${endISO}'`,
    outFields: "date,n_container,capacity_container",
    orderByFields: "date",
    returnGeometry: "false",
    f: "json",
  })
  const response = await fetch(`${SERVICE}?${params}`)
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${portid}`)
  const payload = await response.json()
  if (payload.error) throw new Error(`${portid}: ${JSON.stringify(payload.error)}`)

  const byDate = new Map(
    payload.features.map(({ attributes }) => [attributes.date, attributes])
  )
  const transits = []
  const capacity = []
  for (let index = 0; index < totalDays; index += 1) {
    const date = isoAfter(startISO, index)
    const row = byDate.get(date)
    if (!row) throw new Error(`Missing ${portid} row for ${date}`)
    transits.push(row.n_container)
    capacity.push(Math.round(row.capacity_container))
  }
  return { transits, capacity }
}

const windows = {}
for (const [windowId, window] of Object.entries(WINDOWS)) {
  const totalDays = window.lead + window.days
  const series = {}
  for (const [chokepointId, chokepoint] of Object.entries(CHOKEPOINTS)) {
    series[chokepointId] = await fetchSeries(
      chokepoint.portid,
      window.start,
      totalDays
    )
    console.log(`fetched ${windowId}/${chokepointId} (${totalDays} days)`)
  }
  windows[windowId] = { ...window, series }
}

const banner = `/**
 * GENERATED FILE — do not edit by hand. Regenerate with:
 *   node docs/src/pages/examples/data/fetchPortwatchData.mjs
 *
 * Real daily container-ship transit counts and container-fleet capacity
 * (deadweight tons) at nine maritime chokepoints, from IMF PortWatch
 * (https://portwatch.imf.org), "Daily Chokepoint Transit Calls and Trade
 * Volume Estimates" — AIS-derived, produced by the IMF and Oxford University.
 * Cite as: IMF PortWatch, portwatch.imf.org.
 *
 * Each window includes a lead-in (\`lead\` days) before the replayed range,
 * used for pre-event baselines and trailing averages. Series arrays are
 * day-aligned from \`start\`.
 */
`

const body = `export const PORTWATCH_FETCHED_AT = ${JSON.stringify(
  new Date().toISOString().slice(0, 10)
)}

export const PORTWATCH_ATTRIBUTION =
  "Data: IMF PortWatch (portwatch.imf.org), daily chokepoint transit calls, AIS-derived by the IMF and Oxford University."

export const PORTWATCH_CHOKEPOINT_NAMES = ${JSON.stringify(
  Object.fromEntries(
    Object.entries(CHOKEPOINTS).map(([id, { name }]) => [id, name])
  ),
  null,
  2
)}

export const PORTWATCH_WINDOWS = ${JSON.stringify(windows, null, 2)}
`

const outPath = new URL("./portwatchChokepointDaily.js", import.meta.url)
await import("node:fs/promises").then(({ writeFile }) =>
  writeFile(outPath, banner + body)
)
console.log(`wrote ${outPath.pathname}`)
