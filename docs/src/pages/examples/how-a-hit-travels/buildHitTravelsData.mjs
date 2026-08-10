#!/usr/bin/env node
/* global Buffer, URL, console, process */

import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { basename, resolve } from "node:path"
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force"
import { tsvParse } from "d3-dsv"

const SOURCE_URLS = {
  countries: "https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv",
  global: "https://www.netflix.com/tudum/top10/data/all-weeks-global.tsv",
}

const REFERENCE_COUNTRIES = [
  ["AR", -64, -34],
  ["AU", 134, -25],
  ["BR", -52, -10],
  ["CA", -106, 56],
  ["CO", -74, 4],
  ["DE", 10.4, 51],
  ["EG", 30, 27],
  ["ES", -3.7, 40],
  ["FR", 2, 46],
  ["GB", -2, 54],
  ["ID", 118, -2],
  ["IN", 79, 22],
  ["JP", 138, 37],
  ["KE", 37, 0],
  ["KR", 128, 36],
  ["MX", -102, 23],
  ["NG", 8, 9],
  ["PH", 122, 13],
  ["PK", 69, 30],
  ["SA", 45, 24],
  ["TH", 101, 15],
  ["TR", 35, 39],
  ["US", -100, 39],
  ["ZA", 24, -29],
]

const REGIONS = {
  Americas: [
    "AR",
    "BS",
    "BO",
    "BR",
    "CA",
    "CL",
    "CO",
    "CR",
    "DO",
    "EC",
    "SV",
    "GP",
    "GT",
    "HN",
    "JM",
    "MQ",
    "MX",
    "NI",
    "PA",
    "PY",
    "PE",
    "TT",
    "US",
    "UY",
    "VE",
  ],
  Europe: [
    "AT",
    "BE",
    "BG",
    "HR",
    "CY",
    "CZ",
    "DK",
    "EE",
    "FI",
    "FR",
    "DE",
    "GR",
    "HU",
    "IS",
    "IE",
    "IT",
    "LV",
    "LT",
    "LU",
    "MT",
    "NL",
    "NO",
    "PL",
    "PT",
    "RO",
    "RU",
    "RS",
    "SK",
    "SI",
    "ES",
    "SE",
    "CH",
    "TR",
    "UA",
    "GB",
  ],
  Asia: [
    "BH",
    "BD",
    "HK",
    "IN",
    "ID",
    "IL",
    "JP",
    "JO",
    "KW",
    "LB",
    "MY",
    "MV",
    "OM",
    "PK",
    "PH",
    "QA",
    "SA",
    "SG",
    "KR",
    "LK",
    "TW",
    "TH",
    "AE",
    "VN",
  ],
  Africa: ["EG", "KE", "MU", "MA", "NG", "RE", "ZA"],
  Oceania: ["AU", "NC", "NZ"],
}

const REGION_BY_ISO = Object.fromEntries(
  Object.entries(REGIONS).flatMap(([region, codes]) => codes.map((code) => [code, region])),
)

const TITLE_SPECS = [
  {
    id: "tinder-swindler",
    family: "film",
    languageGroup: "english",
    primaryLanguage: "English",
    showTitle: "The Tinder Swindler",
    seasonTitle: "N/A",
    archetype: "The simultaneous arrival",
    note: "A wide first-week footprint with little room left to expand.",
  },
  {
    id: "crash-course-romance",
    family: "tv",
    languageGroup: "non-english",
    primaryLanguage: "Korean",
    showTitle: "Crash Course in Romance",
    seasonTitle: "Crash Course in Romance: Limited Series",
    archetype: "The gradual bridge",
    note: "A limited series that accumulated country appearances across its run.",
  },
  {
    id: "cafe-con-aroma",
    family: "tv",
    languageGroup: "non-english",
    primaryLanguage: "Spanish",
    showTitle: "Café con aroma de mujer",
    seasonTitle: "Café con aroma de mujer: Season 1",
    archetype: "The durable regional favorite",
    note: "A smaller country footprint with unusually long local persistence.",
  },
  {
    id: "wednesday-season-1",
    family: "tv",
    languageGroup: "english",
    primaryLanguage: "English",
    showTitle: "Wednesday",
    seasonTitle: "Wednesday: Season 1",
    archetype: "The returning wave",
    note: "A global first run followed by several later ranking returns.",
  },
  {
    id: "rookie-season-1",
    family: "tv",
    languageGroup: "english",
    primaryLanguage: "English",
    showTitle: "The Rookie",
    seasonTitle: "The Rookie: Season 1",
    archetype: "Country charts, not global",
    note: "A broad country-level footprint without a matching global Top 10 row.",
  },
  {
    id: "solo-leveling-season-1",
    family: "tv",
    languageGroup: "non-english",
    primaryLanguage: "Japanese",
    showTitle: "Solo Leveling",
    seasonTitle: "Solo Leveling: Season 1",
    archetype: "Concentrated and persistent",
    note: "A compact country footprint that stayed active for many weeks.",
  },
  {
    id: "oppenheimer",
    family: "film",
    languageGroup: "english",
    primaryLanguage: "English",
    showTitle: "Oppenheimer",
    seasonTitle: "N/A",
    archetype: "Separate licensed windows",
    note: "Country appearances recur without a corresponding global-list row.",
  },
  {
    id: "business-proposal",
    family: "tv",
    languageGroup: "non-english",
    primaryLanguage: "Korean",
    showTitle: "Business Proposal",
    seasonTitle: "Business Proposal: Limited Series",
    archetype: "Bridge and return",
    note: "A gradual initial footprint with later active runs.",
  },
  {
    id: "the-grinch",
    family: "film",
    languageGroup: "english",
    primaryLanguage: "English",
    showTitle: "Dr. Seuss' The Grinch",
    seasonTitle: "N/A",
    archetype: "The seasonal return",
    note: "A ranking footprint that reappears around repeated calendar moments.",
  },
  {
    id: "love-next-door",
    family: "tv",
    languageGroup: "non-english",
    primaryLanguage: "Korean",
    showTitle: "Love Next Door",
    seasonTitle: "Love Next Door: Limited Series",
    archetype: "The accumulating run",
    note: "A thirteen-week run whose observed reach grew after its opening week.",
  },
]

const args = parseArgs(process.argv.slice(2))
if (!args.countries || !args.global) {
  throw new Error(
    "Usage: node buildHitTravelsData.mjs --countries /path/all-weeks-countries.tsv --global /path/all-weeks-global.tsv [--retrieved-at YYYY-MM-DD] [--output file]",
  )
}

const countryPath = resolve(args.countries)
const globalPath = resolve(args.global)
const outputPath = resolve(
  args.output ?? new URL("./hitTravelsData.generated.js", import.meta.url).pathname,
)
const retrievedAt = args["retrieved-at"] ?? new Date().toISOString().slice(0, 10)
const countrySource = readFileSync(countryPath, "utf8")
const globalSource = readFileSync(globalPath, "utf8")
const countryRows = tsvParse(countrySource)
const globalRows = tsvParse(globalSource)

validateRows(countryRows, globalRows)

const countryNames = new Map()
const allWeeks = new Set()
const titleRows = new Map()
const weekCoverage = new Map()
const observationCountries = new Map()

for (const row of countryRows) {
  const family = familyFor(row.category)
  const titleKey = titleKeyFor(family, row.show_title, row.season_title)
  const observationKey = `${titleKey}\u0000${row.week}`
  const coverageKey = `${family}\u0000${row.week}`
  countryNames.set(row.country_iso2, row.country_name)
  allWeeks.add(row.week)
  appendMapArray(titleRows, titleKey, row)
  addMapSet(weekCoverage, coverageKey, row.country_iso2)
  addMapSet(observationCountries, observationKey, row.country_iso2)
}

const sortedWeeks = [...allWeeks].sort()
const globalRowsByTitle = new Map()
for (const row of globalRows) {
  appendMapArray(
    globalRowsByTitle,
    titleKeyFor(familyFor(row.category), row.show_title, row.season_title),
    row,
  )
}

const profiles = [...titleRows.entries()].map(([titleKey, rows]) =>
  buildTitleProfile({
    titleKey,
    rows,
    globalRows: globalRowsByTitle.get(titleKey) ?? [],
    weekCoverage,
    countryNames,
  }),
)
const profilesByKey = new Map(profiles.map((profile) => [profile.titleKey, profile]))

const titles = TITLE_SPECS.map((spec) => {
  const key = titleKeyFor(spec.family, spec.showTitle, spec.seasonTitle)
  const profile = profilesByKey.get(key)
  if (!profile) throw new Error(`Selected title is missing from the source snapshot: ${key}`)
  return { ...profile, ...spec, titleKey: key }
})

const countries = REFERENCE_COUNTRIES.map(([id, longitude, latitude]) => {
  const name = countryNames.get(id)
  if (!name) throw new Error(`Reference country is missing from the source snapshot: ${id}`)
  return {
    id,
    name,
    longitude,
    latitude,
    region: REGION_BY_ISO[id] ?? "Other",
  }
})

const similarityLayouts = Object.fromEntries(
  ["presence", "distinctive-rank"].map((mode) => [
    mode,
    buildSimilarityLayout({
      mode,
      countries,
      countryRows,
      observationCountries,
      weekCoverage,
    }),
  ]),
)

const omittedTitles = profiles
  .filter((profile) => !profile.globalListAppeared && profile.countryWeeks >= 40)
  .sort(
    (left, right) =>
      right.observedCountryCount * 10 +
      right.countryWeeks -
      (left.observedCountryCount * 10 + left.countryWeeks),
  )
  .slice(0, 18)
  .map(
    ({ titleKey, label, family, observedCountryCount, countryWeeks, activeWeeks, bestRank }) => ({
      titleKey,
      label,
      family,
      observedCountryCount,
      countryWeeks,
      activeWeeks,
      bestRank,
    }),
  )

const manifest = {
  snapshotId: `netflix-top10-${sortedWeeks.at(-1)}`,
  retrievedAt,
  firstWeek: sortedWeeks[0],
  lastWeek: sortedWeeks.at(-1),
  weekCount: sortedWeeks.length,
  countryCount: countryNames.size,
  titleCount: titleRows.size,
  countryRowCount: countryRows.length,
  globalRowCount: globalRows.length,
  referenceCountryCount: countries.length,
  sourceFiles: [
    sourceRecord(countryPath, countrySource, SOURCE_URLS.countries),
    sourceRecord(globalPath, globalSource, SOURCE_URLS.global),
  ],
  methodVersion: "similarity-constellation-v1",
}

const hero = titles.find((title) => title.id === "crash-course-romance")
const durable = titles.find((title) => title.id === "cafe-con-aroma")
const omitted = titles.find((title) => title.id === "rookie-season-1")

const claimEvidence = [
  {
    id: "claim-crash-course-arrival",
    status: "supported",
    statement: `${hero.label} first appeared in ${hero.firstWeekCountryCount} national Top 10 lists during the week ending ${hero.firstWeek}.`,
    numerator: hero.firstWeekCountryCount,
    denominator: hero.firstWeekCoverage,
    metric: "Countries with a published Top 10 row for the title in its first observed week.",
    caveat: "First observed ranking is not release origin, audience size, or causal transmission.",
  },
  {
    id: "claim-durable-regional",
    status: "supported",
    statement: `${durable.label} appeared in ${durable.observedCountryCount} countries; the median reached country ranked it for ${durable.medianPersistence} weeks.`,
    numerator: durable.observedCountryCount,
    denominator: manifest.countryCount,
    metric: "Observed country reach and median ranked weeks per reached country.",
    caveat: "Country absence is censored by catalog availability and the Top 10 cutoff.",
  },
  {
    id: "claim-global-list-selection",
    status: "supported",
    statement: `${omitted.label} accumulated ${omitted.countryWeeks} country-weeks across ${omitted.observedCountryCount} countries without a matching global Top 10 row in this snapshot.`,
    numerator: omitted.countryWeeks,
    denominator: omitted.observedCountryCount,
    metric: "Country-week Top 10 rows compared with matching global-list title identity.",
    caveat:
      "Country rank and global views are different measures; neither supplies country audience size.",
  },
].map((claim) => ({
  ...claim,
  snapshotId: manifest.snapshotId,
  methodVersion: manifest.methodVersion,
}))

const output = {
  manifest,
  countries,
  similarityLayouts,
  titles,
  omittedTitles,
  claimEvidence,
}

const banner = `// GENERATED by buildHitTravelsData.mjs from Netflix's public weekly Top 10 downloads.\n// Snapshot: ${manifest.snapshotId}; retrieved ${retrievedAt}. Do not edit by hand.\n// prettier-ignore\n`
writeFileSync(
  outputPath,
  `${banner}export const HIT_TRAVELS_DATA = ${JSON.stringify(output, null, 2)}\n`,
)

console.log(
  JSON.stringify(
    {
      output: outputPath,
      manifest,
      selectedTitles: titles.map(
        ({
          id,
          label,
          observedCountryCount,
          firstWeekCountryCount,
          medianPersistence,
          activeRuns,
        }) => ({
          id,
          label,
          observedCountryCount,
          firstWeekCountryCount,
          medianPersistence,
          activeRuns: activeRuns.length,
        }),
      ),
      similarityEdges: Object.fromEntries(
        Object.entries(similarityLayouts).map(([mode, layout]) => [mode, layout.edges.length]),
      ),
    },
    null,
    2,
  ),
)

function parseArgs(values) {
  const result = {}
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (!value.startsWith("--")) continue
    result[value.slice(2)] = values[index + 1]
    index += 1
  }
  return result
}

function validateRows(countries, global) {
  if (!countries.length || !global.length) throw new Error("Both source files must contain rows.")
  const countryFields = [
    "country_name",
    "country_iso2",
    "week",
    "category",
    "weekly_rank",
    "show_title",
    "season_title",
  ]
  const globalFields = [
    "week",
    "category",
    "weekly_rank",
    "show_title",
    "season_title",
    "weekly_views",
  ]
  for (const field of countryFields) {
    if (!(field in countries[0])) throw new Error(`Country source is missing ${field}.`)
  }
  for (const field of globalFields) {
    if (!(field in global[0])) throw new Error(`Global source is missing ${field}.`)
  }
  const badRank = countries.find(
    (row) =>
      !Number.isInteger(Number(row.weekly_rank)) ||
      Number(row.weekly_rank) < 1 ||
      Number(row.weekly_rank) > 10,
  )
  if (badRank)
    throw new Error(`Country source contains an invalid weekly rank: ${JSON.stringify(badRank)}`)
}

function familyFor(category) {
  return category.startsWith("Films") ? "film" : "tv"
}

function titleKeyFor(family, showTitle, seasonTitle) {
  return `${family}\u0000${showTitle}\u0000${seasonTitle}`
}

function appendMapArray(map, key, value) {
  const values = map.get(key)
  if (values) values.push(value)
  else map.set(key, [value])
}

function addMapSet(map, key, value) {
  const values = map.get(key)
  if (values) values.add(value)
  else map.set(key, new Set([value]))
}

function isoWeekDistance(first, current) {
  return Math.round((Date.parse(current) - Date.parse(first)) / 604800000)
}

function weekAtDistance(first, distance) {
  return new Date(Date.parse(first) + distance * 604800000).toISOString().slice(0, 10)
}

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function displayLabel(showTitle, seasonTitle) {
  if (!seasonTitle || seasonTitle === "N/A") return showTitle
  const suffix = seasonTitle.startsWith(`${showTitle}: `)
    ? seasonTitle.slice(showTitle.length + 2)
    : seasonTitle
  return `${showTitle} — ${suffix}`
}

function buildTitleProfile({ titleKey, rows, globalRows, weekCoverage, countryNames }) {
  const [family, showTitle, seasonTitle] = titleKey.split("\u0000")
  const weeks = [...new Set(rows.map((row) => row.week))].sort()
  const firstWeek = weeks[0]
  const lastWeek = weeks.at(-1)
  const spanWeeks = isoWeekDistance(firstWeek, lastWeek) + 1
  const byWeek = new Map()
  const byCountry = new Map()

  for (const row of rows) {
    appendMapArray(byWeek, row.week, row)
    appendMapArray(byCountry, row.country_iso2, row)
  }

  const weeklyReach = Array.from({ length: spanWeeks }, (_, index) => {
    const week = weekAtDistance(firstWeek, index)
    const weekRows = byWeek.get(week) ?? []
    const coverage = weekCoverage.get(`${family}\u0000${week}`)?.size ?? 0
    return {
      week,
      elapsedWeek: index,
      countryCount: new Set(weekRows.map((row) => row.country_iso2)).size,
      coverage,
      reachShare: coverage
        ? Number((new Set(weekRows.map((row) => row.country_iso2)).size / coverage).toFixed(4))
        : 0,
      medianRank: median(weekRows.map((row) => Number(row.weekly_rank))),
    }
  })

  const countryHistory = [...byCountry.entries()]
    .map(([countryId, countryRows]) => {
      const sorted = [...countryRows].sort((left, right) => left.week.localeCompare(right.week))
      return {
        countryId,
        country: countryNames.get(countryId),
        region: REGION_BY_ISO[countryId] ?? "Other",
        firstWeek: sorted[0].week,
        firstElapsedWeek: isoWeekDistance(firstWeek, sorted[0].week),
        lastWeek: sorted.at(-1).week,
        activeWeeks: sorted.length,
        bestRank: Math.min(...sorted.map((row) => Number(row.weekly_rank))),
        ranks: sorted.map((row) => [isoWeekDistance(firstWeek, row.week), Number(row.weekly_rank)]),
      }
    })
    .sort(
      (left, right) =>
        left.firstWeek.localeCompare(right.firstWeek) || left.bestRank - right.bestRank,
    )

  const firstWeekCountryCount = weeklyReach[0].countryCount
  const firstTwoWeekCountries = countryHistory.filter(
    (country) => country.firstElapsedWeek <= 1,
  ).length
  const activeRuns = buildRuns(weeklyReach)
  const persistenceValues = countryHistory.map((country) => country.activeWeeks)
  const persistenceBands = [
    { id: "one", label: "1 week", min: 1, max: 1 },
    { id: "two-three", label: "2–3", min: 2, max: 3 },
    { id: "four-eight", label: "4–8", min: 4, max: 8 },
    { id: "nine-plus", label: "9+", min: 9, max: Infinity },
  ].map((band) => ({
    id: band.id,
    label: band.label,
    count: persistenceValues.filter((value) => value >= band.min && value <= band.max).length,
  }))

  const arrivalByWeek = [...new Set(countryHistory.map((country) => country.firstElapsedWeek))]
    .sort((left, right) => left - right)
    .map((elapsedWeek) => ({
      elapsedWeek,
      week: weekAtDistance(firstWeek, elapsedWeek),
      countryCount: countryHistory.filter((country) => country.firstElapsedWeek === elapsedWeek)
        .length,
    }))

  const regionReach = Object.keys(REGIONS).map((region) => {
    const denominator = REGIONS[region].filter((code) => countryNames.has(code)).length
    const count = countryHistory.filter((country) => country.region === region).length
    return { region, countryCount: count, denominator }
  })

  const globalHistory = globalRows
    .map((row) => ({
      week: row.week,
      rank: Number(row.weekly_rank),
      views: row.weekly_views === "" ? null : Number(row.weekly_views),
      hoursViewed: Number(row.weekly_hours_viewed || 0),
    }))
    .sort((left, right) => left.week.localeCompare(right.week))

  return {
    titleKey,
    label: displayLabel(showTitle, seasonTitle),
    family,
    showTitle,
    seasonTitle,
    firstWeek,
    lastWeek,
    spanWeeks,
    activeWeeks: weeks.length,
    observedCountryCount: countryHistory.length,
    firstWeekCountryCount,
    firstWeekCoverage: weeklyReach[0].coverage,
    simultaneity: Number((firstTwoWeekCountries / countryHistory.length).toFixed(4)),
    medianPersistence: median(persistenceValues),
    countryWeeks: rows.length,
    bestRank: Math.min(...rows.map((row) => Number(row.weekly_rank))),
    peakWeeklyReach: Math.max(...weeklyReach.map((week) => week.countryCount)),
    globalListAppeared: globalHistory.length > 0,
    globalHistory,
    weeklyReach,
    arrivalByWeek,
    regionReach,
    persistenceBands,
    activeRuns,
    countryHistory,
    maxArrivalWeek: Math.max(...countryHistory.map((country) => country.firstElapsedWeek)),
  }
}

function buildRuns(weeklyReach) {
  const activeIndices = weeklyReach
    .filter((week) => week.countryCount > 0)
    .map((week) => week.elapsedWeek)
  if (!activeIndices.length) return []
  const runs = []
  let current = { start: activeIndices[0], end: activeIndices[0], activeWeeks: 1 }
  for (const index of activeIndices.slice(1)) {
    if (index - current.end >= 3) {
      runs.push(current)
      current = { start: index, end: index, activeWeeks: 1 }
    } else {
      current.end = index
      current.activeWeeks += 1
    }
  }
  runs.push(current)
  return runs.map((run) => ({
    ...run,
    startWeek: weeklyReach[run.start].week,
    endWeek: weeklyReach[run.end].week,
  }))
}

function buildSimilarityLayout({
  mode,
  countries,
  countryRows,
  observationCountries,
  weekCoverage,
}) {
  const ids = new Set(countries.map((country) => country.id))
  const vectors = new Map(countries.map((country) => [country.id, new Map()]))
  const titleByObservation = new Map()

  for (const row of countryRows) {
    if (!ids.has(row.country_iso2)) continue
    const family = familyFor(row.category)
    const titleKey = titleKeyFor(family, row.show_title, row.season_title)
    const observationKey = `${titleKey}\u0000${row.week}`
    const ubiquity = observationCountries.get(observationKey)?.size ?? 1
    const coverage = weekCoverage.get(`${family}\u0000${row.week}`)?.size ?? ubiquity
    const inverseUbiquity = Math.log((coverage + 1) / (ubiquity + 1))
    const weight =
      mode === "presence"
        ? 1
        : Number(row.weekly_rank) <= 10
          ? (11 - Number(row.weekly_rank)) * inverseUbiquity
          : 0
    vectors.get(row.country_iso2).set(observationKey, weight)
    titleByObservation.set(observationKey, displayLabel(row.show_title, row.season_title))
  }

  const norms = new Map(
    [...vectors.entries()].map(([id, vector]) => [
      id,
      Math.sqrt([...vector.values()].reduce((sum, value) => sum + value * value, 0)),
    ]),
  )

  const pairs = []
  for (let leftIndex = 0; leftIndex < countries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < countries.length; rightIndex += 1) {
      const left = countries[leftIndex]
      const right = countries[rightIndex]
      const leftVector = vectors.get(left.id)
      const rightVector = vectors.get(right.id)
      const [small, large] =
        leftVector.size < rightVector.size ? [leftVector, rightVector] : [rightVector, leftVector]
      let dot = 0
      const contributions = new Map()
      for (const [observationKey, value] of small) {
        const other = large.get(observationKey)
        if (other == null) continue
        const contribution = value * other
        dot += contribution
        const title = titleByObservation.get(observationKey)
        contributions.set(title, (contributions.get(title) ?? 0) + contribution)
      }
      const denominator = norms.get(left.id) * norms.get(right.id)
      pairs.push({
        id: `${left.id}-${right.id}`,
        source: left.id,
        target: right.id,
        similarity: denominator ? dot / denominator : 0,
        sharedObservations: [...small.keys()].filter((key) => large.has(key)).length,
        contributors: [...contributions.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([title, score]) => ({ title, score: Number(score.toFixed(3)) })),
      })
    }
  }

  const nearest = new Map()
  for (const country of countries) {
    nearest.set(
      country.id,
      pairs
        .filter((pair) => pair.source === country.id || pair.target === country.id)
        .sort((left, right) => right.similarity - left.similarity)
        .slice(0, 4)
        .map((pair) => (pair.source === country.id ? pair.target : pair.source)),
    )
  }

  const edges = pairs
    .filter(
      (pair) =>
        pair.similarity >= 0.1 &&
        nearest.get(pair.source).includes(pair.target) &&
        nearest.get(pair.target).includes(pair.source),
    )
    .map((pair) => ({
      ...pair,
      similarity: Number(pair.similarity.toFixed(4)),
    }))

  const layoutNodes = countries.map((country) => ({
    id: country.id,
    x: ((country.longitude + 180) / 360) * 900,
    y: ((90 - country.latitude) / 180) * 520,
  }))
  const layoutLinks = pairs.filter((pair) => pair.similarity > 0).map((pair) => ({ ...pair }))

  const simulation = forceSimulation(layoutNodes)
    .randomSource(seededRandom(mode === "presence" ? 418 : 731))
    .force(
      "link",
      forceLink(layoutLinks)
        .id((node) => node.id)
        .distance((edge) => 34 + (1 - edge.similarity) * 180)
        .strength((edge) => 0.015 + edge.similarity * edge.similarity * 0.22),
    )
    .force("charge", forceManyBody().strength(-48))
    .force("collision", forceCollide(14))
    .force("center", forceCenter(450, 260))
    .stop()
  for (let tick = 0; tick < 520; tick += 1) simulation.tick()

  const minX = Math.min(...layoutNodes.map((node) => node.x))
  const maxX = Math.max(...layoutNodes.map((node) => node.x))
  const minY = Math.min(...layoutNodes.map((node) => node.y))
  const maxY = Math.max(...layoutNodes.map((node) => node.y))
  const positions = Object.fromEntries(
    layoutNodes.map((node) => [
      node.id,
      {
        x: Number(((node.x - minX) / Math.max(1, maxX - minX)).toFixed(4)),
        y: Number(((node.y - minY) / Math.max(1, maxY - minY)).toFixed(4)),
      },
    ]),
  )

  return {
    mode,
    minimumSimilarity: 0.1,
    positions,
    edges,
    note:
      mode === "presence"
        ? "Cosine similarity over shared title-week presence; every Top 10 appearance has equal weight."
        : "Cosine similarity over rank points multiplied by inverse title-week ubiquity.",
  }
}

function sourceRecord(path, source, url) {
  return {
    file: basename(path),
    url,
    bytes: Buffer.byteLength(source),
    sha256: createHash("sha256").update(source).digest("hex"),
  }
}

function seededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}
