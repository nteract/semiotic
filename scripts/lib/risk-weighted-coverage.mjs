/**
 * Risk-weighted coverage accounting for the production `src/components` tree.
 *
 * Aggregate coverage is useful for detecting broad regressions, but it can hide
 * a serious drop in a small lifecycle or worker module. These rules elevate the
 * paths where a miss is most likely to create a wrong chart or a hard-to-debug
 * runtime failure. Every other production file still participates with weight 1.
 */

const METRICS = ["statements", "branches", "functions", "lines"]

export const PRODUCTION_ROOT = "src/components/"

export const WEIGHTED_FLOORS = Object.freeze({
  statements: 75,
  branches: 65,
  functions: 79,
  lines: 77,
})

export const RISK_AREAS = Object.freeze([
  {
    name: "stream lifecycle and invalidation",
    weight: 5,
    branchFloor: 58,
    patterns: [
      /^src\/components\/stream\/(?:PipelineStore|OrdinalPipelineStore|NetworkPipelineStore|GeoPipelineStore)\.ts$/,
      /^src\/components\/stream\/Stream(?:XY|Ordinal|Network|Geo)Frame\.tsx$/,
      /^src\/components\/stream\/(?:pipelineTransitions|pipelinePulse|pipelineDecay|customLayoutFailure)\.ts$/,
    ],
  },
  {
    name: "worker protocol and startup",
    weight: 4,
    branchFloor: 45,
    patterns: [
      /^src\/components\/stream\/layouts\/forceLayoutWorker\.js$/,
      /^src\/components\/stream\/physics\/physicsWorker\.js$/,
      /^src\/components\/stream\/physics\/(?:PhysicsWorkerClient|PhysicsWorkerRuntime|PhysicsWorkerProtocol)\.ts$/,
    ],
  },
  {
    name: "custom-layout recovery",
    weight: 4,
    branchFloor: 68,
    patterns: [
      /^src\/components\/charts\/custom\//,
      /^src\/components\/stream\/(?:customLayoutDiagnostics|networkFramePaint)\.ts$/,
    ],
  },
  {
    name: "interaction and keyboard navigation",
    weight: 3,
    branchFloor: 60,
    patterns: [
      /^src\/components\/stream\/(?:CanvasHitTester|GeoCanvasHitTester|NetworkCanvasHitTester|OrdinalCanvasHitTester|OrdinalBrushOverlay|XYBrushOverlay|hitTestUtils|hoverUtils|keyboardNav|quadtreeHitTest)\.(?:ts|tsx)$/,
    ],
  },
  {
    name: "layout algorithms",
    weight: 3,
    branchFloor: 70,
    patterns: [
      /^src\/components\/charts\/network\/processSankey\//,
      /^src\/components\/stream\/layouts\/(?:chordLayoutPlugin|forceLayoutPlugin|forceLayoutWorkerClient|hierarchyLayoutPlugin|hierarchySceneBuilders|hierarchyUtils|orbitLayoutPlugin|sankeyLayoutPlugin)\.ts$/,
    ],
  },
])

function asCount(value) {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function summarizeCounts(counts) {
  const total = counts.length
  const covered = counts.reduce((sum, count) => sum + (asCount(count) > 0 ? 1 : 0), 0)
  return {
    total,
    covered,
    pct: total === 0 ? 100 : Number(((covered / total) * 100).toFixed(2)),
  }
}

function lineCounts(entry) {
  const countsByLine = new Map()
  const statementMap = entry.statementMap || {}
  const statementCounts = entry.s || {}

  for (const [id, location] of Object.entries(statementMap)) {
    const line = location?.start?.line
    if (!Number.isSafeInteger(line) || line < 1) continue
    const nextCount = asCount(statementCounts[id])
    countsByLine.set(line, Math.max(countsByLine.get(line) || 0, nextCount))
  }

  return [...countsByLine.values()]
}

/**
 * Return Istanbul-style summary counts without relying on a transitive package.
 */
export function summarizeCoverageEntry(entry) {
  const branchCounts = Object.values(entry.b || {}).flat()
  return {
    statements: summarizeCounts(Object.values(entry.s || {})),
    branches: summarizeCounts(branchCounts),
    functions: summarizeCounts(Object.values(entry.f || {})),
    lines: summarizeCounts(lineCounts(entry)),
  }
}

export function combineCoverageSummaries(summaries) {
  const combined = Object.fromEntries(METRICS.map((metric) => [metric, { total: 0, covered: 0 }]))
  for (const summary of summaries) {
    for (const metric of METRICS) {
      combined[metric].total += summary[metric].total
      combined[metric].covered += summary[metric].covered
    }
  }

  for (const metric of METRICS) {
    const value = combined[metric]
    value.pct = value.total === 0
      ? 100
      : Number(((value.covered / value.total) * 100).toFixed(2))
  }

  return combined
}

function toRepoPath(repoRoot, filename) {
  const relativePath = filename.startsWith(repoRoot)
    ? filename.slice(repoRoot.length).replace(/^[/\\]/, "")
    : filename
  return relativePath.replaceAll("\\", "/")
}

function findRiskArea(relativePath) {
  const matches = RISK_AREAS.filter((area) => area.patterns.some((pattern) => pattern.test(relativePath)))
  return matches
}

function createAreaReport(area, entries) {
  return {
    name: area.name,
    weight: area.weight,
    branchFloor: area.branchFloor,
    files: entries.length,
    coverage: combineCoverageSummaries(entries.map((entry) => entry.coverage)),
  }
}

/**
 * Calculate the report and all gate failures from Istanbul/Vitest coverage JSON.
 */
export function analyzeRiskWeightedCoverage(coverageMap, { repoRoot = process.cwd() } = {}) {
  const errors = []
  if (!coverageMap || typeof coverageMap !== "object" || Array.isArray(coverageMap)) {
    return { errors: ["coverage report must be an object keyed by source filename"] }
  }

  const productionEntries = Object.entries(coverageMap)
    .map(([filename, entry]) => ({
      filename,
      relativePath: toRepoPath(repoRoot, filename),
      coverage: summarizeCoverageEntry(entry),
    }))
    .filter((entry) => entry.relativePath.startsWith(PRODUCTION_ROOT))

  if (productionEntries.length === 0) {
    errors.push(`coverage report contains no files under ${PRODUCTION_ROOT}; verify coverage.include`)
  }

  const entriesByArea = new Map(RISK_AREAS.map((area) => [area.name, []]))
  const defaultEntries = []
  const weightsByFilename = new Map()

  for (const entry of productionEntries) {
    const matches = findRiskArea(entry.relativePath)
    if (matches.length > 1) {
      errors.push(`${entry.relativePath} matches multiple risk areas: ${matches.map((area) => area.name).join(", ")}`)
      continue
    }

    const area = matches[0]
    if (area) {
      entriesByArea.get(area.name).push(entry)
      weightsByFilename.set(entry.filename, area.weight)
    } else {
      defaultEntries.push(entry)
      weightsByFilename.set(entry.filename, 1)
    }
  }

  const riskAreas = RISK_AREAS.map((area) => createAreaReport(area, entriesByArea.get(area.name)))
  for (const area of riskAreas) {
    if (area.files === 0) {
      errors.push(`risk area "${area.name}" does not match any production coverage files`)
      continue
    }
    if (area.coverage.branches.pct < area.branchFloor) {
      errors.push(
        `risk area "${area.name}" branch coverage ${area.coverage.branches.pct}% is below its ${area.branchFloor}% floor`,
      )
    }
  }

  const weighted = Object.fromEntries(METRICS.map((metric) => [metric, { total: 0, covered: 0 }]))
  for (const entry of productionEntries) {
    const weight = weightsByFilename.get(entry.filename) || 1
    for (const metric of METRICS) {
      weighted[metric].total += entry.coverage[metric].total * weight
      weighted[metric].covered += entry.coverage[metric].covered * weight
    }
  }
  for (const metric of METRICS) {
    weighted[metric].pct = weighted[metric].total === 0
      ? 100
      : Number(((weighted[metric].covered / weighted[metric].total) * 100).toFixed(2))
    if (weighted[metric].pct < WEIGHTED_FLOORS[metric]) {
      errors.push(
        `risk-weighted ${metric} coverage ${weighted[metric].pct}% is below its ${WEIGHTED_FLOORS[metric]}% floor`,
      )
    }
  }

  const production = combineCoverageSummaries(productionEntries.map((entry) => entry.coverage))
  return {
    version: 1,
    productionFiles: productionEntries.length,
    production,
    weighted,
    weightedFloors: WEIGHTED_FLOORS,
    riskAreas,
    defaultProduction: {
      name: "other production code",
      weight: 1,
      files: defaultEntries.length,
      coverage: combineCoverageSummaries(defaultEntries.map((entry) => entry.coverage)),
    },
    errors,
  }
}
