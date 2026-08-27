import { Heatmap, LineChart, Scatterplot } from "../../dist/xy.module.min.js"
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react"
import { hydrateRoot } from "react-dom/client"

const RESULTS_KEY = "__semioticMachineBaseline"
const PAINT_TIMEOUT_MS = 30_000
const CHART_WIDTH = 640
const CHART_HEIGHT = 360
const ZERO_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 }

// Every fixture is deterministic and computed before the first measured mark.
// The dense scatter data begins with an exact centre anchor so the pointer
// measurement exercises Semiotic's real quadtree hit tester without depending
// on a browser-specific pixel rounding decision.
const INITIAL_DATA = Array.from({ length: 320 }, (_, index) => ({
  x: index,
  y: 20 + ((index * 17) % 71) + Math.sin(index / 11) * 12,
  series: index % 2 === 0 ? "retained" : "baseline"
}))

const UPDATED_DATA = INITIAL_DATA.map((datum, index) => ({
  ...datum,
  y: 15 + ((index * 29) % 89) + Math.cos(index / 7) * 14
}))

const SCATTER_DATA_50K = [
  { id: "dense-anchor", x: 50, y: 50 },
  ...Array.from({ length: 49_999 }, (_, offset) => {
    const index = offset + 1
    return {
      id: "dense-" + index,
      x: ((index * 47) % 9_973) / 99.73,
      y: ((index * 89 + 31) % 9_967) / 99.67
    }
  })
]
const SCATTER_DATA_10K = SCATTER_DATA_50K.slice(0, 10_000)

const HEATMAP_DATA_50K = Array.from({ length: 50_000 }, (_, index) => ({
  x: index % 250,
  y: Math.floor(index / 250),
  value: 1 + ((index * 37) % 101)
}))

const FORCE_NODES = Array.from({ length: 12 }, (_, index) => ({
  id: "node-" + index,
  label: "Node " + index
}))

const FORCE_EDGES = FORCE_NODES.slice(1).map((node, index) => ({
  source: "node-" + index,
  target: node.id
}))

const PHASES = [
  "line-initial",
  "line-updated",
  "scatter-10k",
  "scatter-50k-unbatched",
  "scatter-50k-batched",
  "heatmap-50k-explicit",
  "heatmap-50k-auto"
]

function round(value) {
  return Number(value.toFixed(3))
}

function initializeResults() {
  const existing = window[RESULTS_KEY]
  if (existing) return existing
  const results = {
    status: "running",
    marks: {
      hydrationStart: performance.now()
    }
  }
  window[RESULTS_KEY] = results
  return results
}

function fail(error) {
  const results = initializeResults()
  results.status = "error"
  results.error = error instanceof Error ? error.message : String(error)
}

function chartCanvas(testId, layer = "data") {
  const canvases = document.querySelectorAll(`[data-testid="${testId}"] canvas`)
  const canvas = canvases[layer === "interaction" ? 1 : 0]
  return canvas instanceof HTMLCanvasElement ? canvas : null
}

function canvasSummary(testId, layer = "data", allowBlank = false) {
  const canvas = chartCanvas(testId, layer)
  if (!canvas || canvas.width === 0 || canvas.height === 0) return null
  const context = canvas.getContext("2d")
  if (!context) return null

  let pixels
  try {
    pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  } catch {
    return null
  }

  let paintedPixels = 0
  // FNV-1a over a regularly sampled canvas distinguishes each fixed render
  // without committing platform-dependent anti-aliasing bytes.
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

  if (!allowBlank && paintedPixels === 0) return null
  return {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    paintedPixels,
    fingerprint: (hash >>> 0).toString(16)
  }
}

function waitForCanvasPaint(testId, options = {}) {
  const {
    layer = "data",
    previousFingerprint,
    startedAt = performance.now()
  } = options
  const pollStartedAt = performance.now()
  return new Promise((resolve, reject) => {
    const poll = () => {
      const summary = canvasSummary(testId, layer)
      if (
        summary &&
        (!previousFingerprint || summary.fingerprint !== previousFingerprint)
      ) {
        resolve({ ...summary, elapsedMs: performance.now() - startedAt })
        return
      }
      if (performance.now() - pollStartedAt > PAINT_TIMEOUT_MS) {
        reject(
          new Error(`Timed out waiting for ${testId} ${layer} canvas paint`)
        )
        return
      }
      requestAnimationFrame(poll)
    }
    requestAnimationFrame(poll)
  })
}

async function measureDenseHover(testId, observationRef) {
  const graphic = document.querySelector(
    `[data-testid="${testId}"] [role="img"]`
  )
  const dataCanvas = chartCanvas(testId)
  if (!(graphic instanceof HTMLElement) || !dataCanvas) {
    throw new Error(`Could not resolve the ${testId} pointer target`)
  }

  const before = canvasSummary(testId, "interaction", true)
  if (!before)
    throw new Error(`Could not read the ${testId} interaction canvas`)
  observationRef.current = null
  const rect = dataCanvas.getBoundingClientRect()
  const startedAt = performance.now()
  graphic.dispatchEvent(
    new PointerEvent("pointermove", {
      bubbles: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      pointerType: "mouse"
    })
  )
  const highlighted = await waitForCanvasPaint(testId, {
    layer: "interaction",
    previousFingerprint: before.fingerprint,
    startedAt
  })
  const observation = observationRef.current
  if (
    observation?.type !== "hover" ||
    observation?.datum?.id !== "dense-anchor"
  ) {
    throw new Error(`${testId} did not hit the deterministic centre point`)
  }
  return {
    elapsedMs: highlighted.elapsedMs,
    beforeFingerprint: before.fingerprint,
    afterFingerprint: highlighted.fingerprint,
    paintedPixels: highlighted.paintedPixels,
    observedDatumId: observation.datum.id
  }
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

    worker.addEventListener(
      "error",
      (event) => {
        window.clearTimeout(timeout)
        worker.terminate()
        reject(
          event.error ||
            new Error(event.message || "Browser force-layout worker failed")
        )
      },
      { once: true }
    )

    worker.addEventListener(
      "message",
      (event) => {
        window.clearTimeout(timeout)
        worker.terminate()
        const response = event.data
        if (response?.error) {
          reject(
            new Error(
              response.error.message ||
                "Browser force-layout worker returned an error"
            )
          )
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
          points.some(
            (point) => !Number.isFinite(point.x) || !Number.isFinite(point.y)
          )
        ) {
          reject(
            new Error("Browser force-layout worker returned invalid positions")
          )
          return
        }
        resolve({
          elapsedMs: performance.now() - startedAt,
          positionCount: points.length,
          positionFingerprint: hashWorkerPositions(positions)
        })
      },
      { once: true }
    )

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
          nodeRadius: 8
        }
      }
    })
  })
}

function DenseScatter({ count, batched, onObservation }) {
  const data = count === 10_000 ? SCATTER_DATA_10K : SCATTER_DATA_50K
  return (
    <Scatterplot
      data={data}
      xAccessor="x"
      yAccessor="y"
      pointIdAccessor="id"
      pointRadius={2}
      pointOpacity={batched ? 1 : 0.999}
      xExtent={[0, 100]}
      yExtent={[0, 100]}
      width={CHART_WIDTH}
      height={CHART_HEIGHT}
      animate={false}
      onObservation={onObservation}
      frameProps={{ margin: ZERO_MARGIN, showAxes: false, hoverRadius: 5 }}
    />
  )
}

function DenseHeatmap({ automatic }) {
  return (
    <Heatmap
      data={HEATMAP_DATA_50K}
      xAccessor="x"
      yAccessor="y"
      valueAccessor="value"
      heatmapAggregation={automatic ? undefined : "mean"}
      heatmapXBins={automatic ? undefined : 64}
      heatmapYBins={automatic ? undefined : 48}
      xExtent={[0, 249]}
      yExtent={[0, 199]}
      width={CHART_WIDTH}
      height={CHART_HEIGHT}
      animate={false}
      frameProps={{ margin: ZERO_MARGIN, showAxes: false }}
    />
  )
}

function BaselineApp() {
  const [phase, setPhase] = useState("shell")
  const initialized = useRef(false)
  const previousLinePaint = useRef(null)
  const observationRef = useRef(null)

  const onDenseObservation = useCallback((observation) => {
    if (observation.type === "hover") observationRef.current = observation
  }, [])

  const beginPhase = useCallback((nextPhase) => {
    const results = initializeResults()
    results.marks[nextPhase + "Start"] = performance.now()
    setPhase(nextPhase)
  }, [])

  useLayoutEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const results = initializeResults()
    results.marks.hydrationCommit = performance.now()
    queueMicrotask(() => beginPhase(PHASES[0]))
  }, [beginPhase])

  useEffect(() => {
    if (!PHASES.includes(phase)) return undefined
    let active = true
    const measure = async () => {
      const results = initializeResults()
      const startedAt = results.marks[phase + "Start"]
      let paint

      if (phase === "line-initial") {
        paint = await waitForCanvasPaint("line-chart", { startedAt })
        if (!active) return
        previousLinePaint.current = paint
        results.initialCanvas = paint
        results.metrics = {
          hydrationMs:
            results.marks.hydrationCommit - results.marks.hydrationStart
        }
        results.metrics.initialCanvasPaintMs = paint.elapsedMs
      } else if (phase === "line-updated") {
        paint = await waitForCanvasPaint("line-chart", {
          previousFingerprint: previousLinePaint.current?.fingerprint,
          startedAt
        })
        if (!active) return
        results.updatedCanvas = paint
        results.metrics.updateCanvasPaintMs = paint.elapsedMs
      } else if (phase === "scatter-10k") {
        paint = await waitForCanvasPaint("scatter-10k", { startedAt })
        if (!active) return
        results.scatter10kCanvas = paint
        results.metrics.scatter10kPaintMs = paint.elapsedMs
        results.scatter10kHover = await measureDenseHover(
          "scatter-10k",
          observationRef
        )
        results.metrics.scatter10kHoverMs = results.scatter10kHover.elapsedMs
      } else if (phase === "scatter-50k-unbatched") {
        paint = await waitForCanvasPaint("scatter-50k-unbatched", { startedAt })
        if (!active) return
        results.scatter50kUnbatchedCanvas = paint
        results.metrics.scatter50kUnbatchedPaintMs = paint.elapsedMs
      } else if (phase === "scatter-50k-batched") {
        paint = await waitForCanvasPaint("scatter-50k-batched", { startedAt })
        if (!active) return
        results.scatter50kBatchedCanvas = paint
        results.metrics.scatter50kBatchedPaintMs = paint.elapsedMs
        results.scatter50kHover = await measureDenseHover(
          "scatter-50k-batched",
          observationRef
        )
        results.metrics.scatter50kHoverMs = results.scatter50kHover.elapsedMs
      } else if (phase === "heatmap-50k-explicit") {
        paint = await waitForCanvasPaint("heatmap-50k-explicit", { startedAt })
        if (!active) return
        results.heatmap50kExplicitCanvas = paint
        results.metrics.heatmap50kExplicitPaintMs = paint.elapsedMs
      } else if (phase === "heatmap-50k-auto") {
        paint = await waitForCanvasPaint("heatmap-50k-auto", { startedAt })
        if (!active) return
        results.heatmap50kAutoCanvas = paint
        results.metrics.heatmap50kAutoPaintMs = paint.elapsedMs
      }

      if (!active) return
      const phaseIndex = PHASES.indexOf(phase)
      const nextPhase = PHASES[phaseIndex + 1]
      if (nextPhase) {
        beginPhase(nextPhase)
        return
      }

      results.worker = await runForceWorker()
      results.metrics.forceWorkerRoundTripMs = results.worker.elapsedMs
      results.status = "complete"
    }
    measure().catch(fail)
    return () => {
      active = false
    }
  }, [phase, beginPhase])

  let chart = null
  if (phase === "line-initial" || phase === "line-updated") {
    chart = (
      <div data-testid="line-chart">
        <LineChart
          data={phase === "line-updated" ? UPDATED_DATA : INITIAL_DATA}
          xAccessor="x"
          yAccessor="y"
          lineBy="series"
          colorBy="series"
          colorScheme={["#2563eb", "#dc2626"]}
          xExtent={[0, INITIAL_DATA.length - 1]}
          yExtent={[0, 120]}
          showGrid
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          animate={false}
        />
      </div>
    )
  } else if (phase === "scatter-10k") {
    chart = (
      <div data-testid="scatter-10k" key={phase}>
        <DenseScatter
          count={10_000}
          batched
          onObservation={onDenseObservation}
        />
      </div>
    )
  } else if (phase === "scatter-50k-unbatched") {
    chart = (
      <div data-testid="scatter-50k-unbatched" key={phase}>
        <DenseScatter
          count={50_000}
          batched={false}
          onObservation={onDenseObservation}
        />
      </div>
    )
  } else if (phase === "scatter-50k-batched") {
    chart = (
      <div data-testid="scatter-50k-batched" key={phase}>
        <DenseScatter
          count={50_000}
          batched
          onObservation={onDenseObservation}
        />
      </div>
    )
  } else if (phase === "heatmap-50k-explicit") {
    chart = (
      <div data-testid="heatmap-50k-explicit" key={phase}>
        <DenseHeatmap automatic={false} />
      </div>
    )
  } else if (phase === "heatmap-50k-auto") {
    chart = (
      <div data-testid="heatmap-50k-auto" key={phase}>
        <DenseHeatmap automatic />
      </div>
    )
  }

  return (
    <div data-semiotic-machine-baseline-shell="true">
      {phase === "shell" ? "Semiotic browser baseline" : chart}
    </div>
  )
}

try {
  const root = document.getElementById("root")
  if (!root) throw new Error("Machine baseline root is missing")
  initializeResults()
  hydrateRoot(root, <BaselineApp />)
} catch (error) {
  fail(error)
}
