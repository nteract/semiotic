#!/usr/bin/env node
/**
 * Frame-interval harness: real Chromium, real canvas, real animation frames.
 *
 * Bundles `frame-interval.entry.ts` with esbuild, opens it in Playwright's
 * Chromium, and prints script time per frame and the measured frame interval
 * for XY scatter and line workloads. Nothing is read back from the canvas.
 *
 * Run:
 *   npm run bench:frame-interval
 *   npm run bench:frame-interval -- --sizes=10000,50000 --load-sizes=200000
 *   npm run bench:frame-interval -- --json
 *
 * Flags:
 *   --sizes=a,b        scatter point counts          (default 10000,50000,100000)
 *   --load-sizes=a,b   large-array load row counts   (default 50000,200000)
 *   --line-sizes=a,b   line vertex counts            (default 10000,100000)
 *   --dpr=n            device pixel ratio            (default 2)
 *   --frames=n         animation frames per case     (default 40)
 *   --software         do not request GPU rasterization
 *   --headed           show the browser window
 *   --json             machine-readable output
 *
 * Report-only: results depend on the machine, the display refresh rate, and
 * the GPU. They are for before/after comparison on one machine, not a gate.
 * See ../../README.md for how to read the output.
 */
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { cpus, platform, arch } from "node:os"
import { build } from "esbuild"
import { chromium } from "playwright"

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const value = (name) => {
  const prefix = `--${name}=`
  const raw = args.find((arg) => arg.startsWith(prefix))
  return raw ? raw.slice(prefix.length) : null
}
const numbers = (name, fallback) => {
  const raw = value(name)
  if (!raw) return fallback
  const parsed = raw
    .split(",")
    .map((part) => Number(part.replace(/_/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0)
  return parsed.length > 0 ? parsed : fallback
}

const options = {
  dpr: numbers("dpr", [2])[0],
  sizes: numbers("sizes", [10_000, 50_000, 100_000]),
  loadSizes: numbers("load-sizes", [50_000, 200_000]),
  lineSizes: numbers("line-sizes", [10_000, 100_000]),
  frames: Math.max(12, numbers("frames", [40])[0])
}

const bundle = await build({
  entryPoints: [resolve(here, "frame-interval.entry.ts")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  write: false,
  logLevel: "silent",
  define: { "process.env.NODE_ENV": '"production"' }
})

// Headless shell rasterizes on the CPU, which is not what a user's browser
// does. The full Chromium build with a real GPU backend is the default.
const gpuArgs = flag("software")
  ? []
  : [
      "--enable-gpu",
      "--ignore-gpu-blocklist",
      ...(platform() === "darwin" ? ["--use-angle=metal"] : [])
    ]
const executablePath = process.env.SEMIOTIC_BROWSER_EXECUTABLE_PATH
const browser = await chromium.launch({
  headless: !flag("headed"),
  ...(executablePath ? { executablePath } : { channel: "chromium" }),
  args: gpuArgs
})

let result
try {
  const context = await browser.newContext({
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: options.dpr
  })
  const page = await context.newPage()
  await page.setContent("<!doctype html><html><body></body></html>")
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  result = await page.evaluate(
    (runOptions) => window.__semioticFrameIntervalBench(runOptions),
    options
  )
  result.browser = `Chromium ${browser.version()}`
} finally {
  await browser.close()
}

result.machine = `${cpus()[0]?.model ?? "unknown CPU"}, ${platform()} ${arch()}`

if (flag("json")) {
  console.log(JSON.stringify(result, null, 2))
} else {
  const table = (rows) => {
    const widths = rows[0].map((_, column) =>
      Math.max(...rows.map((row) => String(row[column]).length))
    )
    for (const row of rows) {
      console.log(
        row.map((cell, column) => String(cell).padStart(widths[column])).join("  ")
      )
    }
  }
  const cell = (r) => `${r.scriptMs} / ${r.intervalMs} (p95 ${r.p95IntervalMs})`

  console.log(`Frame intervals — ${result.machine}`)
  console.log(`${result.browser}, renderer: ${result.renderer}, DPR ${result.dpr}`)
  console.log(
    `Idle animation frame: ${result.idle.intervalMs} ms (p95 ${result.idle.p95IntervalMs}). ` +
      "A case that keeps this interval is not dropping frames."
  )
  console.log("\nScatter — script ms / frame interval ms (p95 interval)")
  table([
    ["points", "style", "paint only", "push 1 + rebuild + paint", "same, pointer over chart"],
    ...result.scatter.map((row) => [
      row.points,
      row.style,
      cell(row.paintOnly),
      cell(row.pushRebuildPaint),
      cell(row.pushRebuildPaintHovered)
    ])
  ])
  console.log("\nLarge-array load through DataSourceAdapter")
  table([
    ["rows", "frames", "wall ms", "script ms", "longest frame script ms", "first paint script ms"],
    ...result.loads.map((row) => [
      row.rows,
      row.frames,
      row.wallMs,
      row.scriptMs,
      row.longestFrameScriptMs,
      row.firstPaintScriptMs
    ])
  ])
  console.log("\nLine — script ms / frame interval ms (p95 interval)")
  table([
    ["vertices", "paint only"],
    ...result.lines.map((row) => [row.vertices, cell(row.paintOnly)])
  ])
}
