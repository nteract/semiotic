import React, { useMemo } from "react"
import { FlowMap } from "semiotic/geo"
import { ProcessSankey } from "semiotic/network"
import { BarChart } from "semiotic/ordinal"
import { unwrapDatum } from "semiotic/recipes"
import { XYCustomChart } from "semiotic/xy"
import {
  CULTURAL_WORKS,
  NYC_MIGRATION_MAX_FLOW,
  NYC_MIGRATION_NODES,
  NYC_MIGRATION_ROUTE_RECORDS,
  NYC_MIGRATION_SNAPSHOTS,
  REPRESENTATION_POINTS,
  cohortEvidenceAtAge,
  migrationTotals,
} from "./hellholeData"

const CITY = "#d5683f"
const SUBURB = "#3c846d"
const CONDITION = "#315f78"
const RESIDENT = "#5b6592"
const MUTED = "#938e83"
const FIRST_VISIBLE_YEAR = 1945
const LAST_VISIBLE_YEAR = 2026
const FIRST_VISIBLE_AGE = 8
const LAST_VISIBLE_AGE = 35

const LANE_META = Object.freeze({
  representation: {
    label: "REPRESENTATION",
    subtitle: "Illustrative seed works · stations only",
    color: CITY,
  },
  conditions: {
    label: "CONDITIONS",
    subtitle: "Separate sourced measures · no composite",
    color: CONDITION,
  },
  residents: {
    label: "RESIDENTS",
    subtitle: "Separate survey instruments · no trend line",
    color: RESIDENT,
  },
})

const LANE_ORDER = ["representation", "conditions", "residents"]

function yearOf(datum) {
  const directYear = datum.year ?? datum.releaseYear ?? datum.calendarYear
  if (directYear != null) return Number(directYear)
  if (Number.isFinite(Number(datum.startYear)) && Number.isFinite(Number(datum.endYear))) {
    return (Number(datum.startYear) + Number(datum.endYear)) / 2
  }
  return Number.NaN
}

function isMultiYearEpisode(datum) {
  return (
    Number.isFinite(Number(datum.startYear)) &&
    Number.isFinite(Number(datum.endYear)) &&
    Number(datum.startYear) !== Number(datum.endYear)
  )
}

function formatPlottingYear(year) {
  return Number.isInteger(year) ? String(year) : year.toFixed(1)
}

function temporalEvidenceLabel(datum) {
  if (!isMultiYearEpisode(datum)) return String(datum.year)
  return `published range ${datum.startYear}–${datum.endYear}; plotted at ${formatPlottingYear(datum.year)}, the range midpoint, for positioning only—not an observed year`
}

function placeOf(datum) {
  const place = String(datum.place ?? datum.placeFamily ?? datum.currentPlace ?? "").toLowerCase()
  if (place.includes("suburb") || place.includes("spread")) return "suburb"
  if (place.includes("city") || place.includes("core") || place.includes("compact")) return "core"
  return "other"
}

function displayValue(datum) {
  if (datum.value != null && Number.isFinite(Number(datum.value))) return Number(datum.value)
  if (datum.estimate != null && Number.isFinite(Number(datum.estimate))) {
    return Number(datum.estimate)
  }
  return null
}

function flattenEvidencePoints(points, fallbackLane) {
  return (points ?? []).flatMap((episode) => {
    if (Array.isArray(episode.points)) {
      return episode.points.map((point) => ({ ...episode, ...point, lane: fallbackLane }))
    }
    if (Array.isArray(episode.values)) {
      return episode.values.map((point) => ({ ...episode, ...point, lane: fallbackLane }))
    }
    return [{ ...episode, lane: episode.lane ?? fallbackLane }]
  })
}

function normalizeDreadTransferData(representationPoints, conditionEpisodes, residentEpisodes) {
  const worksById = new Map(CULTURAL_WORKS.map((work) => [work.id, work]))
  return [
    ...flattenEvidencePoints(representationPoints, "representation"),
    ...flattenEvidencePoints(conditionEpisodes, "conditions"),
    ...flattenEvidencePoints(residentEpisodes, "residents"),
  ]
    .map((datum, index) => {
      const work = worksById.get(datum.workId)
      return {
        ...datum,
        title: datum.title ?? work?.title,
        role: datum.role ?? work?.role,
        id: datum.id ?? `${datum.lane}-${yearOf(datum)}-${index}`,
        year: yearOf(datum),
        place: placeOf(datum),
        displayValue: displayValue(datum),
      }
    })
    .filter((datum) => Number.isFinite(datum.year))
}

export function DreadTransferChart({
  width,
  height,
  lens,
  reducedMotion,
  representationPoints,
  conditionEpisodes,
  residentEpisodes,
}) {
  const data = useMemo(
    () => normalizeDreadTransferData(representationPoints, conditionEpisodes, residentEpisodes),
    [conditionEpisodes, representationPoints, residentEpisodes],
  )
  const layout = useMemo(() => makeDreadTransferLayout({ lens }), [lens])

  return (
    <XYCustomChart
      chartId="hellhole-dread-transfer"
      data={data}
      layout={layout}
      width={width}
      height={height}
      margin={{ top: 34, right: 26, bottom: 54, left: 148 }}
      xExtent={[1945, 2026]}
      yExtent={[0, 1]}
      enableHover
      accessibleTable
      colorBy="lane"
      colorScheme={{ representation: CITY, conditions: CONDITION, residents: RESIDENT }}
      tooltip={DreadTransferTooltip}
      description="Three aligned evidence lanes from 1945 to 2026. Representation is an illustrative list of cultural-work stations. Conditions and residents are discrete sourced episodes. No lane is a continuous cross-domain index."
      summary="The seed cultural works cluster toward city-crisis titles in the 1970s and 1980s and suburban-dystopia titles in the late 1990s, but the example intentionally does not calculate a crossover from an uncoded seed list. Material and survey evidence remain separate episodes."
      frameProps={{
        background: "transparent",
        transition: reducedMotion ? { duration: 0 } : { duration: 360 },
        introAnimation: !reducedMotion,
      }}
    />
  )
}

function makeDreadTransferLayout({ lens }) {
  return (context) => {
    const { data, dimensions } = context
    const { width, height } = dimensions.plot
    if (!data.length || width <= 0 || height <= 0) return { nodes: [] }

    const x = (year) => ((year - 1945) / (2026 - 1945)) * width
    const laneHeight = height / LANE_ORDER.length
    const laneY = (lane) => (LANE_ORDER.indexOf(lane) + 0.5) * laneHeight
    const activeLane = lens === "culture" ? "representation" : lens
    const visible = (lane) => lens === "all" || lane === activeLane
    const nodes = []

    data.forEach((datum, index) => {
      const centerY = laneY(datum.lane)
      const offset = datum.place === "core" ? -21 : datum.place === "suburb" ? 21 : 0
      const categoryColor =
        datum.lane === "representation"
          ? datum.place === "suburb"
            ? SUBURB
            : CITY
          : datum.lane === "conditions"
            ? CONDITION
            : RESIDENT
      const shapeOffset = datum.lane === "representation" ? offset : ((index % 3) - 1) * 11

      nodes.push({
        type: datum.lane === "representation" ? "point" : "rect",
        ...(datum.lane === "representation"
          ? { x: x(datum.year), y: centerY + shapeOffset, r: 5.5 }
          : { x: x(datum.year) - 5, y: centerY + shapeOffset - 5, w: 10, h: 10 }),
        style: {
          fill: categoryColor,
          fillOpacity: visible(datum.lane) ? 0.9 : 0.13,
          stroke: visible(datum.lane) ? "#f5efe2" : categoryColor,
          strokeWidth: visible(datum.lane) ? 1.4 : 0.6,
        },
        datum,
        accessibleDatum: datum,
        accessibility: {
          label: `${LANE_META[datum.lane]?.label ?? datum.lane}, ${temporalEvidenceLabel(datum)}: ${datum.title ?? datum.label ?? datum.measureId ?? datum.id}`,
        },
        pointId: datum.id,
        _transitionKey: datum.id,
      })
    })

    const ticks = [1945, 1965, 1980, 1995, 2008, 2020, 2026]
    const overlays = (
      <g aria-hidden="true" pointerEvents="none">
        {ticks.map((tick) => (
          <g key={tick} transform={`translate(${x(tick)},0)`}>
            <line y1="0" y2={height} stroke="currentColor" strokeOpacity="0.1" />
            <text
              y={height + 28}
              fill="currentColor"
              fillOpacity="0.65"
              fontFamily="var(--font-code, monospace)"
              fontSize="8"
              textAnchor={tick === 1945 ? "start" : tick === 2026 ? "end" : "middle"}
            >
              {tick}
            </text>
          </g>
        ))}
        {LANE_ORDER.map((lane, index) => {
          const y = laneY(lane)
          const meta = LANE_META[lane]
          return (
            <g key={lane} opacity={visible(lane) ? 1 : 0.28}>
              <rect
                x="0"
                y={index * laneHeight + 7}
                width={width}
                height={laneHeight - 14}
                fill={index % 2 ? "rgba(49,95,120,0.035)" : "rgba(213,104,63,0.025)"}
                stroke="currentColor"
                strokeOpacity="0.1"
              />
              <text
                x="-136"
                y={y - 4}
                fill={meta.color}
                fontFamily="var(--font-code, monospace)"
                fontSize="9"
                fontWeight="850"
              >
                {meta.label}
              </text>
              <text
                x="-136"
                y={y + 12}
                fill="currentColor"
                fillOpacity="0.55"
                fontFamily="var(--font-code, monospace)"
                fontSize="7"
              >
                {meta.subtitle}
              </text>
              {lane === "representation" ? (
                <>
                  <text x="6" y={y - 27} fill={CITY} fontSize="7" fontWeight="800">
                    CITY-PLACED SEEDS
                  </text>
                  <text x="6" y={y + 35} fill={SUBURB} fontSize="7" fontWeight="800">
                    SUBURB-PLACED SEEDS
                  </text>
                </>
              ) : null}
            </g>
          )
        })}
        <g transform={`translate(${x(1994)},0)`}>
          <rect
            x="0"
            y="7"
            width={Math.max(8, x(2001) - x(1994))}
            height={laneHeight - 14}
            fill="none"
            stroke={SUBURB}
            strokeDasharray="4 3"
            strokeOpacity="0.72"
          />
          <text x="4" y="20" fill={SUBURB} fontSize="7" fontWeight="800">
            CLUSTER, NOT CALCULATED CROSSOVER
          </text>
        </g>
      </g>
    )

    return { nodes, overlays }
  }
}

function DreadTransferTooltip(hover) {
  const datum = unwrapDatum(hover)
  if (!datum) return null
  const multiYearEpisode = isMultiYearEpisode(datum)
  return (
    <div className="hellhole-chart-tooltip">
      <span>
        {datum.lane} · {multiYearEpisode ? `${datum.startYear}–${datum.endYear}` : datum.year}
      </span>
      <strong>{datum.title ?? datum.label ?? datum.measureId ?? datum.id}</strong>
      {multiYearEpisode ? (
        <p>
          Plotted at {formatPlottingYear(datum.year)}, the published range midpoint, for positioning
          only; this is not an observed year.
        </p>
      ) : null}
      {datum.question ? <p>{datum.question}</p> : null}
      {datum.displayValue != null ? (
        <b>
          {datum.displayValue}
          {datum.unit ? ` ${datum.unit}` : ""}
        </b>
      ) : null}
      <small>{datum.evidenceKind ?? "Discrete evidence station"} · no implied continuity</small>
    </div>
  )
}

function cohortRowsFor(birthYears) {
  return [...new Set(birthYears)].flatMap((birthYear) => {
    const visibleRange = visibleCohortAgeRange(birthYear)
    if (!visibleRange) return []
    return Array.from({ length: visibleRange.endAge - visibleRange.startAge + 1 }, (_, index) => {
      const age = index + visibleRange.startAge
      const evidence = cohortEvidenceAtAge(birthYear, age)
      return {
        id: `cohort-${birthYear}-${age}`,
        birthYear,
        age,
        calendarYear: birthYear + age,
        evidenceKind: evidence?.evidenceKind ?? "missing",
        coverageLabel:
          evidence?.coverage === "available"
            ? "Illustrative seed-station coverage"
            : "No illustrative seed station in this authored list",
        culturalStationCount: evidence?.stations?.length ?? 0,
        representationContrast: null,
        warning: "Coverage only; not observed exposure or belief",
      }
    })
  })
}

function visibleCohortAgeRange(birthYear) {
  const startAge = Math.max(FIRST_VISIBLE_AGE, FIRST_VISIBLE_YEAR - birthYear)
  const endAge = Math.min(LAST_VISIBLE_AGE, LAST_VISIBLE_YEAR - birthYear)
  return endAge < startAge ? null : { startAge, endAge }
}

export function SameAgeDifferentAmericaChart({
  width,
  height,
  birthYear,
  compareBirthYear,
  comparisonCut,
  ageWindow,
  reducedMotion,
}) {
  const data = useMemo(
    () => cohortRowsFor([birthYear, compareBirthYear]),
    [birthYear, compareBirthYear],
  )
  const layout = useMemo(
    () =>
      makeLexisLayout({
        birthYear,
        compareBirthYear,
        comparisonCut,
        ageWindow,
      }),
    [ageWindow, birthYear, compareBirthYear, comparisonCut],
  )

  return (
    <XYCustomChart
      chartId="hellhole-same-age-different-america"
      data={data}
      layout={layout}
      width={width}
      height={height}
      margin={{ top: 32, right: 22, bottom: 48, left: 62 }}
      xExtent={[1945, 2026]}
      yExtent={[8, 35]}
      enableHover
      accessibleTable
      tooltip={LexisTooltip}
      description={`An age-period-cohort field comparing birth ${birthYear} and birth ${compareBirthYear} through calendar year ${LAST_VISIBLE_YEAR}. ${comparisonCut === "age" ? "A horizontal slice holds age 15 constant." : comparisonCut === "period" ? `A vertical slice holds ${birthYear + 15} constant.` : "Diagonal lines follow the two birth cohorts."} Cultural works are discrete illustrative stations, not an opinion heatmap.`}
      summary={`Calendar year equals birth year plus age. The requested window covers ages ${ageWindow.startAge} to ${ageWindow.endAge}, clipped for each cohort at calendar year ${LAST_VISIBLE_YEAR}. Seed-list coverage is not observed exposure or belief, and missing coverage remains blank.`}
      frameProps={{
        background: "transparent",
        transition: reducedMotion ? { duration: 0 } : { duration: 430 },
        introAnimation: !reducedMotion,
      }}
    />
  )
}

function makeLexisLayout({ birthYear, compareBirthYear, comparisonCut, ageWindow }) {
  return (context) => {
    const { data, dimensions } = context
    const { width, height } = dimensions.plot
    if (!data.length || width <= 0 || height <= 0) return { nodes: [] }
    const x = (year) => ((year - FIRST_VISIBLE_YEAR) / 81) * width
    const y = (age) =>
      height - ((age - FIRST_VISIBLE_AGE) / (LAST_VISIBLE_AGE - FIRST_VISIBLE_AGE)) * height
    const stationsByYear = new Map()
    REPRESENTATION_POINTS.forEach((station) => {
      const list = stationsByYear.get(station.year) ?? []
      list.push(station)
      stationsByYear.set(station.year, list)
    })
    const nodes = []

    for (const [year, stations] of stationsByYear) {
      const places = new Set(stations.map((station) => placeOf(station)))
      const fill = places.size > 1 ? MUTED : places.has("suburb") ? SUBURB : CITY
      nodes.push({
        type: "rect",
        x: x(year) - 2.2,
        y: 0,
        w: 4.4,
        h: height,
        style: {
          fill,
          fillOpacity: Math.min(0.12 + stations.length * 0.055, 0.42),
          stroke: "none",
        },
        datum: {
          id: `stations-${year}`,
          year,
          title: `${stations.length} illustrative cultural station${stations.length === 1 ? "" : "s"}`,
          works: stations.map((station) => station.title ?? station.workId),
          evidenceKind: "illustrative-seed",
        },
        accessibleDatum: stations,
        accessibility: { label: `${year}: ${stations.length} illustrative cultural-work stations` },
        _transitionKey: `station-band-${year}`,
      })
    }

    const cohortPath = (cohort) => {
      const visibleRange = visibleCohortAgeRange(cohort)
      if (!visibleRange) return []
      const { startAge, endAge } = visibleRange
      return Array.from({ length: endAge - startAge + 1 }, (_, index) => {
        const age = startAge + index
        return [x(cohort + age), y(age)]
      })
    }
    ;[
      [birthYear, CITY],
      [compareBirthYear, SUBURB],
    ]
      .filter(([cohort], index, rows) => rows.findIndex(([value]) => value === cohort) === index)
      .forEach(([cohort, color]) => {
        const visibleRange = visibleCohortAgeRange(cohort)
        if (!visibleRange) return
        nodes.push({
          type: "line",
          path: cohortPath(cohort),
          style: {
            fill: "none",
            stroke: color,
            strokeWidth: comparisonCut === "cohort" ? 5 : 3,
            opacity: comparisonCut === "cohort" ? 1 : 0.88,
          },
          datum: {
            id: `path-${cohort}`,
            birthYear: cohort,
            startAge: visibleRange.startAge,
            endAge: visibleRange.endAge,
            endYear: cohort + visibleRange.endAge,
            evidenceKind: "coverage-only observer path",
          },
          accessibleDatum: data.filter((row) => row.birthYear === cohort),
          accessibility: {
            label: `Birth ${cohort} coverage-only observer path from age ${visibleRange.startAge} through ${visibleRange.endAge}, ending in calendar year ${cohort + visibleRange.endAge}`,
          },
          group: String(cohort),
          _transitionKey: `path-${cohort}`,
        })
      })

    const ticks = [1945, 1960, 1975, 1990, 2005, 2020]
    const ages = [8, 15, 25, 35]
    const heldYear = birthYear + 15
    const windowSegment = (cohort) => {
      const visibleRange = visibleCohortAgeRange(cohort)
      if (!visibleRange) return null
      const startAge = Math.max(ageWindow.startAge, visibleRange.startAge)
      const endAge = Math.min(ageWindow.endAge, visibleRange.endAge)
      if (endAge < startAge) return null
      return {
        x1: x(cohort + startAge),
        y1: y(startAge),
        x2: x(cohort + endAge),
        y2: y(endAge),
      }
    }
    const observerYears = [...new Set([birthYear, compareBirthYear])]
    const overlays = (
      <g aria-hidden="true" pointerEvents="none">
        {ticks.map((tick) => (
          <g key={tick} transform={`translate(${x(tick)},0)`}>
            <line y2={height} stroke="currentColor" strokeOpacity="0.13" />
            <text
              y={height + 27}
              textAnchor="middle"
              fill="currentColor"
              fillOpacity="0.64"
              fontSize="8"
            >
              {tick}
            </text>
          </g>
        ))}
        {ages.map((age) => (
          <g key={age} transform={`translate(0,${y(age)})`}>
            <line x2={width} stroke="currentColor" strokeOpacity={age === 15 ? 0.3 : 0.11} />
            <text
              x="-16"
              dy="3"
              textAnchor="end"
              fill="currentColor"
              fillOpacity="0.65"
              fontSize="8"
            >
              AGE {age}
            </text>
          </g>
        ))}
        {comparisonCut === "age" ? (
          <line
            x2={width}
            y1={y(15)}
            y2={y(15)}
            stroke="#171712"
            strokeDasharray="7 4"
            strokeWidth="2"
          />
        ) : null}
        {comparisonCut === "period" ? (
          <line
            x1={x(heldYear)}
            x2={x(heldYear)}
            y2={height}
            stroke="#171712"
            strokeDasharray="7 4"
            strokeWidth="2"
          />
        ) : null}
        {observerYears.map((cohort) => {
          const segment = windowSegment(cohort)
          if (!segment) return null
          return (
            <g key={`window-${cohort}`}>
              <line {...segment} stroke="#171712" strokeWidth="8" strokeOpacity="0.2" />
              <circle cx={segment.x1} cy={segment.y1} r="4" fill="#171712" />
              <circle cx={segment.x2} cy={segment.y2} r="4" fill="#171712" />
            </g>
          )
        })}
        <text
          x="4"
          y="13"
          fill="currentColor"
          fillOpacity="0.66"
          fontFamily="var(--font-code, monospace)"
          fontSize="7"
        >
          ILLUSTRATIVE SEED STATIONS / BLANK MEANS NO STATION
        </text>
      </g>
    )
    return { nodes, overlays }
  }
}

function LexisTooltip(hover) {
  const datum = unwrapDatum(hover)
  if (!datum) return null
  return (
    <div className="hellhole-chart-tooltip">
      <span>{datum.evidenceKind ?? "Observer field"}</span>
      <strong>{datum.title ?? `Born ${datum.birthYear}`}</strong>
      {datum.calendarYear != null ? (
        <p>
          Age {datum.age} in {datum.calendarYear}
        </p>
      ) : null}
      {datum.works?.length ? <p>{datum.works.join(" · ")}</p> : null}
      <small>Seed-list coverage is not observed exposure or belief.</small>
    </div>
  )
}

const MOTIF_NODES = Object.freeze([
  { id: "visible-street-violence", label: "VISIBLE VIOLENCE", category: "city" },
  { id: "threatening-anonymity", label: "ANONYMOUS THREAT", category: "city" },
  { id: "public-disorder", label: "PUBLIC DISORDER", category: "city" },
  { id: "municipal-corruption", label: "MUNICIPAL FAILURE", category: "city" },
  { id: "hidden-domestic-violence", label: "HIDDEN VIOLENCE", category: "suburb" },
  { id: "suburban-inauthenticity", label: "INAUTHENTICITY", category: "suburb" },
  { id: "private-breakdown", label: "PRIVATE BREAKDOWN", category: "suburb" },
  { id: "social-control", label: "SOCIAL CONTROL", category: "suburb" },
])

const MOTIF_EDGES = Object.freeze([
  {
    id: "motif-visible-hidden",
    source: "visible-street-violence",
    target: "hidden-domestic-violence",
    value: 1,
    startTime: 1976,
    endTime: 1999,
    relation: "translation",
    note: "visible street violence → hidden domestic or interpersonal violence",
  },
  {
    id: "motif-anonymity-authenticity",
    source: "threatening-anonymity",
    target: "suburban-inauthenticity",
    value: 1,
    startTime: 1978,
    endTime: 1998,
    relation: "translation",
    note: "urban anonymity → suburban inauthenticity",
  },
  {
    id: "motif-public-private",
    source: "public-disorder",
    target: "private-breakdown",
    value: 1,
    startTime: 1979,
    endTime: 1999,
    relation: "translation",
    note: "public disorder → private breakdown",
  },
  {
    id: "motif-corruption-control",
    source: "municipal-corruption",
    target: "social-control",
    value: 1,
    startTime: 1981,
    endTime: 2004,
    relation: "translation",
    note: "municipal corruption → domestic, HOA, or corporate discipline",
  },
])

function MotifTooltip(hover) {
  const datum = unwrapDatum(hover)
  if (!datum) return null
  return (
    <div className="hellhole-chart-tooltip">
      <span>{datum.relation ?? datum.category ?? "Motif"}</span>
      <strong>{datum.note ?? datum.label ?? datum.id}</strong>
      <small>One schematic unit · editorial continuity · not causation</small>
    </div>
  )
}

export function MotifTranslationChart({ width, height, reducedMotion }) {
  return (
    <ProcessSankey
      chartId="hellhole-motif-translation"
      nodes={MOTIF_NODES}
      edges={MOTIF_EDGES}
      domain={[1974, 2008]}
      axisTicks={[
        { date: 1974, label: "CITY-CRISIS ERA" },
        { date: 1986, label: "EARLY SUBURBAN CRITIQUE" },
        { date: 1999, label: "SUBURBAN-GOTHIC CLUSTER" },
        { date: 2008, label: "POST-BOOM FRACTURE" },
      ]}
      width={width}
      height={height}
      margin={{ top: 42, right: 138, bottom: 54, left: 138 }}
      nodeLabel="label"
      colorBy="category"
      colorScheme={{ city: CITY, suburb: SUBURB }}
      pairing="temporal"
      laneOrder="crossing-min+inside-out"
      maxValueScale={18}
      lanePlacement="hug"
      ribbonLane="both"
      showLaneRails
      showLabels
      showLegend={false}
      showParticles={!reducedMotion}
      edgeOpacity={0.7}
      valueFormat={(value) => `${value} schematic motif unit`}
      timeFormat={(value) => `${Math.round(Number(value))}`}
      tooltip={MotifTooltip}
      accessibleTable
      description="Four schematic motif translations connect an earlier city-crisis vocabulary to a later suburban-gothic vocabulary across a narrative time axis."
      summary="Each ribbon carries one editorial motif-translation unit from the example's illustrative cultural selection. Width is not prevalence, public opinion, population, or proof of influence."
      frameProps={{ background: "transparent" }}
    />
  )
}

const SURVEY_CARDS = Object.freeze([
  {
    id: "gallup-2001-place-fit",
    organization: "Gallup · 2001",
    title: "Current residents preferring their own place type",
    source: "R9",
    rows: [
      { label: "City resident → city", value: 53, place: "core" },
      { label: "Suburb resident → suburb", value: 67, place: "suburb" },
    ],
    caveat:
      "Current-place to preferred-place table. It is not comparable to the 2026 density tradeoff.",
  },
  {
    id: "pew-2026-density-tradeoff",
    organization: "Pew Research Center · January 2026",
    title: "Housing and proximity tradeoff",
    source: "R11",
    rows: [
      { label: "Larger / farther apart", value: 55, place: "suburb" },
      { label: "Smaller / near services", value: 44, place: "core" },
    ],
    caveat:
      "A density-and-services choice, not satisfaction and not a city-versus-suburb trend point.",
  },
])

export function SurveyEpisodeCharts({ width, height }) {
  const cardWidth = Math.max(280, width > 760 ? (width - 18) / 2 - 36 : width - 36)
  return (
    <div className="hellhole-survey-grid">
      {SURVEY_CARDS.map((card) => (
        <article className="hellhole-survey-card" key={card.id}>
          <header>
            <span>
              {card.organization} · {card.source}
            </span>
            <h3>{card.title}</h3>
          </header>
          <BarChart
            chartId={card.id}
            data={card.rows}
            categoryAccessor="label"
            valueAccessor="value"
            colorBy="place"
            colorScheme={{ core: CITY, suburb: SUBURB }}
            orientation="horizontal"
            sort={false}
            valueExtent={[0, 100]}
            width={cardWidth}
            height={height}
            margin={{ top: 18, right: 34, bottom: 38, left: cardWidth < 380 ? 128 : 164 }}
            showGrid
            enableHover
            accessibleTable
            valueFormat={(value) => `${Math.round(Number(value))}%`}
            description={`${card.organization}. ${card.title}. ${card.rows.map((row) => `${row.label}: ${row.value} percent`).join("; ")}.`}
            summary={card.caveat}
            tooltip
            frameProps={{ background: "transparent" }}
          />
          <footer>{card.caveat}</footer>
        </article>
      ))}
    </div>
  )
}

const MIGRATION_SOURCE_LABELS = Object.freeze({
  "census-county-flows-2006-2010": "ACS 06–10",
  "census-county-flows-2016-2020": "ACS 16–20",
})

const MIGRATION_ANNOTATIONS = Object.freeze(
  NYC_MIGRATION_NODES.map((node) =>
    Object.freeze({
      type: "callout",
      coordinates: [node.lon, node.lat],
      label: node.shortLabel,
      dx: node.annotation.dx,
      dy: node.annotation.dy,
      color: node.placeType === "core" ? CITY : SUBURB,
      connector: { end: "dot" },
    }),
  ),
)

function migrationStrokeWidth(value) {
  return 1.4 + (Number(value) / NYC_MIGRATION_MAX_FLOW) * 10.6
}

function formatMigrationEstimate(value) {
  return Number(value).toLocaleString("en-US")
}

function formatMigrationNet(value) {
  const amount = formatMigrationEstimate(Math.abs(value))
  if (value === 0) return "0 · balanced"
  return `${amount} ${value > 0 ? "toward core" : "outward"}`
}

function MigrationFlowTooltip(hover) {
  const datum = unwrapDatum(hover)
  if (!datum) return null
  if (datum.source != null && datum.target != null) {
    return (
      <div className="hellhole-chart-tooltip hellhole-flow-tooltip">
        <span>
          {datum.period} · {datum.direction === "outbound" ? "OUTWARD" : "INTO CORE"}
        </span>
        <strong>
          {datum.sourceName} → {datum.targetName}
        </strong>
        <small>{formatMigrationEstimate(datum.value)} estimated people</small>
        <small>
          Same-pair counterflow: {formatMigrationEstimate(datum.counterflow)} · net{" "}
          {formatMigrationNet(datum.netTowardCore)}
        </small>
      </div>
    )
  }
  return (
    <div className="hellhole-chart-tooltip hellhole-flow-tooltip">
      <span>{datum.placeType === "core" ? "FIVE-COUNTY CORE" : "FIXED SUBURBAN RING"}</span>
      <strong>{datum.name ?? datum.shortLabel ?? datum.id}</strong>
      <small>{datum.countyFips?.join(" · ")}</small>
    </div>
  )
}

function MigrationMapPanel({ snapshot, width, height, reducedMotion }) {
  const totals = migrationTotals(snapshot.period)
  const displayedTotal = snapshot.flows.reduce((sum, flow) => sum + flow.value, 0)
  const counterflowTotal = snapshot.direction === "outbound" ? totals.inbound : totals.outbound
  const routeColor = snapshot.direction === "outbound" ? CITY : SUBURB

  return (
    <article className={`hellhole-flow-panel is-${snapshot.direction}`}>
      <header>
        <span>
          {snapshot.direction === "outbound" ? "OUTWARD" : "INTO CORE"} · {snapshot.periodLabel}
        </span>
        <h4>{snapshot.title}</h4>
        <p>{snapshot.routeLabel}</p>
      </header>
      <div className="hellhole-flow-panel__map">
        <FlowMap
          chartId={`hellhole-migration-${snapshot.id}`}
          nodes={NYC_MIGRATION_NODES}
          flows={snapshot.flows}
          nodeIdAccessor="id"
          lineIdAccessor="id"
          xAccessor="lon"
          yAccessor="lat"
          valueAccessor="value"
          projection="mercator"
          lineType="line"
          flowStyle="arc"
          annotations={MIGRATION_ANNOTATIONS}
          width={width}
          height={height}
          margin={{ top: 50, right: 54, bottom: 42, left: 54 }}
          fitPadding={0.1}
          showParticles={!reducedMotion}
          particleStyle={{
            radius: 1.8,
            color: routeColor,
            opacity: 0.9,
            speedMultiplier: 0.42,
            spawnRate: 0.07,
            maxPerLine: 9,
          }}
          enableHover
          tooltip={MigrationFlowTooltip}
          accessibleTable
          description={`${snapshot.routeLabel}. Five route widths encode U.S. Census Bureau ACS county-flow estimates on one shared zero-to-${formatMigrationEstimate(NYC_MIGRATION_MAX_FLOW)} scale. Each estimate is based on current residence and residence one year earlier.`}
          summary={`${formatMigrationEstimate(displayedTotal)} estimated people are shown in the mapped direction. The same county pairs also carried ${formatMigrationEstimate(counterflowTotal)} people in the opposite direction; net balance was ${formatMigrationNet(totals.netTowardCore)}.`}
          animate={reducedMotion ? false : { duration: 360, intro: true }}
          frameProps={{
            background: "transparent",
            seed: snapshot.period === "2006-2010" ? 2006 : 2016,
            pointStyle: (datum) => ({
              fill: datum.placeType === "core" ? CITY : SUBURB,
              stroke: "#f1ead8",
              strokeWidth: datum.placeType === "core" ? 2.4 : 1.5,
              fillOpacity: 0.96,
              r: datum.placeType === "core" ? 8 : 5.5,
            }),
            lineStyle: (datum) => ({
              stroke: routeColor,
              strokeWidth: migrationStrokeWidth(datum.value),
              strokeLinecap: "round",
              strokeOpacity: 0.78,
              fillOpacity: 0,
            }),
          }}
        />
      </div>
      <dl className="hellhole-flow-panel__totals">
        <div>
          <dt>Mapped</dt>
          <dd>{formatMigrationEstimate(displayedTotal)}</dd>
        </div>
        <div>
          <dt>Counterflow</dt>
          <dd>{formatMigrationEstimate(counterflowTotal)}</dd>
        </div>
        <div>
          <dt>Net</dt>
          <dd>{formatMigrationNet(totals.netTowardCore)}</dd>
        </div>
      </dl>
      <footer>{MIGRATION_SOURCE_LABELS[snapshot.sourceId]} · estimated people</footer>
    </article>
  )
}

export function MetropolitanFlowComparison({ width, reducedMotion }) {
  const stacked = width < 780
  const mapWidth = Math.max(280, stacked ? width - 32 : (width - 18) / 2 - 32)
  const mapHeight = stacked ? 344 : 366
  const earlyTotals = migrationTotals("2006-2010")
  const laterTotals = migrationTotals("2016-2020")

  return (
    <section className="hellhole-flow-comparison" aria-labelledby="hellhole-flow-title">
      <header className="hellhole-flow-comparison__heading">
        <div>
          <p className="hellhole-kicker">The Census enters wearing a necktie</p>
          <h3 id="hellhole-flow-title">Bodies went outward. Nightmares came home.</h3>
        </div>
        <p>
          Fine. Bring in the clipboards. New York City remains the same five-county core; Nassau,
          Suffolk, Westchester, Rockland, and North Jersey remain the suburban ring. The left map
          follows the earlier exodus. The right catches the later return current. The unpictured
          counterflows wait below like hecklers with spreadsheets.
        </p>
      </header>

      <div className="hellhole-flow-grid">
        {NYC_MIGRATION_SNAPSHOTS.map((snapshot) => (
          <MigrationMapPanel
            key={snapshot.id}
            snapshot={snapshot}
            width={mapWidth}
            height={mapHeight}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>

      <div className="hellhole-flow-scale" aria-label="Shared route-width scale">
        <strong>One width scale · estimated people</strong>
        {[0, Math.round(NYC_MIGRATION_MAX_FLOW / 2), NYC_MIGRATION_MAX_FLOW].map((value) => (
          <span key={value}>
            <i style={{ height: `${migrationStrokeWidth(value)}px` }} aria-hidden="true" />
            {formatMigrationEstimate(value)}
          </span>
        ))}
      </div>

      <div className="hellhole-flow-verdict">
        <span>The numbers object. Nobody asked them.</span>
        <p>
          Later inbound routes total {formatMigrationEstimate(laterTotals.inbound)}, but the same
          county pairs carry {formatMigrationEstimate(laterTotals.outbound)} outward: a net{" "}
          {formatMigrationNet(laterTotals.netTowardCore)}. The earlier balance was already{" "}
          {formatMigrationNet(earlyTotals.netTowardCore)}. So no, migration did not perform the tidy
          U-turn the movies ordered. The cultural hellhole moved to suburbia while more bodies kept
          moving outward. America bought the landscape it had learned to fear.
        </p>
      </div>

      <div className="hellhole-flow-ledger" tabIndex="0" aria-label="Migration route ledger">
        <table>
          <caption>
            Same fixed county pairs in both ACS periods. Values are summed county-pair estimates;
            they are not five-year move totals.
          </caption>
          <thead>
            <tr>
              <th scope="col">Suburban area</th>
              <th scope="col">06–10 out</th>
              <th scope="col">06–10 in</th>
              <th scope="col">06–10 net</th>
              <th scope="col">16–20 in</th>
              <th scope="col">16–20 out</th>
              <th scope="col">16–20 net</th>
            </tr>
          </thead>
          <tbody>
            {NYC_MIGRATION_ROUTE_RECORDS.map((route) => {
              const early = route.periods["2006-2010"]
              const later = route.periods["2016-2020"]
              return (
                <tr key={route.id}>
                  <th scope="row">
                    {route.label}
                    <small>{route.countyFips.join(" · ")}</small>
                  </th>
                  <td>{formatMigrationEstimate(early.outbound)}</td>
                  <td>{formatMigrationEstimate(early.inbound)}</td>
                  <td>{formatMigrationNet(early.inbound - early.outbound)}</td>
                  <td>{formatMigrationEstimate(later.inbound)}</td>
                  <td>{formatMigrationEstimate(later.outbound)}</td>
                  <td>{formatMigrationNet(later.inbound - later.outbound)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Fixed-ring total</th>
              <td>{formatMigrationEstimate(earlyTotals.outbound)}</td>
              <td>{formatMigrationEstimate(earlyTotals.inbound)}</td>
              <td>{formatMigrationNet(earlyTotals.netTowardCore)}</td>
              <td>{formatMigrationEstimate(laterTotals.inbound)}</td>
              <td>{formatMigrationEstimate(laterTotals.outbound)}</td>
              <td>{formatMigrationNet(laterTotals.netTowardCore)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="hellhole-flow-caveat">
        The clipboard counts changed addresses, not motives. Fine. Component 90% margins of error
        remain in the Census files; this display does not invent a combined margin for the regional
        sums just to make the yelling sound scientific.
      </p>
    </section>
  )
}

const METRIC_CONFIG = Object.freeze({
  "poverty-rate": {
    title: "2022 poverty rate",
    source: "Brookings · R13",
    unit: "%",
    extent: [0, 20],
    rows: [
      { label: "Primary city", value: 16.2, place: "core" },
      { label: "Suburb", value: 9.6, place: "suburb" },
    ],
    summary: "The primary-city rate is higher even though the suburban count can be larger.",
  },
  "poverty-count": {
    title: "2008 suburban count advantage",
    source: "Brookings · R12",
    unit: "M more",
    extent: [0, 1.6],
    rows: [{ label: "Suburban poor minus primary-city poor", value: 1.5, place: "suburb" }],
    summary:
      "This is a reported difference, not the two underlying counts. Missing baselines stay missing.",
  },
  "resident-preference": {
    title: "January 2026 density tradeoff",
    source: "Pew Research Center · R11",
    unit: "%",
    extent: [0, 60],
    rows: [
      { label: "Larger / farther apart", value: 55, place: "suburb" },
      { label: "Smaller / near services", value: 44, place: "core" },
    ],
    summary: "This question is not a satisfaction measure or a direct city/suburb choice.",
  },
})

export function MetricFractureChart({ width, height, metric }) {
  const config = METRIC_CONFIG[metric]
  if (!config) {
    return (
      <div className="hellhole-missing-metric" role="status">
        <span>Representation · the accusation</span>
        <strong>The culture already rendered its verdict.</strong>
        <p>
          The works march from urban ruin to suburban rot with all the subtlety of a flaming zoning
          map. There is no fake decimal score here. The dates, settings, and titles make the charge
          in plain language.
        </p>
      </div>
    )
  }
  return (
    <div className="hellhole-metric-chart">
      <header>
        <span>{config.source}</span>
        <strong>{config.title}</strong>
      </header>
      <BarChart
        chartId={`hellhole-metric-${metric}`}
        data={config.rows}
        categoryAccessor="label"
        valueAccessor="value"
        colorBy="place"
        colorScheme={{ core: CITY, suburb: SUBURB }}
        orientation="horizontal"
        sort={false}
        valueExtent={config.extent}
        width={width}
        height={height - 54}
        margin={{
          top: 14,
          right: 46,
          bottom: 42,
          left: Math.min(206, Math.max(128, width * 0.34)),
        }}
        showGrid
        enableHover
        accessibleTable
        valueFormat={(value) => `${Number(value).toLocaleString()}${config.unit}`}
        description={`${config.title}. ${config.rows.map((row) => `${row.label}: ${row.value}${config.unit}`).join("; ")}.`}
        summary={config.summary}
        tooltip
        frameProps={{ background: "transparent" }}
      />
      <p>{config.summary}</p>
    </div>
  )
}
