/**
 * Versioned, local-only machine baseline collection and comparison.
 *
 * The command intentionally does not build artifacts. A baseline is evidence
 * about supplied build output, not a side effect of an implicit rebuild. Its
 * caller must provide a checkout with dist/, ai/dist/, and docs/build/ ready.
 */
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import os from "node:os"
import { basename, dirname, extname, join, relative, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { gzipSync } from "node:zlib"

const __dirname = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(__dirname, "../..")
export const MACHINE_BASELINE_SCHEMA_VERSION = 1
export const MACHINE_BASELINE_PATH = join(REPO_ROOT, "benchmarks/setup/machine-baseline.json")

const RUNNER_PATH = join(REPO_ROOT, "scripts/machine-baseline-runner.mjs")
const TIMING_SAMPLE_COUNT = 7
const PARSE_SAMPLE_COUNT = 15
const SSR_SAMPLE_COUNT = 15
const SSR_WARMUP_COUNT = 2
const MCP_SAMPLE_COUNT = 5
const MAX_COMMAND_OUTPUT = 8 * 1024 * 1024

const PARSE_TARGETS = [
  { id: "xy", path: "dist/xy.module.min.js" },
  { id: "server-edge", path: "dist/semiotic-server-edge.module.min.js" },
  { id: "ai-core", path: "dist/semiotic-ai-core.module.min.js" },
]

const EVALUATION_TARGETS = [
  { id: "xy", specifier: "semiotic/xy" },
  { id: "server-edge", specifier: "semiotic/server/edge" },
  { id: "ai-core", specifier: "semiotic/ai/core" },
]

const WORKER_TARGETS = [
  { id: "force-layout", path: "dist/forceLayoutWorker.js" },
  { id: "physics", path: "dist/physicsWorker.js" },
]

export const DEFAULT_VARIANCE_POLICY = {
  staticArtifacts: {
    comparison: "exact",
    allowedVariance: 0,
    explanation: "Packed inventory, artifact bytes, deterministic SSR output, docs payload totals, and MCP public tool count must match exactly.",
  },
  timing: {
    statistic: "p50 elapsed milliseconds",
    reportStatistics: ["min", "p50", "p95", "p99", "max", "mean"],
    samplePolicy: {
      freshProcessImports: TIMING_SAMPLE_COUNT,
      parserIterations: PARSE_SAMPLE_COUNT,
      ssrWarmupRenders: SSR_WARMUP_COUNT,
      ssrTimedRenders: SSR_SAMPLE_COUNT,
      workerStarts: TIMING_SAMPLE_COUNT,
      mcpStdioStarts: MCP_SAMPLE_COUNT,
    },
    maxRegression: {
      absoluteMs: 25,
      relativePercent: 50,
    },
    environmentRule: "Timing is enforced only when platform, architecture, Node major.minor, CPU model, and logical CPU count match the recorded reference environment. Other hosts report timings but do not fail this local check.",
    tailPolicy: "p95 and p99 are recorded for diagnosis and are not independent pass/fail thresholds until a controlled runner is selected.",
  },
}

function commandFailure(command, args, result) {
  const output = [result.stdout, result.stderr, result.error && result.error.message]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join("\n")
  return new Error(command + " " + args.join(" ") + " failed" + (output ? ":\n" + output : ""))
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || REPO_ROOT,
    encoding: "utf8",
    env: { ...process.env, ...(options.env || {}) },
    maxBuffer: MAX_COMMAND_OUTPUT,
  })
  if (result.error || result.status !== 0) throw commandFailure(command, args, result)
  return String(result.stdout || "")
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm"
}

function assertFile(path, description) {
  if (!existsSync(path)) throw new Error("Missing " + description + ": " + path)
}

function hashFile(path, algorithm, encoding) {
  return createHash(algorithm).update(readFileSync(path)).digest(encoding)
}

function normalizedPath(path) {
  return path.split("\\").join("/")
}

function walkFiles(root, current = root, files = []) {
  const entries = readdirSync(current, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))

  for (const entry of entries) {
    const absolutePath = join(current, entry.name)
    const relativePath = normalizedPath(relative(root, absolutePath))
    const details = lstatSync(absolutePath)
    if (details.isDirectory()) {
      walkFiles(root, absolutePath, files)
    } else if (details.isFile()) {
      files.push({
        path: relativePath,
        size: details.size,
        mode: details.mode & 0o777,
      })
    } else if (details.isSymbolicLink()) {
      files.push({
        path: relativePath,
        type: "symlink",
        target: readlinkSync(absolutePath),
        mode: details.mode & 0o777,
      })
    } else {
      throw new Error("Unsupported archive entry type at " + absolutePath)
    }
  }
  return files
}

function latestModification(root, filter = () => true, latest = { mtimeMs: -Infinity, path: "" }) {
  if (!existsSync(root)) return latest
  const details = lstatSync(root)
  if (details.isDirectory()) {
    for (const entry of readdirSync(root)) {
      if (entry === ".DS_Store" || entry === "node_modules") continue
      latestModification(join(root, entry), filter, latest)
    }
    return latest
  }
  if (filter(root) && details.mtimeMs > latest.mtimeMs) {
    latest.mtimeMs = details.mtimeMs
    latest.path = root
  }
  return latest
}

function isSourceFile(path) {
  return !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path)
}

function assertFreshOutput(outputRoot, inputRoots, label, buildCommand) {
  const output = latestModification(outputRoot)
  if (!Number.isFinite(output.mtimeMs)) {
    throw new Error("Missing " + label + " output at " + outputRoot + ". Run " + buildCommand + " before recording/checking this baseline.")
  }

  const input = { mtimeMs: -Infinity, path: "" }
  for (const root of inputRoots) latestModification(root, isSourceFile, input)
  if (input.mtimeMs > output.mtimeMs) {
    throw new Error(
      label + " output is older than its source input (" + input.path + "). " +
      "Run " + buildCommand + " before recording/checking this baseline; stale generated output is not accepted.",
    )
  }
}

function assertCheckoutArtifactsFresh(repoRoot) {
  assertFreshOutput(
    join(repoRoot, "dist"),
    [
      join(repoRoot, "src"),
      join(repoRoot, "scripts/build.mjs"),
      join(repoRoot, "vite.shared.mjs"),
    ],
    "dist",
    "npm run dist",
  )
  assertFreshOutput(
    join(repoRoot, "ai/dist"),
    [
      join(repoRoot, "ai"),
      join(repoRoot, "scripts/build-mcp.mjs"),
    ],
    "MCP bundle",
    "npm run build:mcp",
  )
}

function createCheckoutTarball(repoRoot, tempRoot) {
  const packDirectory = join(tempRoot, "pack")
  const npmCache = join(tempRoot, "npm-cache")
  mkdirSync(packDirectory, { recursive: true })
  mkdirSync(npmCache, { recursive: true })
  run(npmCommand(), [
    "pack",
    "--json",
    "--silent",
    "--ignore-scripts",
    "--pack-destination",
    packDirectory,
  ], {
    cwd: repoRoot,
    env: { NPM_CONFIG_CACHE: npmCache },
  })
  const archiveName = readdirSync(packDirectory)
    .filter((name) => name.endsWith(".tgz"))
    .sort()[0]
  if (!archiveName) throw new Error("npm pack did not create a .tgz archive")
  return join(packDirectory, archiveName)
}

function inspectTarball(tarballPath, tempRoot) {
  const extractionRoot = join(tempRoot, "archive")
  mkdirSync(extractionRoot, { recursive: true })
  run("tar", ["-xzf", tarballPath, "-C", extractionRoot])

  const packageRoot = join(extractionRoot, "package")
  assertFile(packageRoot, "package root after extracting " + basename(tarballPath))
  const packageJsonPath = join(packageRoot, "package.json")
  assertFile(packageJsonPath, "packed package.json")

  const files = walkFiles(packageRoot)
  const archiveStats = statSync(tarballPath)
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"))
  const unpackedBytes = files.reduce((total, file) => total + (file.size || 0), 0)

  return {
    packageRoot,
    packageJson,
    inventory: {
      method: "npm pack --ignore-scripts followed by tar -xzf inspection",
      package: {
        name: packageJson.name,
        version: packageJson.version,
      },
      archive: {
        fileName: basename(tarballPath),
        bytes: archiveStats.size,
        sha1: hashFile(tarballPath, "sha1", "hex"),
        integrity: "sha512-" + hashFile(tarballPath, "sha512", "base64"),
      },
      unpacked: {
        bytes: unpackedBytes,
        fileCount: files.length,
      },
      files,
    },
  }
}

function linkDirectory(source, target) {
  symlinkSync(source, target, process.platform === "win32" ? "junction" : "dir")
}

function createPackedConsumer(repoRoot, tempRoot, packageRoot) {
  const workspaceNodeModules = join(repoRoot, "node_modules")
  assertFile(workspaceNodeModules, "workspace node_modules")

  const linkedNodeModules = join(tempRoot, "node_modules")
  mkdirSync(linkedNodeModules, { recursive: true })

  for (const entry of readdirSync(workspaceNodeModules).sort()) {
    if (entry === ".bin" || entry === "semiotic") continue
    const source = join(workspaceNodeModules, entry)
    const details = lstatSync(source)
    if (!details.isDirectory() && !details.isSymbolicLink()) continue
    linkDirectory(source, join(linkedNodeModules, entry))
  }
  linkDirectory(packageRoot, join(linkedNodeModules, "semiotic"))

  const consumerRoot = join(tempRoot, "consumer")
  const consumerModules = join(consumerRoot, "node_modules")
  mkdirSync(consumerModules, { recursive: true })
  linkDirectory(packageRoot, join(consumerModules, "semiotic"))
  return consumerRoot
}

function parseRunnerOutput(output, label) {
  const lines = String(output)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index])
    } catch {
      // The runner should only emit JSON, but use the final valid line so
      // an incidental runtime warning never corrupts an otherwise valid run.
    }
  }
  throw new Error(label + " did not emit a JSON result: " + String(output).slice(-1000))
}

function runRunner(mode, options) {
  assertFile(RUNNER_PATH, "machine baseline runner")
  const nodeArgs = ["--no-warnings"]
  if (options.experimentalVmModules) nodeArgs.push("--experimental-vm-modules")
  nodeArgs.push(RUNNER_PATH, mode)
  const output = run(process.execPath, nodeArgs, {
    cwd: options.cwd,
    env: options.env,
  })
  return parseRunnerOutput(output, "machine baseline " + mode + " runner")
}

function finiteNumber(value, label) {
  if (!Number.isFinite(value)) throw new Error(label + " must be a finite number")
  return value
}

function roundMilliseconds(value) {
  return Number(finiteNumber(value, "timing sample").toFixed(3))
}

function percentile(sorted, proportion) {
  if (sorted.length === 0) return 0
  const position = (sorted.length - 1) * proportion
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

export function summarizeTimingSamples(samples) {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("Timing samples must be a non-empty array")
  }
  const raw = samples.map((sample, index) => finiteNumber(sample, "timing sample " + index))
  const sorted = [...raw].sort((left, right) => left - right)
  const mean = raw.reduce((total, value) => total + value, 0) / raw.length
  return {
    samplesMs: raw.map(roundMilliseconds),
    minMs: roundMilliseconds(sorted[0]),
    p50Ms: roundMilliseconds(percentile(sorted, 0.5)),
    p95Ms: roundMilliseconds(percentile(sorted, 0.95)),
    p99Ms: roundMilliseconds(percentile(sorted, 0.99)),
    maxMs: roundMilliseconds(sorted[sorted.length - 1]),
    meanMs: roundMilliseconds(mean),
  }
}

function allEqual(values, label) {
  if (values.length === 0) throw new Error(label + " had no samples")
  if (new Set(values).size !== 1) {
    throw new Error(label + " changed between runs: " + values.join(", "))
  }
  return values[0]
}

function collectParserMetrics(packageRoot, consumerRoot) {
  return PARSE_TARGETS.map((target) => {
    const sourcePath = join(packageRoot, target.path)
    assertFile(sourcePath, "packed parser target " + target.path)
    const result = runRunner("parse", {
      cwd: consumerRoot,
      experimentalVmModules: true,
      env: {
        SEMIOTIC_MACHINE_BASELINE_TARGET: sourcePath,
        SEMIOTIC_MACHINE_BASELINE_SAMPLES: String(PARSE_SAMPLE_COUNT),
      },
    })
    return {
      id: target.id,
      path: target.path,
      sourceBytes: result.sourceBytes,
      timing: summarizeTimingSamples(result.samplesMs),
    }
  })
}

function collectEvaluationMetrics(consumerRoot) {
  return EVALUATION_TARGETS.map((target) => {
    const results = []
    for (let index = 0; index < TIMING_SAMPLE_COUNT; index += 1) {
      results.push(runRunner("evaluate", {
        cwd: consumerRoot,
        env: {
          SEMIOTIC_MACHINE_BASELINE_SPECIFIER: target.specifier,
        },
      }))
    }
    return {
      id: target.id,
      specifier: target.specifier,
      exportCount: allEqual(results.map((result) => result.exportCount), target.specifier + " export count"),
      timing: summarizeTimingSamples(results.map((result) => result.elapsedMs)),
    }
  })
}

function collectSsrMetric(consumerRoot) {
  const result = runRunner("ssr", {
    cwd: consumerRoot,
    env: {
      SEMIOTIC_MACHINE_BASELINE_SAMPLES: String(SSR_SAMPLE_COUNT),
      SEMIOTIC_MACHINE_BASELINE_WARMUPS: String(SSR_WARMUP_COUNT),
    },
  })
  return {
    fixture: {
      component: "LineChart",
      rows: 500,
      dimensions: [640, 360],
      renderer: "semiotic/server/edge renderChart",
    },
    svgBytes: result.svgBytes,
    svgSha256: result.svgSha256,
    timing: summarizeTimingSamples(result.samplesMs),
  }
}

function writeWorkerWrapper(tempRoot) {
  const wrapperPath = join(tempRoot, "worker-ready-wrapper.mjs")
  const source = [
    'import { parentPort, workerData } from "node:worker_threads"',
    "globalThis.self = globalThis",
    "globalThis.postMessage = () => {}",
    "await import(workerData.target)",
    'parentPort.postMessage({ type: "ready" })',
    "",
  ].join("\n")
  // This file is inside the command's temporary directory. It emulates only
  // the two browser-worker globals used during module initialization.
  writeFileSync(wrapperPath, source)
  return wrapperPath
}

function collectWorkerMetrics(packageRoot, consumerRoot, tempRoot) {
  const wrapperPath = writeWorkerWrapper(tempRoot)
  return WORKER_TARGETS.map((target) => {
    const workerPath = join(packageRoot, target.path)
    assertFile(workerPath, "packed worker target " + target.path)
    const result = runRunner("worker", {
      cwd: consumerRoot,
      env: {
        SEMIOTIC_MACHINE_BASELINE_TARGET: pathToFileURL(workerPath).href,
        SEMIOTIC_MACHINE_BASELINE_WORKER_WRAPPER: wrapperPath,
        SEMIOTIC_MACHINE_BASELINE_SAMPLES: String(TIMING_SAMPLE_COUNT),
      },
    })
    return {
      id: target.id,
      path: target.path,
      sourceBytes: statSync(workerPath).size,
      timing: summarizeTimingSamples(result.samplesMs),
    }
  })
}

function emptyPayloadGroup() {
  return { fileCount: 0, rawBytes: 0, gzipBytes: 0 }
}

function payloadGroup(path) {
  const extension = extname(path).toLowerCase()
  if (extension === ".js" || extension === ".mjs") return "javascript"
  if (extension === ".css") return "stylesheet"
  if (extension === ".html") return "html"
  return "other"
}

function collectDocsPayload(repoRoot) {
  const docsBuildRoot = join(repoRoot, "docs/build")
  assertFreshOutput(
    docsBuildRoot,
    [
      join(repoRoot, "docs/src"),
      join(repoRoot, "docs/public"),
      join(repoRoot, "src"),
      join(repoRoot, "vite.docs.config.mjs"),
      join(repoRoot, "vite.shared.mjs"),
    ],
    "docs/build",
    "npm run build",
  )
  const groups = {
    javascript: emptyPayloadGroup(),
    stylesheet: emptyPayloadGroup(),
    html: emptyPayloadGroup(),
    other: emptyPayloadGroup(),
  }
  const files = walkFiles(docsBuildRoot)
  for (const file of files) {
    if (!("size" in file)) continue
    const contents = readFileSync(join(docsBuildRoot, file.path))
    const group = groups[payloadGroup(file.path)]
    group.fileCount += 1
    group.rawBytes += contents.length
    group.gzipBytes += gzipSync(contents, { level: 9 }).length
  }
  return {
    root: "docs/build",
    compression: "gzip level 9 applied independently to each emitted file",
    total: Object.values(groups).reduce((total, group) => ({
      fileCount: total.fileCount + group.fileCount,
      rawBytes: total.rawBytes + group.rawBytes,
      gzipBytes: total.gzipBytes + group.gzipBytes,
    }), emptyPayloadGroup()),
    groups,
  }
}

function collectMcpMetrics(packageRoot, consumerRoot) {
  const mcpServerPath = join(packageRoot, "ai/dist/mcp-server.js")
  assertFile(mcpServerPath, "packed MCP server")
  const results = []
  for (let index = 0; index < MCP_SAMPLE_COUNT; index += 1) {
    results.push(runRunner("mcp", {
      cwd: consumerRoot,
      env: {
        SEMIOTIC_MACHINE_BASELINE_MCP_SERVER: mcpServerPath,
        SEMIOTIC_MACHINE_BASELINE_MCP_CWD: packageRoot,
        SEMIOTIC_MACHINE_BASELINE_TIMEOUT_MS: "10000",
      },
    }))
  }
  return {
    entry: {
      path: "ai/dist/mcp-server.js",
      sourceBytes: statSync(mcpServerPath).size,
    },
    profile: "public",
    protocolVersion: allEqual(results.map((result) => String(result.protocolVersion)), "MCP protocol version"),
    toolCount: allEqual(results.map((result) => result.toolCount), "MCP public tool count"),
    initialize: {
      timing: summarizeTimingSamples(results.map((result) => result.initializeMs)),
    },
    toolsList: {
      timing: summarizeTimingSamples(results.map((result) => result.toolsListMs)),
    },
  }
}

function gitCommit(repoRoot) {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
  return result.status === 0 ? String(result.stdout).trim() : "unknown"
}

function worktreeState(repoRoot) {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
  if (result.status !== 0) return { state: "unknown", changedPathCount: null }
  const changedPathCount = String(result.stdout)
    .split(/\r?\n/)
    .filter(Boolean)
    .length
  return {
    state: changedPathCount === 0 ? "clean" : "dirty",
    changedPathCount,
  }
}

function npmVersion(repoRoot) {
  const result = spawnSync(npmCommand(), ["--version"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
  return result.status === 0 ? String(result.stdout).trim() : "unknown"
}

export function captureReferenceEnvironment(repoRoot = REPO_ROOT) {
  const cpus = os.cpus()
  const cpuModel = cpus[0] ? cpus[0].model : "unknown"
  return {
    runtime: {
      node: process.version,
      nodeMajorMinor: process.versions.node.split(".").slice(0, 2).join("."),
      v8: process.versions.v8,
      npm: npmVersion(repoRoot),
    },
    host: {
      platform: process.platform,
      arch: process.arch,
      osRelease: os.release(),
      cpuModel,
      logicalCpuCount: cpus.length,
      totalMemoryBytes: os.totalmem(),
    },
    timingFingerprint: {
      platform: process.platform,
      arch: process.arch,
      nodeMajorMinor: process.versions.node.split(".").slice(0, 2).join("."),
      cpuModel,
      logicalCpuCount: cpus.length,
    },
  }
}

export async function collectMachineBaseline(options = {}) {
  const repoRoot = resolve(options.repoRoot || REPO_ROOT)
  const tempRoot = mkdtempSync(join(os.tmpdir(), "semiotic-machine-baseline-"))
  try {
    const suppliedTarball = options.tarball ? resolve(repoRoot, options.tarball) : null
    if (suppliedTarball) assertFile(suppliedTarball, "supplied tarball")
    if (!suppliedTarball) assertCheckoutArtifactsFresh(repoRoot)
    const tarballPath = suppliedTarball || createCheckoutTarball(repoRoot, tempRoot)
    const inspected = inspectTarball(tarballPath, tempRoot)
    const consumerRoot = createPackedConsumer(repoRoot, tempRoot, inspected.packageRoot)
    const referenceEnvironment = captureReferenceEnvironment(repoRoot)

    return {
      schemaVersion: MACHINE_BASELINE_SCHEMA_VERSION,
      baselineKind: "semiotic-machine-baseline",
      capturedAt: new Date().toISOString(),
      source: {
        gitCommit: gitCommit(repoRoot),
        artifact: suppliedTarball ? "supplied tarball" : "checkout npm pack --ignore-scripts",
        worktree: worktreeState(repoRoot),
      },
      referenceEnvironment,
      variancePolicy: DEFAULT_VARIANCE_POLICY,
      coverage: {
        included: [
          "npm-pack tarball archive hashes and complete packed-file inventory",
          "V8 parse-only timings for packed XY, edge-server, and AI-core ESM entries",
          "fresh-process packed import evaluation for the same public entry points",
          "deterministic edge SSR LineChart fixture timing and SVG hash",
          "packed force-layout and physics worker module startup under a documented Node shim",
          "aggregate emitted docs/build payload inventory and per-file gzip totals",
          "local public-profile MCP stdio initialize and tools/list round trips",
        ],
        externalOrDeferred: [
          "Browser canvas/SVG interaction, hydration, paint, frame-budget, and real browser Worker/OffscreenCanvas timing",
          "Browser heap, GC, memory-soak, and native optional-dependency installation measurements",
          "Route-level docs transfer waterfalls, Core Web Vitals, Lighthouse, and a real browser cache profile",
          "MCP HTTP transport, authentication/CORS/proxy behavior, deployed cold starts, concurrency, and hosted latency",
          "Registry publication, provenance/attestation verification, deployment image size, and Cloud Run lockfile evidence",
          "Cross-bundler parse/evaluation (Vite/Rollup, webpack/Next), shared-dependency incremental imports, and non-reference hardware",
        ],
      },
      methods: {
        tarballInventory: "Pack without lifecycle scripts, inspect the resulting archive, and record every packed path/size/mode plus archive hashes.",
        parser: "V8 vm.SourceTextModule parse-only timing for three packed ESM entry files; dependency linking/evaluation is intentionally excluded.",
        evaluation: "Fresh Node processes import packed public ESM entry points through a temporary consumer whose runtime dependencies are linked from the lockfile-installed workspace.",
        ssr: "Warm repeated edge-safe renderChart LineChart fixture, measured after module import; SVG byte length and SHA-256 prove deterministic output.",
        workers: "Fresh Node worker_threads startup of packed browser workers after a minimal self/postMessage shim; this measures module startup, not browser Worker or OffscreenCanvas behavior.",
        docs: "Read-only aggregate emitted docs/build payload inventory; gzip is calculated per emitted file and is not a route-level browser transfer waterfall.",
        mcp: "Fresh local stdio public-profile initialize and tools/list round trips; no HTTP listener, deployment, authentication, or external service is involved.",
      },
      metrics: {
        tarball: inspected.inventory,
        parser: collectParserMetrics(inspected.packageRoot, consumerRoot),
        evaluation: collectEvaluationMetrics(consumerRoot),
        ssr: collectSsrMetric(consumerRoot),
        workers: collectWorkerMetrics(inspected.packageRoot, consumerRoot, tempRoot),
        docs: collectDocsPayload(repoRoot),
        mcp: collectMcpMetrics(inspected.packageRoot, consumerRoot),
      },
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function compactValue(value) {
  const serialized = JSON.stringify(value)
  return serialized && serialized.length > 180 ? serialized.slice(0, 177) + "..." : serialized
}

export function findDifferences(expected, actual, path = "", differences = [], limit = 30) {
  if (differences.length >= limit) return differences
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      differences.push(path + ": expected " + compactValue(expected) + ", received " + compactValue(actual))
      return differences
    }
    if (expected.length !== actual.length) {
      differences.push(path + ".length: expected " + expected.length + ", received " + actual.length)
    }
    const count = Math.min(expected.length, actual.length)
    for (let index = 0; index < count && differences.length < limit; index += 1) {
      findDifferences(expected[index], actual[index], path + "[" + index + "]", differences, limit)
    }
    return differences
  }
  if (isObject(expected) || isObject(actual)) {
    if (!isObject(expected) || !isObject(actual)) {
      differences.push(path + ": expected " + compactValue(expected) + ", received " + compactValue(actual))
      return differences
    }
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort()
    for (const key of keys) {
      if (differences.length >= limit) break
      const childPath = path ? path + "." + key : key
      findDifferences(expected[key], actual[key], childPath, differences, limit)
    }
    return differences
  }
  if (!Object.is(expected, actual)) {
    differences.push(path + ": expected " + compactValue(expected) + ", received " + compactValue(actual))
  }
  return differences
}

function staticProjection(manifest) {
  const metrics = manifest.metrics
  return {
    schemaVersion: manifest.schemaVersion,
    baselineKind: manifest.baselineKind,
    variancePolicy: manifest.variancePolicy,
    coverage: manifest.coverage,
    methods: manifest.methods,
    tarball: metrics.tarball,
    parser: metrics.parser.map(({ timing, ...metric }) => metric),
    evaluation: metrics.evaluation.map(({ timing, ...metric }) => metric),
    ssr: {
      fixture: metrics.ssr.fixture,
      svgBytes: metrics.ssr.svgBytes,
      svgSha256: metrics.ssr.svgSha256,
    },
    workers: metrics.workers.map(({ timing, ...metric }) => metric),
    docs: metrics.docs,
    mcp: {
      entry: metrics.mcp.entry,
      profile: metrics.mcp.profile,
      protocolVersion: metrics.mcp.protocolVersion,
      toolCount: metrics.mcp.toolCount,
    },
  }
}

function timingRows(metrics) {
  return [
    ...metrics.parser.map((metric) => ({ id: "parser:" + metric.id, timing: metric.timing })),
    ...metrics.evaluation.map((metric) => ({ id: "evaluation:" + metric.id, timing: metric.timing })),
    { id: "ssr:line-chart", timing: metrics.ssr.timing },
    ...metrics.workers.map((metric) => ({ id: "worker:" + metric.id, timing: metric.timing })),
    { id: "mcp:initialize", timing: metrics.mcp.initialize.timing },
    { id: "mcp:tools-list", timing: metrics.mcp.toolsList.timing },
  ]
}

export function timingEnvironmentMatch(reference, current) {
  const expected = reference && reference.timingFingerprint
  const actual = current && current.timingFingerprint
  if (!expected || !actual) {
    return { compatible: false, reasons: ["missing timing fingerprint"] }
  }
  const keys = ["platform", "arch", "nodeMajorMinor", "cpuModel", "logicalCpuCount"]
  const reasons = keys
    .filter((key) => expected[key] !== actual[key])
    .map((key) => key + " expected " + expected[key] + ", received " + actual[key])
  return { compatible: reasons.length === 0, reasons }
}

export function validateMachineBaseline(manifest) {
  const errors = []
  if (!isObject(manifest)) return ["baseline must be an object"]
  if (manifest.schemaVersion !== MACHINE_BASELINE_SCHEMA_VERSION) {
    errors.push("schemaVersion must equal " + MACHINE_BASELINE_SCHEMA_VERSION)
  }
  if (manifest.baselineKind !== "semiotic-machine-baseline") {
    errors.push("baselineKind must equal semiotic-machine-baseline")
  }
  if (!isObject(manifest.referenceEnvironment) || !isObject(manifest.referenceEnvironment.timingFingerprint)) {
    errors.push("referenceEnvironment.timingFingerprint is required")
  }
  if (!isObject(manifest.variancePolicy) || !isObject(manifest.variancePolicy.timing)) {
    errors.push("variancePolicy.timing is required")
  }
  const metrics = manifest.metrics
  if (!isObject(metrics)) {
    errors.push("metrics is required")
    return errors
  }
  if (!isObject(metrics.tarball) || !Array.isArray(metrics.tarball.files) || metrics.tarball.files.length === 0) {
    errors.push("metrics.tarball.files must be a non-empty array")
  }
  for (const key of ["parser", "evaluation", "workers"]) {
    if (!Array.isArray(metrics[key]) || metrics[key].length === 0) {
      errors.push("metrics." + key + " must be a non-empty array")
    }
  }
  if (!isObject(metrics.ssr) || !isObject(metrics.ssr.timing)) errors.push("metrics.ssr.timing is required")
  if (!isObject(metrics.docs) || !isObject(metrics.docs.total)) errors.push("metrics.docs.total is required")
  if (!isObject(metrics.mcp) || !isObject(metrics.mcp.initialize) || !isObject(metrics.mcp.toolsList)) {
    errors.push("metrics.mcp initialize/toolsList measurements are required")
  }

  if (errors.length > 0) return errors
  let rows
  try {
    rows = timingRows(metrics)
  } catch (error) {
    errors.push("could not read timing metrics: " + error.message)
    return errors
  }
  for (const row of rows) {
    if (!isObject(row.timing) || !Array.isArray(row.timing.samplesMs) || row.timing.samplesMs.length === 0) {
      errors.push(row.id + " has no timing samples")
      continue
    }
    for (const key of ["minMs", "p50Ms", "p95Ms", "p99Ms", "maxMs", "meanMs"]) {
      if (!Number.isFinite(row.timing[key])) errors.push(row.id + " has non-finite " + key)
    }
  }
  return errors
}

export function compareMachineBaselines(baseline, current) {
  const baselineErrors = validateMachineBaseline(baseline)
  const currentErrors = validateMachineBaseline(current)
  const structuralDifferences = [
    ...baselineErrors.map((error) => "baseline: " + error),
    ...currentErrors.map((error) => "current: " + error),
  ]
  if (baselineErrors.length === 0 && currentErrors.length === 0) {
    findDifferences(staticProjection(baseline), staticProjection(current), "baseline", structuralDifferences)
  }

  const environment = timingEnvironmentMatch(baseline.referenceEnvironment, current.referenceEnvironment)
  const timingRegressions = []
  const timingWarnings = []
  if (environment.compatible && baselineErrors.length === 0 && currentErrors.length === 0) {
    const baselineRows = new Map(timingRows(baseline.metrics).map((row) => [row.id, row.timing]))
    const currentRows = new Map(timingRows(current.metrics).map((row) => [row.id, row.timing]))
    const membership = findDifferences([...baselineRows.keys()].sort(), [...currentRows.keys()].sort(), "timing rows")
    structuralDifferences.push(...membership)
    const maximum = baseline.variancePolicy.timing.maxRegression || DEFAULT_VARIANCE_POLICY.timing.maxRegression
    const absoluteMs = Number(maximum.absoluteMs)
    const relativePercent = Number(maximum.relativePercent)
    for (const [id, baselineTiming] of baselineRows) {
      const currentTiming = currentRows.get(id)
      if (!currentTiming) continue
      const allowance = Math.max(absoluteMs, baselineTiming.p50Ms * (relativePercent / 100))
      const limit = baselineTiming.p50Ms + allowance
      if (currentTiming.p50Ms > limit) {
        timingRegressions.push({
          id,
          baselineP50Ms: baselineTiming.p50Ms,
          currentP50Ms: currentTiming.p50Ms,
          limitMs: roundMilliseconds(limit),
        })
      }
      if (currentTiming.p95Ms > baselineTiming.p95Ms + allowance) {
        timingWarnings.push({
          id,
          baselineP95Ms: baselineTiming.p95Ms,
          currentP95Ms: currentTiming.p95Ms,
        })
      }
    }
  }
  return {
    structuralDifferences,
    timingEnvironment: environment,
    timingRegressions,
    timingWarnings,
    ok: structuralDifferences.length === 0 && timingRegressions.length === 0,
  }
}
