/**
 * Controlled, local Chromium baseline for the emitted browser artifacts.
 *
 * This deliberately measures only the work we can reproduce in a checkout:
 * a hydrateRoot commit, Canvas2D content becoming readable after initial and
 * retained-data updates, and one real module Worker round trip. It is not a
 * substitute for browser heap/GC soak, a route waterfall, MCP HTTP, or a
 * deployed cold-start measurement.
 */
import { spawn, spawnSync } from "node:child_process"
import { existsSync, lstatSync, readFileSync } from "node:fs"
import { createServer as createNetServer } from "node:net"
import { dirname, join, relative, resolve } from "node:path"
import { chromium } from "playwright"
import {
  captureReferenceEnvironment,
  findDifferences,
  REPO_ROOT,
  summarizeTimingSamples,
  timingEnvironmentMatch,
} from "./machine-baseline.mjs"

export const BROWSER_BASELINE_SCHEMA_VERSION = 1
export const BROWSER_BASELINE_PATH = join(REPO_ROOT, "benchmarks/setup/browser-baseline.json")

const BROWSER_SAMPLE_COUNT = 7
const BASELINE_TIMEOUT_MS = 20_000
const CONTEXT_OPTIONS = {
  viewport: { width: 800, height: 600 },
  deviceScaleFactor: 1,
  colorScheme: "light",
  reducedMotion: "reduce",
  locale: "en-US",
  timezoneId: "UTC",
}

export const DEFAULT_BROWSER_VARIANCE_POLICY = {
  structural: {
    comparison: "exact",
    explanation: "The browser engine, fixed viewport/context, fixture shape, visible Canvas2D success, retained-data paint handoff, and force-worker response contract must stay stable.",
  },
  timing: {
    statistic: "p50 elapsed milliseconds",
    reportStatistics: ["min", "p50", "p95", "p99", "max", "mean"],
    samplePolicy: {
      freshBrowserContexts: BROWSER_SAMPLE_COUNT,
      fixture: "Each sample opens a fresh Chromium context and page; Vite startup, navigation/network transfer, and server transforms occur outside the in-page marks.",
    },
    maxRegression: {
      absoluteMs: 50,
      relativePercent: 100,
    },
    environmentRule: "Timing is enforced only when the recorded Node host fingerprint and Chromium version match. Other hosts still validate the complete browser rendering and Worker contract, then report timings without failing this local check.",
    tailPolicy: "p95 and p99 are diagnostic until a controlled browser runner is selected; p50 is the only timing threshold.",
  },
}

function finiteNumber(value, label) {
  if (!Number.isFinite(value)) throw new Error(label + " must be a finite number")
  return value
}

function rounded(value) {
  return Number(finiteNumber(value, "timing sample").toFixed(3))
}

function assertFreshDist(repoRoot) {
  // Read the emitted source maps instead of treating every source file as an
  // input. A Physics-only edit cannot stale the XY + force-worker browser
  // fixture, while a dependency actually bundled into either measured target
  // is still caught exactly.
  for (const outputPath of [
    join(repoRoot, "dist/xy.module.min.js"),
    join(repoRoot, "dist/forceLayoutWorker.js"),
  ]) {
    assertFreshMappedOutput(repoRoot, outputPath)
  }
}

function assertFreshMappedOutput(repoRoot, outputPath) {
  if (!existsSync(outputPath)) {
    throw new Error("Missing browser baseline artifact " + relative(repoRoot, outputPath) + ". Run npm run dist first.")
  }
  const sourceMapPath = outputPath + ".map"
  let mappedInputs = []
  let outputMtime = lstatSync(outputPath).mtimeMs
  if (existsSync(sourceMapPath)) {
    const sources = sourceMapSources(sourceMapPath)
    if (sources.length === 0) {
      throw new Error("Source map for " + relative(repoRoot, outputPath) + " has no input sources")
    }
    outputMtime = Math.max(outputMtime, lstatSync(sourceMapPath).mtimeMs)
    mappedInputs = sources
      .map((source) => resolve(dirname(sourceMapPath), source))
      .filter(existsSync)
  } else {
    // Worker bundles intentionally omit source maps to avoid publishing a
    // second large artifact. The non-minified local dist build preserves tsup
    // module banners, which give us the same exact dependency list for the
    // read-only baseline freshness check.
    const source = readFileSync(outputPath, "utf8")
    mappedInputs = [...source.matchAll(/^\/\/ (src\/[^\s]+)$/gm)]
      .map((match) => resolve(repoRoot, match[1]))
      .filter(existsSync)
    if (mappedInputs.length === 0) {
      throw new Error(
        "Could not discover source inputs for " + relative(repoRoot, outputPath) + ". " +
        "Run npm run dist (the non-minified local build records module banners) before recording or checking this baseline.",
      )
    }
  }

  const buildInputs = [
    join(repoRoot, "scripts/build.mjs"),
    join(repoRoot, "vite.shared.mjs"),
  ]
  const inputs = [...buildInputs.filter(existsSync), ...mappedInputs]
  let newest = { mtimeMs: -Infinity, path: "" }
  for (const input of inputs) {
    const mtimeMs = lstatSync(input).mtimeMs
    if (mtimeMs > newest.mtimeMs) newest = { mtimeMs, path: input }
  }
  if (newest.mtimeMs > outputMtime) {
    throw new Error(
      relative(repoRoot, outputPath) + " is older than its browser baseline input (" + relative(repoRoot, newest.path) + "). " +
      "Run npm run dist before recording or checking this baseline.",
    )
  }
}

function sourceMapSources(sourceMapPath) {
  // tsup emits sourcesContent after the compact sources array. Parsing the
  // entire map needlessly retains every bundled source just before Chromium is
  // launched, so parse only the small source-path JSON fragment instead.
  const text = readFileSync(sourceMapPath, "utf8")
  const match = /"sources"\s*:\s*(\[[\s\S]*?\])\s*,\s*"sourcesContent"\s*:/.exec(text)
  if (!match) throw new Error("Could not read sources from " + sourceMapPath)
  try {
    const sources = JSON.parse(match[1])
    return Array.isArray(sources) ? sources : []
  } catch (error) {
    throw new Error("Could not parse sources in " + sourceMapPath + ": " + error.message)
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
  const changedPathCount = String(result.stdout).split(/\r?\n/).filter(Boolean).length
  return { state: changedPathCount === 0 ? "clean" : "dirty", changedPathCount }
}

function allEqual(values, label) {
  if (values.length === 0) throw new Error(label + " had no samples")
  if (new Set(values).size !== 1) {
    throw new Error(label + " changed between browser samples: " + values.join(", "))
  }
  return values[0]
}

function assertHarnessResult(result, sampleIndex) {
  if (!result || result.status !== "complete") {
    throw new Error("Browser baseline fixture sample " + sampleIndex + " did not complete: " + (result?.error || "unknown error"))
  }
  const metrics = result.metrics
  if (!metrics || typeof metrics !== "object") {
    throw new Error("Browser baseline fixture sample " + sampleIndex + " returned no metrics")
  }
  for (const key of ["hydrationMs", "initialCanvasPaintMs", "updateCanvasPaintMs", "forceWorkerRoundTripMs"]) {
    finiteNumber(metrics[key], "browser fixture " + key)
  }
  for (const canvasKey of ["initialCanvas", "updatedCanvas"]) {
    const canvas = result[canvasKey]
    if (!canvas || canvas.canvasWidth <= 0 || canvas.canvasHeight <= 0 || canvas.paintedPixels <= 0 || !canvas.fingerprint) {
      throw new Error("Browser baseline fixture sample " + sampleIndex + " has no visible " + canvasKey)
    }
  }
  if (result.initialCanvas.fingerprint === result.updatedCanvas.fingerprint) {
    throw new Error("Browser baseline fixture sample " + sampleIndex + " did not observe a retained-data canvas update")
  }
  if (!result.worker || result.worker.positionCount <= 0 || !result.worker.positionFingerprint) {
    throw new Error("Browser baseline fixture sample " + sampleIndex + " returned no valid force-worker result")
  }
}

async function startIntegrationServer(repoRoot) {
  const port = await unusedLoopbackPort()
  const viteBin = join(repoRoot, "node_modules/vite/bin/vite.js")
  if (!existsSync(viteBin)) throw new Error("Missing local Vite binary for browser baseline")
  const child = spawn(process.execPath, [
    viteBin,
    "--config", resolve(repoRoot, "vite.integration.config.mjs"),
    "--mode", "production",
    "--host", "127.0.0.1",
    "--port", String(port),
    "--strictPort",
  ], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
  })
  let output = ""
  for (const stream of [child.stdout, child.stderr]) {
    stream?.setEncoding("utf8")
    stream?.on("data", (chunk) => {
      output = (output + chunk).slice(-4000)
    })
  }
  const url = "http://127.0.0.1:" + port + "/machine-baseline-examples/"
  try {
    await waitForLocalServer(url, child, () => output)
  } catch (error) {
    await stopIntegrationServer(child)
    throw error
  }
  return {
    child,
    url,
  }
}

function unusedLoopbackPort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        server.close()
        reject(new Error("Could not reserve a local browser-baseline port"))
        return
      }
      server.close((error) => {
        if (error) reject(error)
        else resolvePort(address.port)
      })
    })
  })
}

async function waitForLocalServer(url, child, output) {
  const deadline = Date.now() + BASELINE_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error("Local Vite browser-baseline server exited early (code " + child.exitCode + "): " + output())
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) })
      if (response.ok) return
    } catch {
      // The Vite child is still starting. Keep retrying until the deadline.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50))
  }
  throw new Error("Timed out starting the local Vite browser-baseline server: " + output())
}

async function stopIntegrationServer(child) {
  if (!child || child.exitCode !== null) return
  const exited = new Promise((resolveExit) => child.once("exit", resolveExit))
  child.kill("SIGTERM")
  await Promise.race([
    exited,
    new Promise((resolveDelay) => setTimeout(resolveDelay, 5_000)),
  ])
  if (child.exitCode === null) child.kill("SIGKILL")
}

async function collectFixtureSample(browser, url, sampleIndex) {
  const context = await browser.newContext(CONTEXT_OPTIONS)
  const page = await context.newPage()
  const pageErrors = []
  page.on("pageerror", (error) => pageErrors.push(error.message))
  try {
    await page.goto(url, { waitUntil: "load", timeout: BASELINE_TIMEOUT_MS })
    await page.waitForFunction(
      () => {
        const result = window.__semioticMachineBaseline
        return result?.status === "complete" || result?.status === "error"
      },
      undefined,
      { timeout: BASELINE_TIMEOUT_MS },
    )
    const result = await page.evaluate(() => window.__semioticMachineBaseline)
    if (pageErrors.length > 0) {
      throw new Error("Browser baseline fixture page error: " + pageErrors.join("; "))
    }
    assertHarnessResult(result, sampleIndex)
    const browserInfo = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio,
      hardwareConcurrency: navigator.hardwareConcurrency,
      language: navigator.language,
    }))
    return { result, browserInfo }
  } finally {
    await context.close()
  }
}

function browserTimingEnvironmentMatch(baseline, current) {
  const host = timingEnvironmentMatch(baseline.referenceEnvironment, current.referenceEnvironment)
  const expected = baseline.referenceEnvironment?.browser
  const actual = current.referenceEnvironment?.browser
  const browserReasons = []
  if (!expected || !actual) {
    browserReasons.push("missing Chromium timing fingerprint")
  } else {
    for (const key of ["engine", "version"]) {
      if (expected[key] !== actual[key]) {
        browserReasons.push("browser " + key + " expected " + expected[key] + ", received " + actual[key])
      }
    }
  }
  return {
    compatible: host.compatible && browserReasons.length === 0,
    reasons: [...host.reasons, ...browserReasons],
  }
}

function browserTimingRows(metrics) {
  return [
    { id: "browser:hydration", timing: metrics.timings.hydration },
    { id: "browser:initial-canvas-paint", timing: metrics.timings.initialCanvasPaint },
    { id: "browser:retained-data-canvas-paint", timing: metrics.timings.updateCanvasPaint },
    { id: "browser:force-worker-round-trip", timing: metrics.timings.forceWorkerRoundTrip },
  ]
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function staticProjection(manifest) {
  const stableContext = { ...(manifest.metrics.browser.context || {}) }
  delete stableContext.hardwareConcurrency
  return {
    schemaVersion: manifest.schemaVersion,
    baselineKind: manifest.baselineKind,
    variancePolicy: manifest.variancePolicy,
    coverage: manifest.coverage,
    methods: manifest.methods,
    browser: {
      ...manifest.metrics.browser,
      // This is valuable diagnostic evidence but necessarily varies between
      // the local capture host and the Chromium CI runner.
      context: stableContext,
    },
  }
}

export async function collectBrowserBaseline(options = {}) {
  const repoRoot = resolve(options.repoRoot || REPO_ROOT)
  assertFreshDist(repoRoot)

  const launchOptions = { headless: true }
  if (options.executablePath) {
    if (!existsSync(options.executablePath)) {
      throw new Error("Browser baseline executable does not exist: " + options.executablePath)
    }
    launchOptions.executablePath = options.executablePath
  }
  const browser = await chromium.launch(launchOptions)
  let integration
  try {
    integration = await startIntegrationServer(repoRoot)
    const samples = []
    let browserInfo = null
    for (let index = 0; index < BROWSER_SAMPLE_COUNT; index += 1) {
      const sample = await collectFixtureSample(browser, integration.url, index + 1)
      samples.push(sample.result)
      browserInfo = browserInfo || sample.browserInfo
    }

    const initialCanvasWidth = allEqual(samples.map((sample) => sample.initialCanvas.canvasWidth), "initial canvas width")
    const initialCanvasHeight = allEqual(samples.map((sample) => sample.initialCanvas.canvasHeight), "initial canvas height")
    const updatedCanvasWidth = allEqual(samples.map((sample) => sample.updatedCanvas.canvasWidth), "updated canvas width")
    const updatedCanvasHeight = allEqual(samples.map((sample) => sample.updatedCanvas.canvasHeight), "updated canvas height")
    const workerPositionCount = allEqual(samples.map((sample) => sample.worker.positionCount), "force worker position count")

    const referenceEnvironment = captureReferenceEnvironment(repoRoot)
    referenceEnvironment.browser = {
      engine: "chromium",
      version: browser.version(),
      userAgent: browserInfo?.userAgent || "unknown",
    }

    return {
      schemaVersion: BROWSER_BASELINE_SCHEMA_VERSION,
      baselineKind: "semiotic-browser-baseline",
      capturedAt: new Date().toISOString(),
      source: {
        gitCommit: gitCommit(repoRoot),
        artifact: "checkout dist artifacts served by a local production-mode Vite integration fixture",
        worktree: worktreeState(repoRoot),
      },
      referenceEnvironment,
      variancePolicy: DEFAULT_BROWSER_VARIANCE_POLICY,
      coverage: {
        included: [
          "Chromium hydrateRoot commit for a fixed server shell",
          "emitted XY LineChart Canvas2D first visible-pixel timing",
          "retained-data LineChart update to a changed Canvas2D fingerprint",
          "actual emitted forceLayoutWorker browser module startup and deterministic request/response round trip",
        ],
        externalOrDeferred: [
          "Browser heap, GC, allocation, and long-running memory-soak measurements",
          "OffscreenCanvas, physics-worker, cross-browser, mobile, and GPU-compositor performance matrices",
          "Route-level transfer waterfalls, Core Web Vitals, Lighthouse, cache profiles, and real-user telemetry",
          "MCP HTTP/authentication/CORS/proxy behavior, deployed cold starts, registry publication, and Cloud Run image/dependency measurements",
        ],
      },
      methods: {
        server: "A local Vite integration server runs in production mode on an ephemeral loopback port. Startup, navigation, network transfer, and Vite transforms are outside the measured in-page marks.",
        context: "Each of seven samples uses a fresh headless Chromium context at 800x600 CSS pixels, DPR 1, light color scheme, reduced motion, en-US locale, and UTC timezone.",
        hydration: "The fixture HTML includes the exact initial React shell; hydration timing ends in its first useLayoutEffect commit.",
        paint: "The fixture measures from chart mount/update state changes until Canvas2D getImageData observes non-white/non-transparent content. This proves rendered canvas content is available, not compositor presentation or visual completeness across GPUs.",
        worker: "The fixture starts the emitted forceLayoutWorker.js as a module Worker, sends a seeded normalized force-layout request, and verifies finite positions before recording the startup-plus-round-trip time.",
      },
      metrics: {
        browser: {
          engine: "chromium",
          launch: {
            headless: true,
          },
          context: {
            ...CONTEXT_OPTIONS,
            devicePixelRatio: browserInfo?.devicePixelRatio ?? null,
            hardwareConcurrency: browserInfo?.hardwareConcurrency ?? null,
            language: browserInfo?.language ?? null,
          },
          harness: {
            route: "/machine-baseline-examples/",
            chart: "LineChart",
            renderer: "Canvas2D",
            initialRows: 320,
            updatedRows: 320,
            worker: "forceLayoutWorker.js normalized request (12 nodes, 11 edges, seeded 48 iterations)",
          },
          checks: {
            initialCanvas: {
              width: initialCanvasWidth,
              height: initialCanvasHeight,
              hasVisiblePixels: true,
            },
            retainedDataUpdate: {
              width: updatedCanvasWidth,
              height: updatedCanvasHeight,
              changesCanvasFingerprint: true,
            },
            forceWorker: {
              response: "finite normalized positions",
              positionCount: workerPositionCount,
            },
          },
        },
        timings: {
          hydration: summarizeTimingSamples(samples.map((sample) => sample.metrics.hydrationMs)),
          initialCanvasPaint: summarizeTimingSamples(samples.map((sample) => sample.metrics.initialCanvasPaintMs)),
          updateCanvasPaint: summarizeTimingSamples(samples.map((sample) => sample.metrics.updateCanvasPaintMs)),
          forceWorkerRoundTrip: summarizeTimingSamples(samples.map((sample) => sample.metrics.forceWorkerRoundTripMs)),
        },
      },
    }
  } finally {
    if (integration) await stopIntegrationServer(integration.child)
    await browser.close()
  }
}

export function validateBrowserBaseline(manifest) {
  const errors = []
  if (!isObject(manifest)) return ["baseline must be an object"]
  if (manifest.schemaVersion !== BROWSER_BASELINE_SCHEMA_VERSION) {
    errors.push("schemaVersion must equal " + BROWSER_BASELINE_SCHEMA_VERSION)
  }
  if (manifest.baselineKind !== "semiotic-browser-baseline") {
    errors.push("baselineKind must equal semiotic-browser-baseline")
  }
  if (!isObject(manifest.referenceEnvironment?.timingFingerprint) || !isObject(manifest.referenceEnvironment?.browser)) {
    errors.push("referenceEnvironment host and browser timing fingerprints are required")
  }
  if (!isObject(manifest.variancePolicy?.timing)) errors.push("variancePolicy.timing is required")
  if (!isObject(manifest.metrics?.browser) || !isObject(manifest.metrics?.browser?.checks)) {
    errors.push("metrics.browser checks are required")
  }
  if (!isObject(manifest.metrics?.timings)) {
    errors.push("metrics.timings is required")
  }
  if (errors.length > 0) return errors

  let rows
  try {
    rows = browserTimingRows(manifest.metrics)
  } catch (error) {
    return ["could not read browser timing metrics: " + error.message]
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

export function compareBrowserBaselines(baseline, current) {
  const baselineErrors = validateBrowserBaseline(baseline)
  const currentErrors = validateBrowserBaseline(current)
  const structuralDifferences = [
    ...baselineErrors.map((error) => "baseline: " + error),
    ...currentErrors.map((error) => "current: " + error),
  ]
  if (baselineErrors.length === 0 && currentErrors.length === 0) {
    findDifferences(staticProjection(baseline), staticProjection(current), "baseline", structuralDifferences)
  }

  const timingEnvironment = browserTimingEnvironmentMatch(baseline, current)
  const timingRegressions = []
  const timingWarnings = []
  if (timingEnvironment.compatible && baselineErrors.length === 0 && currentErrors.length === 0) {
    const baselineRows = new Map(browserTimingRows(baseline.metrics).map((row) => [row.id, row.timing]))
    const currentRows = new Map(browserTimingRows(current.metrics).map((row) => [row.id, row.timing]))
    const membership = findDifferences([...baselineRows.keys()].sort(), [...currentRows.keys()].sort(), "timing rows")
    structuralDifferences.push(...membership)
    const maximum = baseline.variancePolicy.timing.maxRegression || DEFAULT_BROWSER_VARIANCE_POLICY.timing.maxRegression
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
          limitMs: rounded(limit),
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
    timingEnvironment,
    timingRegressions,
    timingWarnings,
    ok: structuralDifferences.length === 0 && timingRegressions.length === 0,
  }
}
