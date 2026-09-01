/** Run: node --test scripts/api-compatibility.test.mjs */
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { compareDeclarationLines } from "./lib/api-compatibility.mjs"
import { createDeclarationAssignability } from "./lib/declaration-assignability.mjs"
import { npmPackArtifactArgs } from "./lib/npm-pack.mjs"

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)))

describe("public API compatibility comparison", () => {
  it("writes nested pack artifacts when npm dry-run is inherited", () => {
    const directory = mkdtempSync(join(tmpdir(), "semiotic-npm-pack-test-"))
    const archiveDirectory = join(directory, "archive")
    mkdirSync(archiveDirectory)
    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify({ name: "nested-pack-fixture", version: "1.0.0" }),
    )
    writeFileSync(join(directory, "index.js"), "export default true\n")

    try {
      const packed = spawnSync(
        "npm",
        npmPackArtifactArgs([
          "--ignore-scripts",
          "--json",
          "--pack-destination",
          archiveDirectory,
        ]),
        {
          cwd: directory,
          encoding: "utf8",
          env: { ...process.env, npm_config_dry_run: "true" },
        },
      )
      assert.equal(
        packed.status,
        0,
        packed.stderr || packed.stdout || packed.error?.message,
      )
      assert.deepEqual(
        readdirSync(archiveDirectory).filter((name) => name.endsWith(".tgz")),
        ["nested-pack-fixture-1.0.0.tgz"],
      )
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it("rejects interface member removal, narrowing, and required-ification", () => {
    const original = [
      "interface WidgetProps",
      "interface-member WidgetProps::property::label = optional label: string | number | undefined",
    ]

    const removed = compareDeclarationLines(original, ["interface WidgetProps"])
    assert.deepEqual(removed.map((change) => change.kind), ["removed"])

    const narrowed = compareDeclarationLines(original, [
      "interface WidgetProps",
      "interface-member WidgetProps::property::label = optional label: string | undefined",
    ])
    assert.deepEqual(narrowed.map((change) => change.kind), ["changed"])

    const required = compareDeclarationLines(original, [
      "interface WidgetProps",
      "interface-member WidgetProps::property::label = required label: string | number",
    ])
    assert.deepEqual(required.map((change) => change.kind), ["changed"])
  })

  it("rejects enum member removal", () => {
    const changes = compareDeclarationLines(
      ["enum Mode", "enum-member Mode::Stable = Stable: 0"],
      ["enum Mode"],
    )
    assert.deepEqual(changes.map((change) => change.kind), ["removed"])
  })

  it("accepts an optional interface member addition but rejects a required one", () => {
    const previous = ["interface WidgetProps"]
    const optional = compareDeclarationLines(previous, [
      ...previous,
      "interface-member WidgetProps::property::description = optional description: string | undefined",
    ])
    assert.deepEqual(optional, [])

    const required = compareDeclarationLines(previous, [
      ...previous,
      "interface-member WidgetProps::property::id = required id: string",
    ])
    assert.deepEqual(required.map((change) => change.kind), ["required-added"])
  })

  it("accepts property widening, optional-ification, and required members on a new interface", () => {
    assert.deepEqual(compareDeclarationLines(
      [
        "interface WidgetProps",
        'interface-member WidgetProps::property::mode = optional mode: "a" | undefined',
      ],
      [
        "interface WidgetProps",
        'interface-member WidgetProps::property::mode = optional mode: "a" | "b" | undefined',
      ],
    ), [])

    assert.deepEqual(compareDeclarationLines(
      [
        "interface WidgetProps",
        "interface-member WidgetProps::property::value = required value: number | undefined",
      ],
      [
        "interface WidgetProps",
        "interface-member WidgetProps::property::value = optional value: number | undefined",
      ],
    ), [])

    assert.deepEqual(compareDeclarationLines([], [
      "interface NewResult",
      "interface-member NewResult::property::value = required value: number",
    ]), [])

    assert.deepEqual(compareDeclarationLines(
      ["interface WidgetProps"],
      [
        "interface AccessibilityProps",
        "interface-member AccessibilityProps::property::title = optional title: string | undefined",
        "interface WidgetProps extends AccessibilityProps",
      ],
    ), [])

    assert.deepEqual(compareDeclarationLines(
      [
        "interface PaintProps",
        "interface-member PaintProps::property::paint = optional paint: ((ctx: CanvasRenderingContext2D, body: Body) => void) | undefined",
      ],
      [
        "interface PaintProps",
        "interface-member PaintProps::property::paint = optional paint: ((ctx: CanvasRenderingContext2D, body: Body, metadata: PaintContext) => void) | undefined",
      ],
    ), [])
  })

  it("keeps representative generic React component signatures typed", () => {
    const outDir = mkdtempSync(join(tmpdir(), "semiotic-api-signature-test-"))
    try {
      const generated = spawnSync(
        process.execPath,
        [
          "scripts/generate-api-surface.mjs",
          "--only",
          "semiotic",
          "--out-dir",
          outDir,
        ],
        { cwd: repoRoot, encoding: "utf8", timeout: 120_000 },
      )
      assert.equal(
        generated.status,
        0,
        generated.stderr || generated.stdout || generated.error?.message,
      )
      const snapshot = readFileSync(join(outDir, "semiotic.api.md"), "utf8")
      const areaChart = snapshot.match(/^function AreaChart.*$/m)?.[0]
      assert.ok(areaChart, "AreaChart call signature is missing")
      assert.match(areaChart, /AreaChartProps<TDatum>/)
      assert.match(
        areaChart,
        /React\.RefAttributes<RealtimeFrameHandle(?:<Datum, Datum>)?>/,
      )
      assert.match(areaChart, /React\.ReactElement/)
      assert.doesNotMatch(areaChart, /\(props: any\)/)

      const realtimeHandle = snapshot.match(/^interface RealtimeFrameHandle.*$/m)?.[0]
      assert.ok(realtimeHandle, "RealtimeFrameHandle declaration is missing")
      assert.match(
        realtimeHandle,
        /<TDatum extends Datum = Datum, TReadDatum extends Datum = TDatum>/,
      )

      const realtimeLineSignatures =
        snapshot.match(/^function RealtimeLineChart.*$/gm) ?? []
      assert.ok(
        realtimeLineSignatures.some((line) =>
          line.includes("RealtimeLineChartHandle<TDatum, TDatum>"),
        ),
        "RealtimeLineChart typed readback overload is missing",
      )
      assert.ok(
        realtimeLineSignatures.some((line) =>
          line.includes(
            "RealtimeLineChartHandle<TDatum, AggregatedRealtimeDatum>",
          ),
        ),
        "RealtimeLineChart aggregate readback overload is missing",
      )

      const streamFrame = snapshot.match(/^(?:const|function) StreamXYFrame.*$/m)?.[0]
      assert.ok(streamFrame, "StreamXYFrame signature is missing")
      assert.match(streamFrame, /StreamXYFrameProps/)
      assert.doesNotMatch(streamFrame, /NamedExoticComponent<any>/)

      const tooltipResolver = snapshot.match(/^function resolveMultiCapableTooltip.*$/m)?.[0]
      assert.ok(tooltipResolver, "resolveMultiCapableTooltip signature is missing")
      assert.match(tooltipResolver, /customFunctionContext\?: "datum" \| "hover"/)
      assert.doesNotMatch(tooltipResolver, /"hover" \| customFunctionContext/)
    } finally {
      rmSync(outDir, { recursive: true, force: true })
    }
  })

  it("proves alias widenings structurally without masking a real narrowing", () => {
    const directory = mkdtempSync(join(tmpdir(), "semiotic-api-assignability-test-"))
    const previousDist = join(directory, "previous")
    const currentDist = join(directory, "current")
    mkdirSync(previousDist)
    mkdirSync(currentDist)
    writeFileSync(join(previousDist, "semiotic-test.d.ts"), `
      export interface Props {
        graphics?: string
        legendClick?: (item: { label: string }) => void
        style?: (datum: Record<string, unknown>) => Record<string, unknown>
        title?: string
      }
      export interface OptionalProps { value?: number }
      export declare class Store {
        hitTest(x: number, y: number, radius?: number): string | null
        run(value?: number): void
      }
      export declare function configure(input: { mode: string }): string
    `)
    writeFileSync(join(currentDist, "semiotic-test.d.ts"), `
      export interface GraphicsContext { width: number }
      export type Graphics = string | ((context: GraphicsContext) => string)
      export interface LegendItem { label: string; color?: string; [key: string]: unknown }
      export interface Accessibility { description?: string }
      export interface Style { fill: string }
      export interface Props extends Accessibility {
        graphics?: Graphics
        legendClick?: (item: LegendItem) => void
        style?: (datum: Record<string, unknown>) => Style & Record<string, unknown>
        title: string
      }
      export interface OptionalProps extends Accessibility { value?: number }
      export declare class Store {
        hitTest(x: number, y: number, radius?: number, options?: { exact?: boolean }): string | null
        run(value: number, mode: string): void
      }
      export declare function configure(input: { mode: string; diagnostics?: boolean }): string
    `)

    try {
      const semantic = createDeclarationAssignability({ previousDist, currentDist })
      const change = (symbol, previous, current) => ({ symbol, previous: [previous], current: [current] })

      assert.equal(semantic.isCompatible("semiotic-test", change(
        "interface-member Props::property::graphics",
        "interface-member Props::property::graphics = optional graphics: string | undefined",
        "interface-member Props::property::graphics = optional graphics: Graphics | undefined",
      )), true)
      assert.equal(semantic.isCompatible("semiotic-test", change(
        "interface-member Props::property::legendClick",
        "interface-member Props::property::legendClick = optional legendClick: ((item: {label: string;}) => void) | undefined",
        "interface-member Props::property::legendClick = optional legendClick: ((item: LegendItem) => void) | undefined",
      )), true)
      assert.equal(semantic.isCompatible("semiotic-test", change(
        "Props",
        "interface Props",
        "interface Props extends Accessibility",
      )), true, "the optional heritage itself is compatible; member changes are checked separately")
      assert.equal(semantic.isCompatible("semiotic-test", change(
        "OptionalProps",
        "interface OptionalProps",
        "interface OptionalProps extends Accessibility",
      )), true)
      assert.equal(semantic.isCompatible("semiotic-test", change(
        "interface-member Props::property::title",
        "interface-member Props::property::title = optional title: string | undefined",
        "interface-member Props::property::title = required title: string",
      )), false)
      assert.equal(semantic.isCompatible("semiotic-test", change(
        "interface-member Props::property::style",
        "interface-member Props::property::style = optional style: ((datum: Record<string, unknown>) => Record<string, unknown>) | undefined",
        "interface-member Props::property::style = optional style: ((datum: Record<string, unknown>) => Record<string, unknown> & Style) | undefined",
      )), false)
      assert.equal(semantic.isCompatible("semiotic-test", change(
        "class-member Store::method::hitTest",
        "class-member Store::method::hitTest = required hitTest(x: number, y: number, radius?: number | undefined): string | null",
        "class-member Store::method::hitTest = required hitTest(x: number, y: number, radius?: number | undefined, options?: {exact?: boolean | undefined;} | undefined): string | null",
      )), true)
      assert.equal(semantic.isCompatible("semiotic-test", change(
        "class-member Store::method::run",
        "class-member Store::method::run = required run(value?: number | undefined): void",
        "class-member Store::method::run = required run(value: number, mode: string): void",
      )), false)
      assert.equal(semantic.isCompatible("semiotic-test", change(
        "configure",
        "function configure(input: {mode: string;}): string",
        "function configure(input: {mode: string; diagnostics?: boolean;}): string",
      )), true)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
