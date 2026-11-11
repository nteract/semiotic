/**
 * Browser half of the frame-interval harness. Bundled on the fly by
 * `run-frame-interval.mjs` and evaluated in Chromium.
 *
 * It drives the real XY store, canvas renderers, hit tester, and
 * DataSourceAdapter on a real 2D canvas inside real animation frames, and
 * records two things per case:
 *
 *   - script time: milliseconds of JavaScript the frame spent on our work
 *   - frame interval: the time between consecutive animation frames
 *
 * There is deliberately no canvas readback (`getImageData`, `toDataURL`).
 * Readback forces a synchronous flush and makes every frame look as slow as
 * the raster, which hides whether the browser kept its frame rate.
 */
import { PipelineStore, type PipelineConfig } from "../../../src/components/stream/PipelineStore"
import { registerBuiltInXYPlugins } from "../../../src/components/stream/xyPlugins/registerBuiltIn"
import { getXYCanvasRenderers } from "../../../src/components/stream/xyPlugins/registry"
import { findNearestNode } from "../../../src/components/stream/CanvasHitTester"
import { DataSourceAdapter } from "../../../src/components/stream/DataSourceAdapter"

registerBuiltInXYPlugins()

const WIDTH = 640
const HEIGHT = 360
const SIZE = { width: WIDTH, height: HEIGHT }

interface ScatterDatum {
  id: string
  x: number
  y: number
}

function scatterDatum(i: number): ScatterDatum {
  return {
    id: "p" + i,
    x: ((i * 47) % 9973) / 99.73,
    y: ((i * 89 + 31) % 9967) / 99.67
  }
}

function lineDatum(i: number): { x: number; y: number } {
  return { x: i, y: 50 + Math.sin(i / 37) * 30 + ((i * 7919) % 13) }
}

function scatterConfig(opacity: number): PipelineConfig {
  return {
    chartType: "scatter",
    xAccessor: "x",
    yAccessor: "y",
    pointStyle: () => ({ fill: "#4e79a7", opacity, r: 2 }),
    extentPadding: 0.05,
    windowSize: 200,
    windowMode: "sliding"
  } as unknown as PipelineConfig
}

function rendererName(): string {
  const gl = document.createElement("canvas").getContext("webgl")
  if (!gl) return "no WebGL (software raster likely)"
  const info = gl.getExtension("WEBGL_debug_renderer_info")
  return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "unknown"
}

function createCanvas(dpr: number): {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
} {
  const canvas = document.createElement("canvas")
  canvas.width = WIDTH * dpr
  canvas.height = HEIGHT * dpr
  canvas.style.width = WIDTH + "px"
  canvas.style.height = HEIGHT + "px"
  document.body.appendChild(canvas)
  const ctx = canvas.getContext("2d")!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { canvas, ctx }
}

function paint(
  ctx: CanvasRenderingContext2D,
  store: PipelineStore,
  chartType: "scatter" | "line"
): void {
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  for (const render of getXYCanvasRenderers(chartType, false)) {
    render(ctx, store.scene, store.scales!, SIZE)
  }
}

interface LoopResult {
  scriptMs: number
  intervalMs: number
  p95IntervalMs: number
}

const median = (sorted: number[]) => sorted[sorted.length >> 1]

/** Run `work` once per animation frame and summarize script time and cadence. */
function loop(work: () => void, frames: number): Promise<LoopResult> {
  return new Promise((resolve) => {
    const script: number[] = []
    const stamps: number[] = []
    const step = (time: number) => {
      stamps.push(time)
      const start = performance.now()
      work()
      script.push(performance.now() - start)
      if (stamps.length < frames) {
        requestAnimationFrame(step)
        return
      }
      // Drop the first frames: JIT warm-up and the first raster are not the
      // steady state this harness reports.
      const settled = stamps.slice(6)
      const intervals = settled
        .slice(1)
        .map((stamp, index) => stamp - settled[index])
        .sort((a, b) => a - b)
      const scripts = script.slice(5).sort((a, b) => a - b)
      resolve({
        scriptMs: +median(scripts).toFixed(2),
        intervalMs: +median(intervals).toFixed(1),
        p95IntervalMs: +intervals[Math.floor(intervals.length * 0.95)].toFixed(1)
      })
    }
    requestAnimationFrame(step)
  })
}

interface LoadResult {
  rows: number
  frames: number
  wallMs: number
  scriptMs: number
  longestFrameScriptMs: number
  firstPaintScriptMs: number
}

/**
 * Load a large array through the real DataSourceAdapter with real animation
 * frames, rebuilding and painting once per frame the way a Stream Frame does.
 */
function load(rows: number, dpr: number): Promise<LoadResult> {
  return new Promise((resolve) => {
    const data = Array.from({ length: rows }, (_, i) => scatterDatum(i))
    const { canvas, ctx } = createCanvas(dpr)
    const store = new PipelineStore(scatterConfig(0.8))
    let dirty = false
    let pendingScript = 0
    let scriptMs = 0
    let longestFrameScriptMs = 0
    let firstPaintScriptMs = 0
    let frames = 0
    const adapter = new DataSourceAdapter<ScatterDatum>((changeset) => {
      const start = performance.now()
      if (store.ingest(changeset)) dirty = true
      pendingScript += performance.now() - start
    })
    const renderIfDirty = () => {
      if (!dirty) return
      const start = performance.now()
      store.computeScene(SIZE)
      paint(ctx, store, "scatter")
      dirty = false
      const frameScript = pendingScript + (performance.now() - start)
      pendingScript = 0
      frames++
      scriptMs += frameScript
      if (frames === 1) firstPaintScriptMs = frameScript
      longestFrameScriptMs = Math.max(longestFrameScriptMs, frameScript)
    }
    const started = performance.now()
    adapter.setBoundedData(data)
    renderIfDirty()
    const step = () => {
      renderIfDirty()
      if (store.size >= rows && !dirty) {
        canvas.remove()
        resolve({
          rows,
          frames,
          wallMs: +(performance.now() - started).toFixed(1),
          scriptMs: +scriptMs.toFixed(1),
          longestFrameScriptMs: +longestFrameScriptMs.toFixed(1),
          firstPaintScriptMs: +firstPaintScriptMs.toFixed(1)
        })
        return
      }
      requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

export interface FrameIntervalOptions {
  dpr: number
  sizes: number[]
  loadSizes: number[]
  lineSizes: number[]
  frames: number
}

async function run(options: FrameIntervalOptions) {
  const { dpr, frames } = options
  const idle = await loop(() => {}, frames)
  const scatter: Record<string, unknown>[] = []

  for (const points of options.sizes) {
    const data = Array.from({ length: points }, (_, i) => scatterDatum(i))
    for (const [style, opacity] of [
      ["translucent (opacity 0.8)", 0.8],
      ["opaque", 1]
    ] as const) {
      const { canvas, ctx } = createCanvas(dpr)
      const store = new PipelineStore(scatterConfig(opacity))
      store.ingest({ inserts: data, bounded: true })
      store.computeScene(SIZE)
      if (store.scene.length === 0) throw new Error("scatter scene is empty")

      const paintOnly = await loop(() => paint(ctx, store, "scatter"), frames)
      let next = points
      const pushOne = () => {
        store.ingest({
          inserts: [scatterDatum(next++)],
          bounded: false,
          boundedAppend: true
        })
        store.computeScene(SIZE)
      }
      const pushRebuildPaint = await loop(() => {
        pushOne()
        paint(ctx, store, "scatter")
      }, frames)
      // Pointer over the chart: the frame re-runs the hit test after a rebuild.
      const pushRebuildPaintHovered = await loop(() => {
        pushOne()
        findNearestNode(
          store.scene,
          WIDTH / 2,
          HEIGHT / 2,
          30,
          store.quadtree,
          store.maxPointRadius
        )
        paint(ctx, store, "scatter")
      }, frames)
      scatter.push({
        points,
        style,
        paintOnly,
        pushRebuildPaint,
        pushRebuildPaintHovered
      })
      canvas.remove()
    }
  }

  const loads: LoadResult[] = []
  for (const rows of options.loadSizes) loads.push(await load(rows, dpr))

  const lines: Record<string, unknown>[] = []
  for (const vertices of options.lineSizes) {
    const data = Array.from({ length: vertices }, (_, i) => lineDatum(i))
    const { canvas, ctx } = createCanvas(dpr)
    const store = new PipelineStore({
      chartType: "line",
      xAccessor: "x",
      yAccessor: "y",
      extentPadding: 0.05,
      windowSize: 200,
      windowMode: "sliding"
    } as unknown as PipelineConfig)
    store.ingest({ inserts: data, bounded: true })
    store.computeScene(SIZE)
    if (store.scene.length === 0) throw new Error("line scene is empty")
    lines.push({
      vertices,
      paintOnly: await loop(() => paint(ctx, store, "line"), Math.min(frames, 24))
    })
    canvas.remove()
  }

  return { renderer: rendererName(), dpr, idle, scatter, loads, lines }
}

;(
  window as unknown as { __semioticFrameIntervalBench: typeof run }
).__semioticFrameIntervalBench = run
