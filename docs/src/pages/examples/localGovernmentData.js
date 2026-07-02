import { unwrapDatum } from "semiotic/recipes"

const LOCUS_FILTER_URL = "https://datasets-server.huggingface.co/filter"
const LEGISTAR_URL = "https://webapi.legistar.com/v1"
const FCC_AREA_URL = "https://geo.fcc.gov/api/census/area"
const FEMA_URL = "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries"

export const ZIP_PRESETS = [
  { zip: "98101", label: "Seattle" },
  { zip: "94110", label: "San Francisco" },
  { zip: "60601", label: "Chicago" },
  { zip: "78701", label: "Austin" },
  { zip: "37201", label: "Nashville" },
]

const ZIP_FALLBACKS = {
  "98101": { zip: "98101", city: "Seattle", state: "Washington", stateCode: "WA", latitude: 47.6109, longitude: -122.3303 },
  "94110": { zip: "94110", city: "San Francisco", state: "California", stateCode: "CA", latitude: 37.7486, longitude: -122.4156 },
  "60601": { zip: "60601", city: "Chicago", state: "Illinois", stateCode: "IL", latitude: 41.8858, longitude: -87.6229 },
  "78701": { zip: "78701", city: "Austin", state: "Texas", stateCode: "TX", latitude: 30.2713, longitude: -97.7426 },
  "37201": { zip: "37201", city: "Nashville", state: "Tennessee", stateCode: "TN", latitude: 36.1667, longitude: -86.7782 },
}

const LEGISTAR_CLIENTS = {
  "seattle|wa": { client: "seattle", label: "Seattle City Council", snapshot: "seattle|wa" },
  "san francisco|ca": { client: "sfgov", label: "San Francisco Board of Supervisors" },
  "chicago|il": { client: "chicago", label: "Chicago City Council" },
  "austin|tx": { client: "austintexas", label: "Austin City Council" },
  "nashville|tn": { client: "nashville", label: "Nashville Metropolitan Council" },
}

// City open-data 311 endpoints (Socrata SODA): keyless and browser-readable
// (CORS). One config per covered city; field names differ per portal, so each
// declares its date/type/status/address columns and how to scope to a ZIP.
// Everywhere else degrades to an honest "no open feed" notice — e.g. Nashville
// has migrated to ArcGIS Hub, which exposes no comparable public SODA endpoint.
export const CIVIC_DATA_PORTALS = {
  "seattle|wa": {
    label: "Seattle Customer Service Requests",
    domain: "data.seattle.gov",
    dataset: "5ngg-rpne",
    dateField: "createddate",
    typeField: "webintakeservicerequests",
    statusField: "servicerequeststatusname",
    addressField: "location",
    agencyField: "departmentname",
    locality: (location) => `zipcode='${location.zip}'`,
    scopeLabel: (location) => `ZIP ${location.zip}`,
  },
  "san francisco|ca": {
    label: "San Francisco 311 Cases",
    domain: "data.sfgov.org",
    dataset: "vw6y-z8j6",
    dateField: "requested_datetime",
    typeField: "service_name",
    statusField: "status_description",
    addressField: "address",
    agencyField: "agency_responsible",
    locality: (location) => `within_circle(point, ${location.latitude}, ${location.longitude}, 2400)`,
    scopeLabel: () => "within ~1.5 mi",
  },
  "chicago|il": {
    label: "Chicago 311 Service Requests",
    domain: "data.cityofchicago.org",
    dataset: "v6vf-nfxy",
    dateField: "created_date",
    typeField: "sr_type",
    statusField: "status",
    addressField: "street_address",
    agencyField: "owner_department",
    locality: (location) => `zip_code='${location.zip}'`,
    scopeLabel: (location) => `ZIP ${location.zip}`,
  },
  "austin|tx": {
    label: "Austin 311 Service Requests",
    domain: "data.austintexas.gov",
    dataset: "xwdj-i9he",
    dateField: "sr_created_date",
    typeField: "sr_type_desc",
    statusField: "sr_status_desc",
    addressField: "sr_location",
    agencyField: "sr_department_desc",
    locality: (location) => `sr_location_zip_code='${location.zip}'`,
    scopeLabel: (location) => `ZIP ${location.zip}`,
  },
}

// Legistar's public API works server-to-server but does not emit browser CORS
// headers. The docs example is a static site, so demonstrated activity uses a
// compact, source-linked snapshot instead of an opaque third-party CORS proxy.
// Captured 2026-06-27 from the public Seattle Legistar client.
const ACTIVITY_SNAPSHOTS = {
  "seattle|wa": {
    capturedAt: "2026-06-27T23:59:00Z",
    matters: [
      {
        id: 17122,
        guid: "C6883C6F-A0AE-4F56-9B4D-D1F5370D8780",
        file: "CB 121218",
        title: "An ordinance relating to housing for low-income households; adopting the 2023 Seattle Housing Levy Administrative and Financial Plan for program years 2026-2028; adopting Housing Funding Policies for program years 2026-2028 for the 2023 Seattle Housing Levy and other fund sources; authorizing actions by the Director of Housing regarding past and future housing loans and contracts.",
        type: "Council Bill (CB)",
        status: "Full Council Agenda Ready",
        bodyId: 278,
        bodyName: "Housing, Arts, and Civil Rights Committee",
        intro: "2026-04-29T00:00:00",
        agenda: "2026-06-30T00:00:00",
        modified: "2026-06-27T16:10:48.377",
      },
      {
        id: 17227,
        guid: "2B12C3B4-0290-470D-9AC1-76132EC08699",
        file: "CB 121236",
        title: "An ordinance relating to the Office of Housing; granting a ground lease of real property located at 2929 27th Ave South to support affordable housing and commercial space intended for early learning and childcare uses.",
        type: "Council Bill (CB)",
        status: "Full Council Agenda Ready",
        bodyId: 278,
        bodyName: "Housing, Arts, and Civil Rights Committee",
        intro: "2026-06-03T00:00:00",
        agenda: "2026-06-30T00:00:00",
        modified: "2026-06-27T02:30:41.61",
      },
      {
        id: 17185,
        guid: "3EBB016B-DDE5-45B9-9871-3241FD59946D",
        file: "CB 121238",
        title: "An ordinance authorizing acquisition of two Central Area parcels for affordable homeownership units and selection of a developer.",
        type: "Council Bill (CB)",
        status: "Full Council Agenda Ready",
        bodyId: 278,
        bodyName: "Housing, Arts, and Civil Rights Committee",
        intro: "2026-05-22T00:00:00",
        agenda: "2026-06-30T00:00:00",
        modified: "2026-06-27T02:27:31.647",
      },
      {
        id: 17279,
        guid: "7BFA8D72-2566-4097-AF29-75F4E2162D34",
        file: "Inf 2916",
        title: "Homeowner Privacy and Protection Legislation",
        type: "Information Item (Inf)",
        status: "Committee Agenda Ready",
        bodyId: 278,
        bodyName: "Housing, Arts, and Civil Rights Committee",
        intro: "2026-06-25T00:00:00",
        agenda: "2026-06-29T00:00:00",
        modified: "2026-06-27T01:01:35.753",
      },
      {
        id: 17226,
        guid: "0DCBC9B5-323E-446E-9EE0-A24E8A096501",
        file: "CB 121241",
        title: "An ordinance relating to the City Light Department and long-term agreements for electric power, transmission, and ancillary services.",
        type: "Council Bill (CB)",
        status: "Introduction & Referral Ready",
        bodyId: 281,
        bodyName: "Parks and City Light Committee",
        intro: "2026-06-03T00:00:00",
        agenda: "2026-07-01T00:00:00",
        modified: "2026-06-26T23:50:46.22",
      },
      {
        id: 17237,
        guid: "3A136216-1BFC-460C-8DF7-CC97E469D315",
        file: "CB 121243",
        title: "An ordinance relating to land use and zoning; temporarily changing design review requirements for housing projects meeting Mandatory Housing Affordability requirements.",
        type: "Council Bill (CB)",
        status: "Introduction & Referral Ready",
        bodyId: 280,
        bodyName: "Land Use and Sustainability Committee",
        intro: "2026-06-09T00:00:00",
        agenda: null,
        modified: "2026-06-26T22:58:48.527",
      },
    ],
    events: [
      { id: 6801, bodyId: 281, bodyName: "Parks and City Light Committee", date: "2026-07-01T00:00:00", time: "2:00 PM", status: "Final", location: "Council Chamber, City Hall\n600 4th Avenue\nSeattle, WA 98104", comment: null, sourceUrl: "https://seattle.legistar.com/MeetingDetail.aspx?LEGID=6801&GID=393&G=FFE3B678-CEF6-4197-84AC-5204EA4CFC0C" },
      { id: 6800, bodyId: 284, bodyName: "Select Committee on Seattle Transportation Benefit District", date: "2026-07-06T00:00:00", time: "11:00 AM", status: "Final", location: "Council Chamber, City Hall\n600 4th Avenue\nSeattle, WA 98104", comment: "Special Meeting", sourceUrl: "https://seattle.legistar.com/MeetingDetail.aspx?LEGID=6800&GID=393&G=FFE3B678-CEF6-4197-84AC-5204EA4CFC0C" },
      { id: 6797, bodyId: 284, bodyName: "Select Committee on Seattle Transportation Benefit District", date: "2026-07-06T00:00:00", time: "2:00 PM", status: "Cancelled", location: "Council Chamber, City Hall\n600 4th Avenue\nSeattle, WA 98104", comment: "Cancelled and Rescheduled", sourceUrl: "https://seattle.legistar.com/MeetingDetail.aspx?LEGID=6797&GID=393&G=FFE3B678-CEF6-4197-84AC-5204EA4CFC0C" },
      { id: 6786, bodyId: 211, bodyName: "Council Briefing", date: "2026-07-06T00:00:00", time: "2:00 PM", status: "Cancelled", location: "Council Chamber, City Hall\n600 4th Avenue\nSeattle, WA 98104", comment: "Cancellation Notice", sourceUrl: "https://seattle.legistar.com/MeetingDetail.aspx?LEGID=6786&GID=393&G=FFE3B678-CEF6-4197-84AC-5204EA4CFC0C" },
      { id: 6812, bodyId: 279, bodyName: "Human Services, Labor, and Economic Development Committee", date: "2026-07-10T00:00:00", time: "9:30 AM", status: "Cancelled", location: "Council Chamber, City Hall\n600 4th Avenue\nSeattle, WA 98104", comment: "Cancelled and Rescheduled", sourceUrl: "https://seattle.legistar.com/MeetingDetail.aspx?LEGID=6812&GID=393&G=FFE3B678-CEF6-4197-84AC-5204EA4CFC0C" },
      { id: 6729, bodyId: 282, bodyName: "Transportation, Waterfront, and Seattle Center Committee", date: "2026-07-16T00:00:00", time: "9:30 AM", status: "Cancelled", location: "Council Chamber, City Hall\n600 4th Avenue\nSeattle, WA 98104", comment: "Cancellation Notice", sourceUrl: "https://seattle.legistar.com/MeetingDetail.aspx?LEGID=6729&GID=393&G=FFE3B678-CEF6-4197-84AC-5204EA4CFC0C" },
    ],
    sponsors: [
      { name: "Dionne Foster", nameId: 844, matterId: 17122 },
      { name: "Dionne Foster", nameId: 844, matterId: 17227 },
      { name: "Dionne Foster", nameId: 844, matterId: 17185 },
      { name: "Debora Juarez", nameId: 523, matterId: 17226 },
      { name: "Eddie Lin", nameId: 842, matterId: 17237 },
    ],
  },
}

// LOCUS stores multi-word city names with underscores as separators
// ("santa_cruz", "san_francisco"), so aliases must match that format.
const CITY_ALIASES = {
  "new york": ["new_york", "new_york_city"],
  "san francisco": ["san_francisco"],
  "st. louis": ["st_louis", "saint_louis"],
  "saint louis": ["st_louis", "saint_louis"],
}

export const NODE_COLORS = {
  jurisdiction: "#e7e1cf",
  branch: "#8da4bd",
  body: "#4d83a8",
  person: "#db9b55",
  matter: "#d96b5f",
  meeting: "#9b7bc1",
  function: "#6f9e7a",
  topic: "#54a9a1",
  law: "#b7a66a",
}

export const TOPIC_COLORS = {
  Housing: "#d96b5f",
  Transportation: "#4d83a8",
  "Land use": "#6f9e7a",
  Budget: "#db9b55",
  Safety: "#9b7bc1",
  Environment: "#54a9a1",
  Labor: "#c07b9d",
  Health: "#7c9d59",
  Education: "#b7a66a",
  Business: "#7f8fa6",
  Buildings: "#8c7464",
  Nuisance: "#9b6d5b",
  Zoning: "#5e9272",
  Other: "#8b929a",
}

export async function resolveZip(zip, signal) {
  const normalized = String(zip).trim()
  if (!/^\d{5}$/.test(normalized)) throw new Error("Enter a five-digit U.S. ZIP code.")

  try {
    const response = await fetch(`https://api.zippopotam.us/us/${normalized}`, { signal })
    if (!response.ok) throw new Error("ZIP code not found")
    const payload = await response.json()
    const place = payload.places?.[0]
    if (!place) throw new Error("ZIP code has no associated place")
    return {
      zip: normalized,
      city: place["place name"],
      state: place.state,
      stateCode: place["state abbreviation"],
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
      source: "Zippopotam.us / GeoNames",
      sourceMode: "live",
      alternatePlaces: payload.places.slice(1).map((item) => item["place name"]),
    }
  } catch (error) {
    if (error.name === "AbortError") throw error
    const fallback = ZIP_FALLBACKS[normalized]
    if (!fallback) throw error
    return {
      ...fallback,
      source: "bundled ZIP fallback",
      sourceMode: "fallback",
      alternatePlaces: [],
    }
  }
}

export function getLegistarCoverage(location) {
  if (!location) return null
  return LEGISTAR_CLIENTS[`${location.city.toLowerCase()}|${location.stateCode.toLowerCase()}`] || null
}

export async function fetchLocusLaws(location, signal) {
  const state = location.stateCode.toLowerCase()
  const aliases = CITY_ALIASES[location.city.toLowerCase()] || [locusCitySlug(location.city)]
  const cityPredicate = aliases
    .map((city) => `"city"='${escapeSql(city)}'`)
    .join(" OR ")
  const where = `"state"='${escapeSql(state)}' AND (${cityPredicate})`
  const params = new URLSearchParams({
    dataset: "LocalLaws/LOCUS-v1",
    config: "default",
    split: "train",
    where,
    length: "100",
  })
  let lastError
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(`${LOCUS_FILTER_URL}?${params}`, { signal })
      const payload = await response.json()
      if (!response.ok || payload.error) {
        const message = payload.error || `LOCUS returned ${response.status}`
        if (/index is loading/i.test(message) && attempt < 1) {
          await wait(1800 + attempt * 900, signal)
          continue
        }
        throw new Error(message)
      }

      const laws = (payload.rows || [])
        .map((entry) => normalizeLocusLaw(entry))
        .filter((law) => law.header || law.content)

      return {
        laws: balanceLocusRows(laws, 56),
        sourceMode: "live",
        matchedCity: aliases.find((alias) => laws.some((law) => law.city === alias)) || aliases[0],
        totalMatches: payload.num_rows_total ?? laws.length,
      }
    } catch (error) {
      if (error.name === "AbortError") throw error
      lastError = error
      if (attempt < 1 && /index is loading/i.test(error.message)) {
        await wait(1800 + attempt * 900, signal)
        continue
      }
      break
    }
  }

  throw lastError || new Error("LOCUS did not return data for this jurisdiction.")
}

export async function fetchLegistarActivity(location, signal) {
  const coverage = getLegistarCoverage(location)
  if (!coverage) {
    return {
      coverage: null,
      matters: [],
      meetings: [],
      sponsors: [],
      sourceMode: "unavailable",
    }
  }

  const snapshot = coverage.snapshot ? ACTIVITY_SNAPSHOTS[coverage.snapshot] : null
  if (snapshot && typeof window !== "undefined") {
    return normalizeActivitySnapshot(snapshot, coverage)
  }
  if (typeof window !== "undefined") {
    return {
      coverage,
      matters: [],
      meetings: [],
      sponsors: [],
      sourceMode: "unavailable",
    }
  }

  const matterParams = new URLSearchParams({
    "$top": "18",
    "$orderby": "MatterLastModifiedUtc desc",
  })
  const eventParams = new URLSearchParams({
    "$top": "24",
    "$orderby": "EventDate desc",
  })
  const base = `${LEGISTAR_URL}/${coverage.client}`

  const [matters, events] = await Promise.all([
    fetchJSON(`${base}/Matters?${matterParams}`, signal),
    fetchJSON(`${base}/Events?${eventParams}`, signal),
  ])

  const visibleMatters = matters
    .filter((matter) => !matter.MatterRestrictViewViaWeb)
    .map((matter) => normalizeMatter(matter, coverage.client))

  const sponsorResults = await Promise.allSettled(
    visibleMatters.slice(0, 14).map(async (matter) => {
      const sponsors = await fetchJSON(`${base}/Matters/${matter.rawId}/Sponsors`, signal)
      return sponsors.map((sponsor) => normalizeSponsor(sponsor, matter.id))
    }),
  )
  const sponsors = sponsorResults.flatMap((result) => result.status === "fulfilled" ? result.value : [])

  const meetings = events
    .map((event) => normalizeMeeting(event))
    .sort(compareMeetings)
    .slice(0, 12)

  return {
    coverage,
    matters: visibleMatters,
    meetings,
    sponsors,
    sourceMode: "live",
  }
}

// ---------------------------------------------------------------------------
// Universal layer — works for ANY U.S. ZIP, no API key:
// ZIP coordinates -> county (FCC area service) -> federal disaster history
// (OpenFEMA). This is the one layer guaranteed to resolve everywhere.
// ---------------------------------------------------------------------------

export async function fetchCounty(location, signal) {
  const params = new URLSearchParams({
    lat: String(location.latitude),
    lon: String(location.longitude),
    format: "json",
  })
  const response = await fetch(`${FCC_AREA_URL}?${params}`, { signal })
  if (!response.ok) throw new Error(`County lookup returned ${response.status}`)
  const payload = await response.json()
  const match = (payload.results || []).find((row) => row.county_fips) || null
  if (!match) throw new Error("No U.S. county matches these coordinates.")
  return parseCounty(match)
}

export function parseCounty(result) {
  const fips = String(result.county_fips || "").padStart(5, "0")
  return {
    countyFips: fips,
    stateFips: fips.slice(0, 2),
    countyCode: fips.slice(2),
    countyName: result.county_name || "Unknown county",
    stateCode: result.state_code || "",
    stateName: result.state_name || "",
  }
}

export async function fetchDisasterHistory(county, signal) {
  const filter = `fipsStateCode eq '${county.stateFips}' and fipsCountyCode eq '${county.countyCode}'`
  const params = new URLSearchParams({
    "$filter": filter,
    "$select": "disasterNumber,femaDeclarationString,declarationType,declarationTitle,declarationDate,fyDeclared,incidentType,iaProgramDeclared",
    "$orderby": "declarationDate desc",
    "$top": "1000",
  })
  const payload = await fetchJSON(`${FEMA_URL}?${params}`, signal)
  return summarizeDisasters(payload.DisasterDeclarationsSummaries || [], county)
}

// FEMA returns one row per declaration PER program flag, so the same
// disasterNumber can repeat. Dedupe to unique declarations before counting.
export function summarizeDisasters(rows, county) {
  const byNumber = new Map()
  rows.forEach((row) => {
    const key = row.disasterNumber
    if (key == null) return
    const existing = byNumber.get(key)
    if (existing) {
      if (row.iaProgramDeclared) existing.individualAssistance = true
      return
    }
    byNumber.set(key, {
      id: `disaster-${key}`,
      number: key,
      kind: "disaster",
      declarationString: row.femaDeclarationString || `DR-${key}`,
      declarationType: row.declarationType || "",
      type: row.incidentType || "Other",
      title: titleCase(row.declarationTitle) || row.incidentType || "Disaster declaration",
      date: row.declarationDate,
      year: Number(row.fyDeclared) || yearOf(row.declarationDate),
      individualAssistance: Boolean(row.iaProgramDeclared),
      sourceUrl: `https://www.fema.gov/disaster/${key}`,
    })
  })

  const declarations = [...byNumber.values()]
    .filter((entry) => entry.date)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  const byType = countBy(declarations, (entry) => entry.type)
  const years = declarations.map((entry) => entry.year).filter(Boolean)
  const firstYear = years.length ? Math.min(...years) : null
  const lastYear = years.length ? Math.max(...years) : null

  return {
    county,
    total: declarations.length,
    declarations,
    byType,
    byYear: fillYearSeries(declarations, firstYear, lastYear),
    iaCount: declarations.filter((entry) => entry.individualAssistance).length,
    firstYear,
    lastYear,
    topType: byType[0]?.label || null,
    recent: declarations.slice(0, 6),
    sourceMode: declarations.length ? "live" : "no-match",
  }
}

// USAspending — federal dollars whose work lands in this county (place of
// performance), for the latest complete federal fiscal year. Keyless + CORS,
// universal US coverage; pairs with the disaster record as the second
// "your county, anywhere" panel.
const USASPENDING_URL = "https://api.usaspending.gov/api/v2"

export function latestCompleteFederalFY(now = new Date()) {
  // Federal FY N runs Oct 1 (N-1) – Sep 30 (N); October flips to the next FY.
  const year = now.getFullYear()
  return now.getMonth() >= 9 ? year : year - 1
}

export async function fetchCountySpending(county, signal) {
  const fy = latestCompleteFederalFY()
  const filters = {
    time_period: [{ start_date: `${fy - 1}-10-01`, end_date: `${fy}-09-30` }],
    place_of_performance_locations: [
      { country: "USA", state: county.stateCode, county: county.countyCode },
    ],
  }
  const [geography, recipients] = await Promise.all([
    postJSON(`${USASPENDING_URL}/search/spending_by_geography/`, {
      scope: "place_of_performance",
      geo_layer: "county",
      geo_layer_filters: [county.countyFips],
      filters,
    }, signal),
    // NOTE: the category is part of the PATH, not the body.
    postJSON(`${USASPENDING_URL}/search/spending_by_category/recipient/`, {
      filters,
      limit: 10,
    }, signal),
  ])
  return summarizeSpending(geography, recipients, { fy, county })
}

export function summarizeSpending(geography, recipients, { fy, county }) {
  const area = (geography.results || [])[0] || {}
  const total = Number(area.aggregated_amount) || 0
  // "MULTIPLE RECIPIENTS" is USAspending's aggregation bucket, not a real
  // awardee — drop it so the bar ranks actual named organizations.
  const topRecipients = (recipients.results || [])
    .filter((row) => row.name && !/^multiple recipients$/i.test(row.name))
    .map((row) => ({
      label: titleCase(row.name),
      amount: Number(row.amount) || 0,
      recipientId: row.recipient_id || null,
    }))
    .filter((row) => row.amount > 0)
    .slice(0, 8)

  return {
    county,
    fy,
    total,
    perCapita: Number.isFinite(Number(area.per_capita)) ? Number(area.per_capita) : null,
    topRecipients,
    topRecipient: topRecipients[0]?.label || null,
    sourceMode: total > 0 ? "live" : "no-match",
  }
}

async function postJSON(url, body, signal) {
  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Source returned ${response.status}`)
  return response.json()
}

// ---------------------------------------------------------------------------
// Local layer — city open-data 311 service requests (Socrata SODA).
// Covered cities only; everywhere else returns an "unavailable" notice.
// ---------------------------------------------------------------------------

export function getCivicPortal(location) {
  if (!location) return null
  return CIVIC_DATA_PORTALS[`${location.city.toLowerCase()}|${location.stateCode.toLowerCase()}`] || null
}

export function civicDatasetUrl(portal) {
  return `https://${portal.domain}/d/${portal.dataset}`
}

export async function fetchCivicSignals(location, signal) {
  const portal = getCivicPortal(location)
  if (!portal) {
    return { portal: null, scope: null, total: 0, byType: [], byDay: [], recent: [], sourceMode: "unavailable" }
  }

  const base = `https://${portal.domain}/resource/${portal.dataset}.json`
  const select = [portal.dateField, portal.typeField, portal.statusField, portal.addressField, portal.agencyField]
    .filter(Boolean)
    .join(",")
  const query = (where) => {
    const params = new URLSearchParams()
    params.set("$select", select)
    if (where) params.set("$where", where)
    params.set("$order", `${portal.dateField} DESC`)
    params.set("$limit", "400")
    return `${base}?${params}`
  }

  // Scope to the ZIP/radius first; if that yields nothing (sparse ZIP, schema
  // drift), fall back to a citywide pull and label the wider scope honestly.
  let scope = portal.scopeLabel(location)
  let rows = []
  try {
    rows = await fetchJSON(query(portal.locality(location)), signal)
  } catch (error) {
    if (error.name === "AbortError") throw error
    rows = []
  }
  if (!rows.length) {
    rows = await fetchJSON(query(null), signal)
    scope = "citywide"
  }
  return summarizeCivicSignals(rows, portal, scope)
}

export function summarizeCivicSignals(rows, portal, scope = "local") {
  const records = rows
    .map((row, index) => ({
      id: `csr-${portal.dataset}-${index}`,
      kind: "request",
      type: titleCase(row[portal.typeField]) || "Service request",
      status: row[portal.statusField] || "Status unavailable",
      date: row[portal.dateField],
      address: firstLineOf(row[portal.addressField]),
      agency: portal.agencyField ? row[portal.agencyField] : null,
    }))
    .filter((record) => record.date)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))

  const times = records.map((record) => Date.parse(record.date)).filter(Number.isFinite)
  const spanDays = times.length
    ? Math.max(1, Math.round((Math.max(...times) - Math.min(...times)) / 86_400_000))
    : 0
  const byType = countBy(records, (record) => record.type)

  return {
    portal,
    scope,
    total: records.length,
    spanDays,
    byType: byType.slice(0, 8),
    byDay: dayCountSeries(records),
    topType: byType[0]?.label || null,
    latest: records[0]?.date || null,
    recent: records.slice(0, 8),
    sourceMode: records.length ? "live" : "no-match",
  }
}

function countBy(items, accessor) {
  const counts = new Map()
  items.forEach((item) => {
    const key = accessor(item) || "Other"
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

function fillYearSeries(declarations, firstYear, lastYear) {
  if (!firstYear || !lastYear) return []
  const counts = new Map()
  declarations.forEach((entry) => {
    if (entry.year) counts.set(entry.year, (counts.get(entry.year) || 0) + 1)
  })
  const series = []
  for (let year = firstYear; year <= lastYear; year += 1) {
    series.push({ year, count: counts.get(year) || 0 })
  }
  return series
}

function dayCountSeries(records) {
  const counts = new Map()
  records.forEach((record) => {
    const day = String(record.date).slice(0, 10)
    if (day) counts.set(day, (counts.get(day) || 0) + 1)
  })
  return [...counts.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => (a.day < b.day ? -1 : 1))
}

// FEMA titles and some 311 categories arrive ALL CAPS; clean 311 categories
// already use mixed case, so only re-case strings that are wholly upper/lower.
function titleCase(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim()
  if (!text) return ""
  if (text !== text.toUpperCase() && text !== text.toLowerCase()) return text
  return text.toLowerCase().replace(/\b([a-z])/g, (match) => match.toUpperCase())
}

function yearOf(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.getFullYear()
}

function firstLineOf(value) {
  return String(value || "").split(/\r?\n/)[0].trim()
}

function normalizeActivitySnapshot(snapshot, coverage) {
  const matters = snapshot.matters.map((matter) => normalizeMatter({
    MatterId: matter.id,
    MatterGuid: matter.guid,
    MatterFile: matter.file,
    MatterName: matter.file,
    MatterTitle: matter.title,
    MatterTypeName: matter.type,
    MatterStatusName: matter.status,
    MatterBodyId: matter.bodyId,
    MatterBodyName: matter.bodyName,
    MatterIntroDate: matter.intro,
    MatterAgendaDate: matter.agenda,
    MatterLastModifiedUtc: matter.modified,
  }, coverage.client))
  const meetings = snapshot.events.map((event) => normalizeMeeting({
    EventId: event.id,
    EventBodyId: event.bodyId,
    EventBodyName: event.bodyName,
    EventDate: event.date,
    EventTime: event.time,
    EventAgendaStatusName: event.status,
    EventLocation: event.location,
    EventComment: event.comment,
    EventAgendaFile: event.agendaUrl,
    EventInSiteURL: event.sourceUrl,
  })).sort(compareMeetings)
  const sponsors = snapshot.sponsors.map((sponsor) => normalizeSponsor({
    MatterSponsorName: sponsor.name,
    MatterSponsorNameId: sponsor.nameId,
  }, `matter-${sponsor.matterId}`))
  return {
    coverage,
    matters,
    meetings,
    sponsors,
    sourceMode: "snapshot",
    capturedAt: snapshot.capturedAt,
  }
}

export function buildGovernmentHierarchy(location, laws, activity) {
  const bodyMap = collectBodies(activity)
  const bodyChildren = [...bodyMap.values()].map((body) => ({
    ...body,
    id: `tree-${body.id}`,
    kind: "body",
    children: [
      ...activity.matters
        .filter((matter) => matter.bodyId === body.rawId)
        .slice(0, 3)
        .map((matter) => ({
          ...matter,
          id: `tree-${matter.id}`,
          label: matter.file || truncate(matter.title, 28),
          kind: "matter",
        })),
      ...activity.meetings
        .filter((meeting) => meeting.bodyId === body.rawId)
        .slice(0, 2)
        .map((meeting) => ({
          ...meeting,
          id: `tree-${meeting.id}`,
          label: formatMeetingLabel(meeting),
          kind: "meeting",
        })),
    ],
  }))

  const functionGroups = groupBy(laws, (law) => law.function || "Unclassified")
  const lawChildren = [...functionGroups].map(([functionName, functionLaws]) => {
    const topicGroups = groupBy(functionLaws, (law) => law.topic || inferTopic(`${law.header} ${law.content}`))
    return {
      id: `tree-function-${functionName}`,
      label: functionName,
      kind: "function",
      children: [...topicGroups].map(([topic, topicLaws]) => ({
        id: `tree-topic-${functionName}-${topic}`,
        label: topic,
        kind: "topic",
        topic,
        children: topicLaws.slice(0, 2).map((law) => ({
          ...law,
          id: `tree-${law.id}`,
          label: cleanHeader(law.header) || truncate(law.content, 32),
          kind: "law",
        })),
      })),
    }
  })

  return {
    id: `jurisdiction-${location.zip}`,
    label: `${location.city}, ${location.stateCode}`,
    kind: "jurisdiction",
    children: [
      {
        id: "tree-authorities",
        label: "Governing authorities",
        kind: "branch",
        children: bodyChildren.length ? bodyChildren : [{
          id: "tree-authority-unavailable",
          label: "No open live authority feed",
          kind: "branch",
        }],
      },
      {
        id: "tree-law",
        label: "Codified law · LOCUS",
        kind: "branch",
        children: lawChildren.length ? lawChildren : [{
          id: "tree-law-unavailable",
          label: "LOCUS coverage unavailable",
          kind: "branch",
        }],
      },
    ],
  }
}

export function buildCivicNetwork(location, laws, activity) {
  const nodes = new Map()
  const edges = []
  const addNode = (node) => {
    if (!nodes.has(node.id)) nodes.set(node.id, node)
    return node.id
  }
  const addEdge = (source, target, relation) => {
    edges.push({ id: `${source}:${target}:${relation}`, source, target, relation })
  }

  const jurisdictionId = addNode({
    id: `jurisdiction-${location.zip}`,
    label: `${location.city}, ${location.stateCode}`,
    kind: "jurisdiction",
    detail: `ZIP ${location.zip} place match`,
  })

  const bodyMap = collectBodies(activity)
  bodyMap.forEach((body) => {
    addNode(body)
    addEdge(jurisdictionId, body.id, "governs through")
  })

  activity.matters.forEach((matter) => {
    const topic = matter.topic || inferTopic(matter.title)
    const topicId = `topic-${slugify(topic)}`
    addNode({ id: topicId, label: topic, kind: "topic", topic })
    addNode(matter)
    if (matter.bodyId != null) addEdge(`body-${matter.bodyId}`, matter.id, "introduced")
    addEdge(matter.id, topicId, "concerns")
  })

  activity.meetings.forEach((meeting) => {
    addNode(meeting)
    if (meeting.bodyId != null) addEdge(`body-${meeting.bodyId}`, meeting.id, "convenes")
  })

  activity.sponsors.forEach((sponsor) => {
    addNode(sponsor)
    addEdge(sponsor.id, sponsor.matterId, "sponsors")
  })

  laws.slice(0, 28).forEach((law) => {
    const topic = law.topic || inferTopic(`${law.header} ${law.content}`)
    const topicId = `topic-${slugify(topic)}`
    addNode({ id: topicId, label: topic, kind: "topic", topic })
    addNode({ ...law, topic, kind: "law" })
    addEdge(law.id, topicId, "classified as")
  })

  const nodeArray = [...nodes.values()]
  const degree = new Map()
  edges.forEach((edge) => {
    degree.set(edge.source, (degree.get(edge.source) || 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1)
  })

  return {
    nodes: nodeArray.map((node) => ({ ...node, degree: degree.get(node.id) || 1 })),
    edges,
  }
}

export function filterCivicNetwork(network, { scope, topic, query }) {
  if (!network.nodes.length) return network
  const nodeById = new Map(network.nodes.map((node) => [node.id, node]))
  let included = new Set(network.nodes.map((node) => node.id))

  const allowedKinds = {
    all: null,
    activity: new Set(["jurisdiction", "body", "person", "matter", "meeting", "topic"]),
    law: new Set(["jurisdiction", "body", "matter", "topic", "law"]),
    people: new Set(["jurisdiction", "body", "person", "matter"]),
  }[scope]
  if (allowedKinds) {
    included = new Set([...included].filter((id) => allowedKinds.has(nodeById.get(id)?.kind)))
  }

  if (topic !== "All") {
    const topicId = `topic-${slugify(topic)}`
    const seed = new Set([topicId])
    const firstHop = neighbors(network.edges, seed)
    const secondHop = neighbors(network.edges, new Set([...seed, ...firstHop]))
    const topicClosure = new Set([...seed, ...firstHop, ...secondHop])
    included = new Set([...included].filter((id) => topicClosure.has(id)))
  }

  const normalizedQuery = query.trim().toLowerCase()
  if (normalizedQuery) {
    const matches = new Set(
      network.nodes
        .filter((node) => `${node.label} ${node.title || ""} ${node.detail || ""}`.toLowerCase().includes(normalizedQuery))
        .map((node) => node.id),
    )
    const closure = new Set([...matches, ...neighbors(network.edges, matches)])
    included = new Set([...included].filter((id) => closure.has(id)))
  }

  return {
    nodes: network.nodes.filter((node) => included.has(node.id)),
    edges: network.edges.filter((edge) => included.has(edge.source) && included.has(edge.target)),
  }
}

export function collectTopics(laws, matters) {
  return [...new Set([
    ...laws.map((law) => law.topic || inferTopic(`${law.header} ${law.content}`)),
    ...matters.map((matter) => matter.topic || inferTopic(matter.title)),
  ])].sort()
}

// Multi-level variant of the library's `unwrapDatum`: this page's network
// observations can arrive as `{node: {data: raw}}`, so unwrap `.data`/`.datum`
// (via the library helper) and the `.node` container, bounded.
export function unwrapChartDatum(value) {
  let current = value
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") return current
    const unwrapped = unwrapDatum(current)
    const next =
      unwrapped !== current
        ? unwrapped
        : current.node && current.node !== current
          ? current.node
          : current
    if (next === current) break
    current = next
  }
  return current
}

function normalizeLocusLaw(entry) {
  const row = entry.row || {}
  return {
    id: `law-${entry.row_idx}`,
    rowIndex: entry.row_idx,
    label: cleanHeader(row.header) || truncate(row.content, 38),
    header: row.header || "",
    content: row.content || "",
    substantive: Boolean(row.is_substantive),
    function: row.function || "Unclassified",
    topic: row.topic || null,
    jurisdictionType: row.source_jurisdiction_type,
    state: row.state,
    city: row.city,
    county: row.county,
    enforcementDiscretion: finiteOrNull(row.enforcement_discretion),
    opacityScore: finiteOrNull(row.opacity),
    paternalism: finiteOrNull(row.paternalism),
    problemSalience: finiteOrNull(row.problem_salience),
    kind: "law",
    sourceUrl: `https://huggingface.co/datasets/LocalLaws/LOCUS-v1?row=${entry.row_idx}`,
  }
}

function normalizeMatter(matter, client) {
  const title = matter.MatterTitle || matter.MatterName || "Untitled matter"
  return {
    id: `matter-${matter.MatterId}`,
    rawId: matter.MatterId,
    label: matter.MatterFile || truncate(title, 34),
    file: matter.MatterFile,
    title,
    kind: "matter",
    bodyId: matter.MatterBodyId,
    bodyName: matter.MatterBodyName || "Unassigned body",
    type: matter.MatterTypeName,
    status: matter.MatterStatusName,
    introduced: matter.MatterIntroDate,
    agendaDate: matter.MatterAgendaDate,
    modified: matter.MatterLastModifiedUtc,
    topic: inferTopic(title),
    sourceUrl: `https://${client}.legistar.com/LegislationDetail.aspx?ID=${matter.MatterId}&GUID=${matter.MatterGuid}&Options=&Search=`,
  }
}

function normalizeMeeting(event) {
  return {
    id: `meeting-${event.EventId}`,
    rawId: event.EventId,
    label: `${event.EventBodyName || "Meeting"} · ${shortDate(event.EventDate)}`,
    title: event.EventBodyName || "Public meeting",
    kind: "meeting",
    bodyId: event.EventBodyId,
    bodyName: event.EventBodyName || "Public body",
    date: event.EventDate,
    time: event.EventTime,
    location: event.EventLocation,
    status: event.EventAgendaStatusName,
    comment: event.EventComment,
    agendaUrl: event.EventAgendaFile,
    sourceUrl: event.EventInSiteURL || event.EventAgendaFile,
  }
}

function normalizeSponsor(sponsor, matterId) {
  return {
    id: `person-${sponsor.MatterSponsorNameId || slugify(sponsor.MatterSponsorName)}`,
    label: sponsor.MatterSponsorName || "Unnamed sponsor",
    kind: "person",
    personId: sponsor.MatterSponsorNameId,
    matterId,
    sequence: sponsor.MatterSponsorSequence,
    detail: "Matter sponsor",
  }
}

function collectBodies(activity) {
  const bodies = new Map()
  const add = (rawId, name) => {
    if (rawId == null) return
    const id = `body-${rawId}`
    if (!bodies.has(id)) {
      bodies.set(id, {
        id,
        rawId,
        label: name || "Public body",
        title: name || "Public body",
        kind: "body",
        detail: "Governing body or committee",
      })
    }
  }
  activity.matters.forEach((matter) => add(matter.bodyId, matter.bodyName))
  activity.meetings.forEach((meeting) => add(meeting.bodyId, meeting.bodyName))
  return bodies
}

export function inferTopic(text) {
  const value = String(text || "").toLowerCase()
  const rules = [
    ["Housing", /housing|tenant|rent|homeless|residential|homeownership/],
    ["Transportation", /transport|transit|street|road|traffic|parking|vehicle|sidewalk|bicycle|rail/],
    ["Land use", /land use|zoning|development|parcel|property|planning|lease|real estate/],
    ["Budget", /budget|appropriat|finance|tax|revenue|bond|funding|fiscal|contract/],
    ["Safety", /police|fire|emergency|crime|safety|weapon|enforcement/],
    ["Environment", /climate|environment|water|waste|energy|tree|pollution|shoreline/],
    ["Labor", /labor|worker|employee|wage|employment|union/],
    ["Health", /health|medical|hospital|drug|food|sanitation/],
    ["Education", /school|education|library|student|childcare|early learning/],
    ["Business", /business|license|commercial|vendor|procurement/],
    ["Buildings", /building|construction|fire code|electrical|plumbing/],
    ["Nuisance", /nuisance|noise|animal|weed|graffiti/],
    ["Zoning", /zone|setback|variance|conditional use/],
  ]
  return rules.find(([, pattern]) => pattern.test(value))?.[0] || "Other"
}

function balanceLocusRows(laws, limit) {
  const buckets = groupBy(laws, (law) => law.function || "Unclassified")
  const result = []
  let index = 0
  while (result.length < limit) {
    let added = false
    buckets.forEach((bucket) => {
      if (bucket[index] && result.length < limit) {
        result.push(bucket[index])
        added = true
      }
    })
    if (!added) break
    index += 1
  }
  return result
}

function neighbors(edges, seeds) {
  const result = new Set()
  edges.forEach((edge) => {
    if (seeds.has(edge.source)) result.add(edge.target)
    if (seeds.has(edge.target)) result.add(edge.source)
  })
  return result
}

function compareMeetings(a, b) {
  const now = Date.now()
  const aTime = Date.parse(a.date)
  const bTime = Date.parse(b.date)
  const aFuture = aTime >= now
  const bFuture = bTime >= now
  if (aFuture !== bFuture) return aFuture ? -1 : 1
  return aFuture ? aTime - bTime : bTime - aTime
}

async function fetchJSON(url, signal) {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } })
  if (!response.ok) throw new Error(`Source returned ${response.status}`)
  return response.json()
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(new DOMException("Aborted", "AbortError"))
    }, { once: true })
  })
}

function groupBy(values, accessor) {
  const groups = new Map()
  values.forEach((value) => {
    const key = accessor(value)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(value)
  })
  return groups
}

function escapeSql(value) {
  return String(value).replace(/'/g, "''")
}

export function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
}

// LOCUS keys cities by an underscore-separated slug ("santa_cruz"), so its
// query predicate must preserve word boundaries rather than collapse them
// the way the internal topic/node slugify does.
export function locusCitySlug(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export function cleanHeader(value) {
  return String(value || "")
    .replace(/^#+\s*/, "")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function truncate(value, length = 80) {
  const text = String(value || "").replace(/\s+/g, " ").trim()
  return text.length > length ? `${text.slice(0, length - 1).trim()}…` : text
}

function formatMeetingLabel(meeting) {
  return `${shortDate(meeting.date)} · ${meeting.time || "time TBD"}`
}

function shortDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "date TBD"
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

function finiteOrNull(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
