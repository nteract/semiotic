import { LineChart } from "../../dist/xy.module.min.js"
import React, { useEffect, useLayoutEffect, useRef, useState } from "react"
import { hydrateRoot } from "react-dom/client"

const RESULTS_KEY = "__semioticMachineBaseline"
const PAINT_TIMEOUT_MS = 10_000

// The values and extents are fixed so a changed canvas fingerprint proves that
// the update traversed the browser rendering path; no network, timer stream,
// or random source participates in this fixture.
const INITIAL_DATA = Array.from({ length: 320 }, (_, index) => ({
  x: index,
  y: 20 + ((index * 17) % 71) + Math.sin(index / 11) * 12,
  series: index % 2 === 0 ? "retained" : "baseline",
}))

const UPDATED_DATA = INITIAL_DATA.map((datum, index) => ({
  ...datum,
  y: 15 + ((index * 29) % 89) + Math.cos(index / 7) * 14,
}))

const FORCE_NODES = Array.from({ length: 12 }, (_, index) => ({
  id: "node-" + index,
  label: "Node " + index,
}))

const FORCE_EDGES = FORCE_NODES.slice(1).map((node, index) => ({
  source: "node-" + index,
  target: node.id,
}))

function round(value) {
  return Number(value.toFixed(3))
}

function initializeResults() {
  const existing = window[RESULTS_KEY]
  if (existing) return existing
  const results = {
    status: "running",
    marks: {
      hydrationStart: performance.now(),
    },
  }
  window[RESULTS_KEY] = results
  return results
}

function fail(error) {
  const results = initializeResults()
  results.status = "error"
  results.error = error instanceof Error ? error.message : String(error)
}

function visibleCanvasSummary() {
  const canvas = document.querySelector(
    '[data-testid="machine-baseline-chart"] canvas[aria-label]'
  )
  if (!(canvas instanceof HTMLCanvasElement) || canvas.width === 0 || canvas.height === 0) {
    return null
  }
  const context = canvas.getContext("2d")
  if (!context) return null

  let pixels
  try {
    pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  } catch {
    return null
  }

  let paintedPixels = 0
  // FNV-1a over a regularly sampled canvas is enough to distinguish the two
  // fixed datasets without committing platform-dependent anti-aliasing bytes.
  let hash = 2166136261
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index]
    const green = pixels[index + 1]
    const blue = pixels[index + 2]
    const alpha = pixels[index + 3]
    const visible = alpha > 10 && !(red > 240 && green > 240 && blue > 240)
    if (visible) paintedPixels += 1
    if (index % 64 === 0) {
      hash ^= red
      hash = Math.imul(hash, 16777619)
      hash ^= green
      hash = Math.imul(hash, 16777619)
      hash ^= blue
      hash = Math.imul(hash, 16777619)
      hash ^= alpha
      hash = Math.imul(hash, 16777619)
    }
  }

  if (paintedPixels === 0) return null
  return {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    paintedPixels,
    fingerprint: (hash >>> 0).toString(16),
  }
}

function waitForCanvasPaint(previousFingerprint) {
  const startedAt = performance.now()
  return new Promise((resolve, reject) => {
    const poll = () => {
      const summary = visibleCanvasSummary()
      if (summary && (!previousFingerprint || summary.fingerprint !== previousFingerprint)) {
        resolve({ ...summary, elapsedMs: performance.now() - startedAt })
        return
      }
      if (performance.now() - startedAt > PAINT_TIMEOUT_MS) {
        reject(new Error("Timed out waiting for a visible canvas paint"))
        return
      }
      requestAnimationFrame(poll)
    }
    requestAnimationFrame(poll)
  })
}

function hashWorkerPositions(positions) {
  const canonical = Object.entries(positions)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, point]) => [id, round(point.x), round(point.y)])
  let hash = 2166136261
  for (const character of JSON.stringify(canonical)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

function runForceWorker() {
  const startedAt = performance.now()
  const worker = new Worker(
    new URL("../../dist/forceLayoutWorker.js", import.meta.url),
    { type: "module", name: "semiotic-machine-baseline-force" }
  )

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      worker.terminate()
      reject(new Error("Timed out waiting for the browser force-layout worker"))
    }, PAINT_TIMEOUT_MS)

    worker.addEventListener("error", (event) => {
      window.clearTimeout(timeout)
      worker.terminate()
      reject(event.error || new Error(event.message || "Browser force-layout worker failed"))
    }, { once: true })

    worker.addEventListener("message", (event) => {
      window.clearTimeout(timeout)
      worker.terminate()
      const response = event.data
      if (response?.error) {
        reject(new Error(response.error.message || "Browser force-layout worker returned an error"))
        return
      }
      const positions = response?.positions
      if (!positions || typeof positions !== "object") {
        reject(new Error("Browser force-layout worker returned no positions"))
        return
      }
      const points = Object.values(positions)
      if (
        points.length !== FORCE_NODES.length ||
        points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))
      ) {
        reject(new Error("Browser force-layout worker returned invalid positions"))
        return
      }
      resolve({
        elapsedMs: performance.now() - startedAt,
        positionCount: points.length,
        positionFingerprint: hashWorkerPositions(positions),
      })
    }, { once: true })

    worker.postMessage({
      requestId: "machine-baseline-force",
      request: {
        kind: "normalized",
        nodes: FORCE_NODES,
        edges: FORCE_EDGES,
        options: {
          seed: 20260712,
          iterations: 48,
          repulsion: 1800,
          linkDistance: 90,
          nodeRadius: 8,
        },
      },
    })
  })
}

function BaselineApp() {
  const [phase, setPhase] = useState("shell")
  const initialized = useRef(false)
  const initialPaint = useRef(null)

  useLayoutEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const results = initializeResults()
    results.marks.hydrationCommit = performance.now()
    queueMicrotask(() => {
      results.marks.chartMountStart = performance.now()
      setPhase("initial")
    })
  }, [])

  useEffect(() => {
    if (phase !== "initial") return undefined
    let active = true
    waitForCanvasPaint()
      .then((paint) => {
        if (!active) return
        initialPaint.current = paint
        const results = initializeResults()
        results.marks.initialCanvasPaint = performance.now()
        results.initialCanvas = paint
        results.marks.chartUpdateStart = performance.now()
        setPhase("updated")
      })
      .catch(fail)
    return () => {
      active = false
    }
  }, [phase])

  useEffect(() => {
    if (phase !== "updated") return undefined
    let active = true
    waitForCanvasPaint(initialPaint.current?.fingerprint)
      .then(async (paint) => {
        if (!active) return
        const results = initializeResults()
        results.marks.updatedCanvasPaint = performance.now()
        results.updatedCanvas = paint
        results.worker = await runForceWorker()
        results.marks.workerComplete = performance.now()
        results.metrics = {
          hydrationMs: results.marks.hydrationCommit - results.marks.hydrationStart,
          initialCanvasPaintMs: results.marks.initialCanvasPaint - results.marks.chartMountStart,
          updateCanvasPaintMs: results.marks.updatedCanvasPaint - results.marks.chartUpdateStart,
          forceWorkerRoundTripMs: results.worker.elapsedMs,
        }
        results.status = "complete"
      })
      .catch(fail)
    return () => {
      active = false
    }
  }, [phase])

  const data = phase === "updated" ? UPDATED_DATA : INITIAL_DATA
  return (
    <div data-semiotic-machine-baseline-shell="true">
      {phase === "shell" ? "Semiotic browser baseline" : (
        <div data-testid="machine-baseline-chart">
          <LineChart
            data={data}
            xAccessor="x"
            yAccessor="y"
            lineBy="series"
            colorBy="series"
            colorScheme={["#2563eb", "#dc2626"]}
            xExtent={[0, INITIAL_DATA.length - 1]}
            yExtent={[0, 120]}
            showGrid
            width={640}
            height={360}
          />
        </div>
      )}
    </div>
  )
}

try {
  const root = document.getElementById("root")
  if (!root) throw new Error("Machine baseline root is missing")
  // Mark before hydrateRoot so the paired layout-effect mark captures the
  // full client hydration commit rather than only effect bookkeeping.
  initializeResults()
  hydrateRoot(root, <BaselineApp />)
} catch (error) {
  fail(error)
}
