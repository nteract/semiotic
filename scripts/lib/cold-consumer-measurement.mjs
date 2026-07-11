/**
 * Packed cold-consumer bundle measurement.
 *
 * Unlike `sync-bundle-sizes.mjs`, this module does not quote Semiotic's own
 * first-party artifacts. It packs the package, extracts that tarball into a
 * fresh consumer's node_modules directory, then asks esbuild to bundle a
 * retained named import from each stable public export. That makes package
 * export resolution and consumer-side bundling part of the measurement.
 */

import { execFileSync } from "node:child_process"
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { isDeepStrictEqual } from "node:util"
import { constants as zlibConstants, gzipSync } from "node:zlib"
import { build, version as esbuildVersion } from "esbuild"

const __dirname = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(__dirname, "../..")

export const REPORT_SCHEMA_VERSION = 1
export const README_MARKER_START = "<!-- semiotic-cold-consumer:start -->"
export const README_MARKER_END = "<!-- semiotic-cold-consumer:end -->"

// Raw bundles are expected to be nearly identical across supported runners.
// gzip output can differ more substantially as Node's bundled zlib changes,
// even for identical input bytes. Keep each allowance narrow enough to catch
// a genuine bundle regression while avoiding a runner-only baseline rewrite.
export const COLD_CONSUMER_SIZE_TOLERANCE = Object.freeze({
  rawBytes: Object.freeze({ minimumBytes: 32, relative: 0.001 }),
  gzipBytes: Object.freeze({ minimumBytes: 16, relative: 0.01 }),
})

// `./experimental` is intentionally unpublished as a stable contract. The
// metadata resource is a public export but cannot be a JavaScript named import.
export const EXCLUDED_EXPORTS = new Set(["./experimental", "./package.json"])

// The consumer intentionally treats host/runtime peers and optional adapters
// as external. Semiotic's regular dependencies (including d3) are part of the
// published package runtime graph and remain in the measured bundle.
export const EXTERNAL_RUNTIME_PACKAGES = Object.freeze([
  "react",
  "react-dom",
  "react-dom/*",
  "matter-js",
  "@dimforge/rapier2d-compat",
  "world-atlas",
  "sharp",
  "gifenc",
])

/**
 * One retained public named import per stable package export. Browser and
 * server consumers are measured separately because the server export is a
 * Node target, not a browser payload.
 */
export const NAMED_IMPORT_CASES = Object.freeze([
  { exportKey: ".", symbol: "LineChart", platform: "browser" },
  { exportKey: "./xy", symbol: "LineChart", platform: "browser" },
  { exportKey: "./ordinal", symbol: "BarChart", platform: "browser" },
  { exportKey: "./network", symbol: "SankeyDiagram", platform: "browser" },
  { exportKey: "./realtime", symbol: "RealtimeLineChart", platform: "browser" },
  { exportKey: "./physics", symbol: "GaltonBoardChart", platform: "browser" },
  { exportKey: "./physics/matter", symbol: "MATTER_PHYSICS_CAPABILITIES", platform: "browser" },
  { exportKey: "./physics/rapier", symbol: "RAPIER_PHYSICS_CAPABILITIES", platform: "browser" },
  { exportKey: "./server", symbol: "renderChart", platform: "node" },
  { exportKey: "./ai", symbol: "suggestCharts", platform: "browser" },
  { exportKey: "./ai/core", symbol: "suggestCharts", platform: "browser" },
  { exportKey: "./data", symbol: "bin", platform: "browser" },
  { exportKey: "./geo", symbol: "ChoroplethMap", platform: "browser" },
  { exportKey: "./themes", symbol: "resolveThemePreset", platform: "browser" },
  { exportKey: "./utils", symbol: "validateProps", platform: "browser" },
  { exportKey: "./recipes", symbol: "waffleLayout", platform: "browser" },
  { exportKey: "./value", symbol: "BigNumber", platform: "browser" },
])

export function importPathFor(exportKey) {
  return exportKey === "." ? "semiotic" : `semiotic/${exportKey.slice(2)}`
}

export function stableModuleExportKeys(packageJson) {
  return Object.keys(packageJson.exports ?? {})
    .filter((exportKey) => !EXCLUDED_EXPORTS.has(exportKey))
    .sort()
}

export function validateNamedImportCases(packageJson, cases = NAMED_IMPORT_CASES) {
  const errors = []
  const stableExports = stableModuleExportKeys(packageJson)
  const seen = new Set()

  for (const entry of cases) {
    if (!entry?.exportKey || !entry?.symbol || !entry?.platform) {
      errors.push("Named import case requires exportKey, symbol, and platform")
      continue
    }
    if (seen.has(entry.exportKey)) errors.push(`Named import cases repeat ${entry.exportKey}`)
    seen.add(entry.exportKey)
    if (!stableExports.includes(entry.exportKey)) {
      errors.push(`Named import case ${entry.exportKey} is not a stable package export`)
    }
  }

  for (const exportKey of stableExports) {
    if (!seen.has(exportKey)) {
      errors.push(`Stable package export ${exportKey} has no cold-consumer named import case`)
    }
  }

  return errors
}

export function reportForMeasurements(packageJson, measurements) {
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    package: {
      name: packageJson.name,
      version: packageJson.version,
    },
    method: {
      artifact: "npm pack --ignore-scripts tarball",
      resolution: "fresh temporary consumer/node_modules/semiotic",
      bundler: {
        name: "esbuild",
        version: esbuildVersion,
        format: "esm",
        minify: true,
        treeShaking: true,
      },
      gzip: {
        algorithm: "gzip",
        level: 9,
      },
      externalizedRuntimePackages: EXTERNAL_RUNTIME_PACKAGES,
      dependencyResolution:
        "Runtime dependency closure copied from the workspace node_modules into the fresh consumer; CI installs that workspace from the lockfile before this gate.",
      note:
        "Each row retains one named import from a public package export. The result includes Semiotic and its resolved runtime dependencies, but excludes host React/React DOM peers and optional adapter packages.",
    },
    excludedExports: [...EXCLUDED_EXPORTS].sort(),
    measurements,
  }
}

export function renderReadmeBlock(report) {
  const lines = [
    README_MARKER_START,
    "<!-- Auto-generated by `scripts/measure-cold-consumer.mjs`. Do not edit by hand. -->",
    "",
    "Method: fresh `npm pack --ignore-scripts` tarball → temporary consumer → minified/tree-shaken esbuild ESM bundle → gzip -9. React/React DOM and optional adapter peers are external; Semiotic and its resolved runtime dependencies are included.",
    "",
    "| Public named import | Runtime | gzip cold-consumer bundle |",
    "|---|---:|---:|",
  ]

  for (const measurement of report.measurements) {
    lines.push(
      `| \`import { ${measurement.symbol} } from "${measurement.importPath}"\` | ${measurement.platform} | **${formatKiB(measurement.gzipBytes)} KiB** |`,
    )
  }

  lines.push("", README_MARKER_END)
  return lines.join("\n")
}

export function replaceMarkerBlock(content, block) {
  const markerError = readmeMarkerBlockError(content)
  if (markerError) return null
  const start = content.indexOf(README_MARKER_START)
  const end = content.indexOf(README_MARKER_END, start + README_MARKER_START.length)
  return content.slice(0, start) + block + content.slice(end + README_MARKER_END.length)
}

export function readmeMarkerBlockError(content) {
  const starts = markerPositions(content, README_MARKER_START)
  const ends = markerPositions(content, README_MARKER_END)

  if (starts.length === 0) return "is missing the cold-consumer measurement start marker"
  if (starts.length > 1) return "contains multiple cold-consumer measurement start markers"
  if (ends.length === 0) return "is missing the cold-consumer measurement end marker"
  if (ends.length > 1) return "contains multiple cold-consumer measurement end markers"
  if (ends[0] < starts[0]) return "has its cold-consumer measurement end marker before its start marker"
  return null
}

export function formatKiB(bytes) {
  return (bytes / 1024).toFixed(1)
}

export function serializeReport(report) {
  return `${JSON.stringify(report, null, 2)}\n`
}

export function coldConsumerSizeTolerance(metric, baselineBytes) {
  const policy = COLD_CONSUMER_SIZE_TOLERANCE[metric]
  if (!policy) throw new Error(`Unknown cold-consumer size metric ${metric}`)
  if (!Number.isSafeInteger(baselineBytes) || baselineBytes < 1) {
    throw new Error(`Cannot calculate ${metric} tolerance for invalid byte count ${baselineBytes}`)
  }
  return Math.max(policy.minimumBytes, Math.ceil(baselineBytes * policy.relative))
}

/**
 * Compare a committed measurement baseline with a fresh one.
 *
 * The package/method/export contract remains exact. Only raw and gzip byte
 * counts get the narrow allowance defined above, because those values can
 * differ across otherwise equivalent supported runners.
 */
export function compareColdConsumerReports(baseline, current) {
  const structuralErrors = [
    ...validateColdConsumerReport(baseline, "baseline"),
    ...validateColdConsumerReport(current, "current measurement"),
  ]
  const sizeDeltas = []

  if (structuralErrors.length > 0) {
    return { current: false, structuralErrors, sizeDeltas }
  }

  if (baseline.schemaVersion !== current.schemaVersion) {
    structuralErrors.push(
      `schema version differs (baseline ${baseline.schemaVersion}; current ${current.schemaVersion})`,
    )
  }
  if (!isDeepStrictEqual(baseline.package, current.package)) {
    structuralErrors.push("package identity differs")
  }
  if (!isDeepStrictEqual(baseline.method, current.method)) {
    structuralErrors.push("measurement method differs")
  }
  if (!isDeepStrictEqual(baseline.excludedExports, current.excludedExports)) {
    structuralErrors.push("excluded export list differs")
  }
  if (baseline.measurements.length !== current.measurements.length) {
    structuralErrors.push(
      `measurement count differs (baseline ${baseline.measurements.length}; current ${current.measurements.length})`,
    )
  }

  const commonMeasurementCount = Math.min(baseline.measurements.length, current.measurements.length)
  for (let index = 0; index < commonMeasurementCount; index += 1) {
    const expected = baseline.measurements[index]
    const actual = current.measurements[index]
    const identityMatches = compareMeasurementIdentity(expected, actual, index, structuralErrors)
    if (!identityMatches) continue

    for (const metric of ["rawBytes", "gzipBytes"]) {
      const delta = actual[metric] - expected[metric]
      const tolerance = coldConsumerSizeTolerance(metric, expected[metric])
      if (Math.abs(delta) > tolerance) {
        sizeDeltas.push({
          exportKey: expected.exportKey,
          importPath: expected.importPath,
          symbol: expected.symbol,
          metric,
          baselineBytes: expected[metric],
          currentBytes: actual[metric],
          delta,
          tolerance,
        })
      }
    }
  }

  return {
    current: structuralErrors.length === 0 && sizeDeltas.length === 0,
    structuralErrors,
    sizeDeltas,
  }
}

export function validateColdConsumerReport(report, label = "report") {
  const errors = []
  if (!isRecord(report)) {
    return [`${label} must be a JSON object`]
  }

  validateExactKeys(
    report,
    ["schemaVersion", "package", "method", "excludedExports", "measurements"],
    label,
    errors,
  )
  if (report.schemaVersion !== REPORT_SCHEMA_VERSION) {
    errors.push(`${label}.schemaVersion must be ${REPORT_SCHEMA_VERSION}`)
  }

  validatePackage(report.package, `${label}.package`, errors)
  validateMethod(report.method, `${label}.method`, errors)
  validateStringArray(report.excludedExports, `${label}.excludedExports`, errors)
  validateMeasurements(report.measurements, `${label}.measurements`, errors)
  return errors
}

function markerPositions(content, marker) {
  if (typeof content !== "string") return []
  const positions = []
  let position = content.indexOf(marker)
  while (position !== -1) {
    positions.push(position)
    position = content.indexOf(marker, position + marker.length)
  }
  return positions
}

function compareMeasurementIdentity(baseline, current, index, errors) {
  let matches = true
  for (const field of [
    "exportKey",
    "importPath",
    "symbol",
    "platform",
    "packedPackageInputFiles",
  ]) {
    if (!isDeepStrictEqual(baseline[field], current[field])) {
      errors.push(
        `measurement ${index + 1} ${field} differs (baseline ${formatValue(baseline[field])}; current ${formatValue(current[field])})`,
      )
      matches = false
    }
  }
  return matches
}

function validatePackage(value, label, errors) {
  if (!validateExactKeys(value, ["name", "version"], label, errors)) return
  validateNonEmptyString(value.name, `${label}.name`, errors)
  validateNonEmptyString(value.version, `${label}.version`, errors)
}

function validateMethod(value, label, errors) {
  if (
    !validateExactKeys(
      value,
      [
        "artifact",
        "resolution",
        "bundler",
        "gzip",
        "externalizedRuntimePackages",
        "dependencyResolution",
        "note",
      ],
      label,
      errors,
    )
  ) {
    return
  }

  for (const field of ["artifact", "resolution", "dependencyResolution", "note"]) {
    validateNonEmptyString(value[field], `${label}.${field}`, errors)
  }
  validateBundler(value.bundler, `${label}.bundler`, errors)
  validateGzip(value.gzip, `${label}.gzip`, errors)
  validateStringArray(value.externalizedRuntimePackages, `${label}.externalizedRuntimePackages`, errors)
}

function validateBundler(value, label, errors) {
  if (!validateExactKeys(value, ["name", "version", "format", "minify", "treeShaking"], label, errors)) {
    return
  }
  for (const field of ["name", "version", "format"]) {
    validateNonEmptyString(value[field], `${label}.${field}`, errors)
  }
  for (const field of ["minify", "treeShaking"]) {
    if (typeof value[field] !== "boolean") errors.push(`${label}.${field} must be a boolean`)
  }
}

function validateGzip(value, label, errors) {
  if (!validateExactKeys(value, ["algorithm", "level"], label, errors)) return
  validateNonEmptyString(value.algorithm, `${label}.algorithm`, errors)
  if (!Number.isSafeInteger(value.level) || value.level < 0 || value.level > 9) {
    errors.push(`${label}.level must be an integer from 0 through 9`)
  }
}

function validateMeasurements(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`)
    return
  }

  const exportKeys = new Set()
  for (const [index, measurement] of value.entries()) {
    const measurementLabel = `${label}[${index}]`
    if (
      !validateExactKeys(
        measurement,
        [
          "exportKey",
          "importPath",
          "symbol",
          "platform",
          "rawBytes",
          "gzipBytes",
          "packedPackageInputFiles",
        ],
        measurementLabel,
        errors,
      )
    ) {
      continue
    }

    for (const field of ["exportKey", "importPath", "symbol", "platform"]) {
      validateNonEmptyString(measurement[field], `${measurementLabel}.${field}`, errors)
    }
    if (exportKeys.has(measurement.exportKey)) {
      errors.push(`${label} contains duplicate exportKey ${measurement.exportKey}`)
    }
    exportKeys.add(measurement.exportKey)
    validateByteCount(measurement.rawBytes, `${measurementLabel}.rawBytes`, errors)
    validateByteCount(measurement.gzipBytes, `${measurementLabel}.gzipBytes`, errors)
    if (!Number.isSafeInteger(measurement.packedPackageInputFiles) || measurement.packedPackageInputFiles < 1) {
      errors.push(`${measurementLabel}.packedPackageInputFiles must be a positive integer`)
    }
  }
}

function validateStringArray(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`)
    return
  }
  const values = new Set()
  for (const [index, item] of value.entries()) {
    validateNonEmptyString(item, `${label}[${index}]`, errors)
    if (values.has(item)) errors.push(`${label} contains duplicate value ${formatValue(item)}`)
    values.add(item)
  }
}

function validateExactKeys(value, expectedKeys, label, errors) {
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`)
    return false
  }
  const actualKeys = Object.keys(value)
  const missing = expectedKeys.filter((key) => !actualKeys.includes(key))
  const unexpected = actualKeys.filter((key) => !expectedKeys.includes(key))
  if (missing.length > 0) errors.push(`${label} is missing ${missing.join(", ")}`)
  if (unexpected.length > 0) errors.push(`${label} has unexpected ${unexpected.join(", ")}`)
  return missing.length === 0 && unexpected.length === 0
}

function validateNonEmptyString(value, label, errors) {
  if (typeof value !== "string" || value.length === 0) errors.push(`${label} must be a non-empty string`)
}

function validateByteCount(value, label, errors) {
  if (!Number.isSafeInteger(value) || value < 1) errors.push(`${label} must be a positive integer`)
}

function isRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value)
}

function formatValue(value) {
  return typeof value === "string" ? JSON.stringify(value) : String(value)
}

export async function measurePackedColdConsumerImports({ repoRoot = REPO_ROOT } = {}) {
  const rootPackage = readPackageJson(join(repoRoot, "package.json"))
  const caseErrors = validateNamedImportCases(rootPackage)
  if (caseErrors.length > 0) throw new Error(caseErrors.join("\n"))

  assertProductionBundles(repoRoot, rootPackage)

  const tempRoot = mkdtempSync(join(tmpdir(), "semiotic-cold-consumer-"))

  try {
    const tarball = packTarball(repoRoot, tempRoot)
    const consumerRoot = join(tempRoot, "consumer")
    const packageRoot = unpackConsumerPackage(tarball, consumerRoot)
    const packedPackage = readPackageJson(join(packageRoot, "package.json"))
    const packedCaseErrors = validateNamedImportCases(packedPackage)
    if (packedCaseErrors.length > 0) {
      throw new Error(`Packed package export validation failed:\n${packedCaseErrors.join("\n")}`)
    }

    materializeRuntimeDependencies({ repoRoot, consumerRoot, packageJson: packedPackage })

    const measurements = []
    for (const entry of NAMED_IMPORT_CASES) {
      measurements.push(await bundleNamedImport({ consumerRoot, entry }))
    }

    return reportForMeasurements(packedPackage, measurements)
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
}

function packTarball(repoRoot, destination) {
  const output = execFileSync(
    "npm",
    ["pack", "--json", "--ignore-scripts", "--pack-destination", destination],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, npm_config_cache: join(destination, "npm-cache") },
      stdio: ["ignore", "pipe", "pipe"],
    },
  )
  const packed = JSON.parse(output)
  const filename = packed?.[0]?.filename
  if (typeof filename !== "string" || filename.length === 0) {
    throw new Error("npm pack did not report a tarball filename")
  }
  const tarball = join(destination, filename)
  if (!existsSync(tarball)) throw new Error(`npm pack did not create ${tarball}`)
  return tarball
}

function assertProductionBundles(repoRoot, packageJson) {
  if (!existsSync(join(repoRoot, "dist"))) {
    throw new Error("Missing dist/. Run `npm run dist:prod` before measuring cold consumers.")
  }

  for (const exportKey of stableModuleExportKeys(packageJson)) {
    const exportEntry = packageJson.exports?.[exportKey]
    const importTarget =
      typeof exportEntry === "string"
        ? exportEntry
        : exportEntry?.import ?? exportEntry?.default
    if (typeof importTarget !== "string") {
      throw new Error(`Package export ${exportKey} has no ESM import target`)
    }
    const artifactPath = resolve(repoRoot, importTarget)
    if (!existsSync(artifactPath)) {
      throw new Error(`Missing ${importTarget}; run \`npm run dist:prod\` before measuring cold consumers.`)
    }
    if (readFileSync(artifactPath, "utf8").includes("sourceMappingURL=")) {
      throw new Error(
        `${importTarget} contains a source map reference; run \`npm run dist:prod\` before measuring cold consumers.`,
      )
    }
  }
}

function unpackConsumerPackage(tarball, consumerRoot) {
  const packageRoot = join(consumerRoot, "node_modules", "semiotic")
  mkdirSync(packageRoot, { recursive: true })
  execFileSync("tar", ["-xzf", tarball, "-C", packageRoot, "--strip-components=1"], {
    stdio: "pipe",
  })
  return packageRoot
}

function materializeRuntimeDependencies({ repoRoot, consumerRoot, packageJson }) {
  const sourceNodeModules = join(repoRoot, "node_modules")
  const targetNodeModules = join(consumerRoot, "node_modules")
  const copied = new Set()

  const copyDependency = (packageName) => {
    if (copied.has(packageName)) return
    const source = join(sourceNodeModules, packageName)
    const target = join(targetNodeModules, packageName)
    if (!existsSync(source)) {
      throw new Error(
        `Missing installed runtime dependency ${packageName}; run npm install before measuring cold consumers.`,
      )
    }

    copied.add(packageName)
    cpSync(source, target, { recursive: true, dereference: true })

    const dependencyPackage = readPackageJson(join(source, "package.json"))
    for (const dependencyName of Object.keys(dependencyPackage.dependencies ?? {})) {
      copyDependency(dependencyName)
    }
  }

  for (const packageName of Object.keys(packageJson.dependencies ?? {})) {
    copyDependency(packageName)
  }
}

async function bundleNamedImport({ consumerRoot, entry }) {
  const importPath = importPathFor(entry.exportKey)
  const filename = entry.exportKey === "." ? "root" : entry.exportKey.slice(2).replaceAll("/", "-")
  const entryPath = join(consumerRoot, `${filename}.entry.mjs`)
  const outputPath = join(consumerRoot, `${filename}.bundle.mjs`)
  const localName = "coldConsumerNamedImport"

  writeFileSync(
    entryPath,
    `import { ${entry.symbol} as ${localName} } from ${JSON.stringify(importPath)}\nexport { ${localName} }\n`,
  )

  const result = await build({
    absWorkingDir: consumerRoot,
    bundle: true,
    entryPoints: [entryPath],
    external: EXTERNAL_RUNTIME_PACKAGES,
    format: "esm",
    legalComments: "none",
    logLevel: "silent",
    metafile: true,
    minify: true,
    outfile: outputPath,
    platform: entry.platform,
    sourcemap: false,
    target: entry.platform === "node" ? "node22" : "es2022",
    treeShaking: true,
  })

  const packageInputs = Object.keys(result.metafile.inputs).filter((input) =>
    input.replaceAll("\\", "/").includes("node_modules/semiotic/"),
  )
  if (packageInputs.length === 0) {
    throw new Error(`${importPath} did not resolve from the packed semiotic package`)
  }

  const output = readFileSync(outputPath)
  return {
    exportKey: entry.exportKey,
    importPath,
    symbol: entry.symbol,
    platform: entry.platform,
    rawBytes: output.length,
    gzipBytes: gzipSync(output, { level: zlibConstants.Z_BEST_COMPRESSION }).length,
    packedPackageInputFiles: packageInputs.length,
  }
}

function readPackageJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"))
}
