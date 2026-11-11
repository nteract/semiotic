/**
 * Shared fixtures and helpers for the report-only performance harness.
 *
 * Everything here is deterministic: no Date.now(), no Math.random(). Two runs
 * on the same machine describe the same scenes, so a difference between them
 * is a runtime difference.
 */
import { cpus, platform, arch } from "node:os"
import type { PipelineConfig } from "../../src/components/stream/PipelineStore"

export const LAYOUT = { width: 600, height: 400 }
export const RESIZED_LAYOUT = { width: 640, height: 420 }

export interface ScatterDatum {
  id: string
  x: number
  y: number
  g: string
}

/** Lattice-like scatter fixture: coprime strides spread points over the plot. */
export function latticeDatum(i: number): ScatterDatum {
  return {
    id: "p" + i,
    x: ((i * 47) % 9973) / 99.73,
    y: ((i * 89 + 31) % 9967) / 99.67,
    g: "s" + (i % 5)
  }
}

/** Seeded uniform scatter fixture (linear congruential generator). */
export function createUniformDatum(seed = 12345): (i: number) => ScatterDatum {
  let state = seed
  const next = () =>
    (state = (state * 1664525 + 1013904223) >>> 0) / 4294967296
  return (i) => ({
    id: "p" + i,
    x: next() * 100,
    y: next() * 100,
    g: "s" + (i % 5)
  })
}

export function lineDatum(i: number): { x: number; y: number; g: string } {
  return {
    x: i,
    y: 50 + Math.sin(i / 37) * 30 + ((i * 7919) % 13),
    g: "s" + (i % 5)
  }
}

/** Semi-transparent scatter config: the default-like, per-mark paint path. */
export function scatterConfig(
  overrides: Record<string, unknown> = {}
): PipelineConfig {
  return {
    chartType: "scatter",
    xAccessor: "x",
    yAccessor: "y",
    pointIdAccessor: "id",
    pointStyle: () => ({ fill: "#4e79a7", opacity: 0.8, r: 3 }),
    extentPadding: 0.05,
    windowSize: 200,
    windowMode: "sliding",
    ...overrides
  } as unknown as PipelineConfig
}

export function lineConfig(): PipelineConfig {
  return {
    chartType: "line",
    xAccessor: "x",
    yAccessor: "y",
    extentPadding: 0.05,
    windowSize: 200,
    windowMode: "sliding"
  } as unknown as PipelineConfig
}

/** Median wall time of `fn` over `reps` runs, in milliseconds. */
export function medianMs(fn: () => void, reps = 15): number {
  const samples: number[] = []
  for (let i = 0; i < reps; i++) {
    const start = performance.now()
    fn()
    samples.push(performance.now() - start)
  }
  samples.sort((a, b) => a - b)
  return samples[Math.floor(samples.length / 2)]
}

export function round(value: number, digits = 2): number {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

/** Parse `--name=a,b,c` into positive numbers, falling back to `fallback`. */
export function numberListArg(name: string, fallback: number[]): number[] {
  const prefix = `--${name}=`
  const raw = process.argv.find((arg) => arg.startsWith(prefix))
  if (!raw) return fallback
  const values = raw
    .slice(prefix.length)
    .split(",")
    .map((part) => Number(part.replace(/_/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0)
  return values.length > 0 ? values : fallback
}

export function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

/** Print rows as an aligned text table. The first row is the header. */
export function printTable(rows: Array<Array<string | number>>): void {
  const widths = rows[0].map((_, column) =>
    Math.max(...rows.map((row) => String(row[column]).length))
  )
  for (const row of rows) {
    console.log(
      row
        .map((cell, column) => String(cell).padStart(widths[column]))
        .join("  ")
    )
  }
}

/** One line naming the machine. Numbers from different machines do not mix. */
export function describeMachine(): string {
  const cpu = cpus()[0]?.model ?? "unknown CPU"
  return `${cpu}, ${platform()} ${arch()}, Node ${process.version}`
}
