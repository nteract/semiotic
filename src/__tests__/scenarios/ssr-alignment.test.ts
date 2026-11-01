/**
 * Tests for the SSR alignment check itself.
 *
 * The static check (`scripts/check-ssr-alignment.js`) is the load-bearing
 * guard against canvas/SVG drift — the bar `gradientFill` near-miss in
 * 3.4.2 was exactly the kind of bug it now prevents. These tests prove the
 * script catches both drift directions and that the happy path stays green
 * on the current tree.
 *
 * The simulation strategy: copy the XY converter or type source to a temporary
 * file, mutate it, and point the script at it via env var.
 * This avoids rewriting tracked source while Vitest runs suites in parallel.
 * Spawn-based to honor the script's `process.exit` semantics.
 */
import { spawnSync } from "child_process"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { describe, expect, it } from "vitest"

const ROOT = path.resolve(__dirname, "../../..")
const SCRIPT = path.join(ROOT, "scripts/check-ssr-alignment.js")
const SCENE_TO_SVG = path.join(ROOT, "src/components/stream/SceneToSVGXY.tsx")
const SCENE_TYPES = path.join(ROOT, "src/components/stream/types.ts")

function runCheck(sceneToSvgPath?: string, sceneTypesPath?: string) {
  return spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf-8",
    cwd: ROOT,
    env: {
      ...process.env,
      ...(sceneToSvgPath ? { SEMIOTIC_SCENE_TO_SVG: sceneToSvgPath } : {}),
      ...(sceneTypesPath ? { SEMIOTIC_SCENE_TYPES: sceneTypesPath } : {})
    }
  })
}

function withSourceMutation(
  sourcePath: string,
  mutate: (src: string) => string,
  fn: (sourcePath: string) => void
) {
  const original = fs.readFileSync(sourcePath, "utf-8")
  const mutated = mutate(original)
  // A stale fixture path must fail here, even if an unrelated checker error
  // would happen to satisfy the negative test's expected exit status.
  expect(mutated).not.toBe(original)
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "semiotic-ssr-alignment-")
  )
  const tempSource = path.join(tempDir, path.basename(sourcePath))
  try {
    fs.writeFileSync(tempSource, mutated)
    fn(tempSource)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

describe("check-ssr-alignment.js", () => {
  it("passes on the current tree (parity is intact)", () => {
    const result = runCheck()
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain("SSR alignment check passed")
    // Quantitative invariant — every frame should report >0 emitted/handled.
    for (const frame of ["xy", "ordinal", "network", "geo"]) {
      const counts = result.stdout.match(
        new RegExp(`${frame}:\\s+(\\d+) emitted / (\\d+) handled`)
      )
      expect(counts).not.toBeNull()
      expect(Number(counts![1])).toBeGreaterThan(0)
      expect(Number(counts![2])).toBeGreaterThanOrEqual(Number(counts![1]))
    }
  })

  it.each([
    ["blank lines and comments", `export type SceneNode =

      | LineSceneNode

      // PhantomSceneNode is documentation, not a union member.
      | AreaSceneNode | PointSceneNode | SymbolSceneNode | GlyphSceneNode

      | RectSceneNode | HeatcellSceneNode | CandlestickSceneNode`],
    ["parenthesized union at EOF", "export type SceneNode = (LineSceneNode | AreaSceneNode | PointSceneNode | SymbolSceneNode | GlyphSceneNode | RectSceneNode | HeatcellSceneNode | CandlestickSceneNode)"],
    ["adjacent declaration", "export type SceneNode = LineSceneNode | AreaSceneNode | PointSceneNode | SymbolSceneNode | GlyphSceneNode | RectSceneNode | HeatcellSceneNode | CandlestickSceneNode; export type UnrelatedNode = PhantomSceneNode"]
  ])("discovers the same XY scene types with %s", (_name, source) => {
    withSourceMutation(
      SCENE_TYPES,
      (original) => {
        const withoutUnion = original.replace(
          /export type SceneNode =[\s\S]*?(?=\nexport interface LineColorThreshold)/,
          ""
        )
        expect(withoutUnion).not.toBe(original)
        return `${withoutUnion}\n${source}`
      },
      (sceneTypesPath) => {
        const result = runCheck(undefined, sceneTypesPath)
        expect(result.status, result.stderr).toBe(0)
        expect(result.stdout).toContain("xy: 8 emitted / 8 handled")
      }
    )
  })

  it("rejects an unresolved union member instead of silently skipping its coverage", () => {
    withSourceMutation(
      SCENE_TYPES,
      (source) => source.replace("| LineSceneNode", "| UnknownSceneNode | LineSceneNode"),
      (sceneTypesPath) => {
        const result = runCheck(undefined, sceneTypesPath)
        expect(result.status).toBe(1)
        expect(result.stderr).toContain('union member "UnknownSceneNode" has no resolvable type discriminant')
      }
    )
  })

  it("reports a missing scene union explicitly", () => {
    withSourceMutation(
      SCENE_TYPES,
      (source) => source.replace("export type SceneNode =", "export type Unrelated ="),
      (sceneTypesPath) => {
        const result = runCheck(undefined, sceneTypesPath)
        expect(result.status).toBe(1)
        expect(result.stderr).toContain('scene union "SceneNode" has no resolvable members')
      }
    )
  })

  it("does not let the original interface mask a missing discriminant in the override", () => {
    withSourceMutation(
      SCENE_TYPES,
      (source) => source.replace('type: "line"', 'kind: "line"'),
      (sceneTypesPath) => {
        const result = runCheck(undefined, sceneTypesPath)
        expect(result.status).toBe(1)
        expect(result.stderr).toContain('union member "LineSceneNode" has no resolvable type discriminant')
      }
    )
  })

  it("fails when a scene-node type loses its SVG converter case (canvas-only drift)", () => {
    withSourceMutation(
      SCENE_TO_SVG,
      // Rename the candlestick case so the union still has the type but the
      // converter no longer handles it. Drift direction: canvas → SVG.
      (src) =>
        src.replace(/case "candlestick": \{/, 'case "REMOVED-FOR-TEST": {'),
      (sceneToSvgPath) => {
        const result = runCheck(sceneToSvgPath)
        expect(result.status).toBe(1)
        expect(result.stderr).toContain(
          'Scene type "candlestick" is part of the xy SceneNode union but xySceneNodeToSVG has no `case "candlestick":` branch'
        )
        expect(result.stderr).toContain("SSR will drop these marks")
        expect(result.stderr).toContain(
          "src/components/stream/SceneToSVGXY.tsx"
        )
      }
    )
  })

  it("fails when the override contains only the compatibility facade", () => {
    const result = runCheck(
      path.join(ROOT, "src/components/stream/SceneToSVG.tsx")
    )
    expect(result.status).toBe(1)
    expect(result.stdout).toMatch(/xy:\s+8 emitted \/ 0 handled/)
    expect(result.stderr).toContain("SSR will drop these marks")
  })

  it("fails when a converter has a case for a non-existent scene type (svg-only drift)", () => {
    withSourceMutation(
      SCENE_TO_SVG,
      // Inject a phantom case branch in xySceneNodeToSVG. The phantom name
      // must be alphanumeric — the script's `case "(\w+)":` parser would
      // silently skip a hyphenated name, masking the test. Drift direction:
      // SVG → canvas (dead branch).
      (src) =>
        src.replace(
          /(case "point":)/,
          'case "phantomForTest": return null\n    $1'
        ),
      (sceneToSvgPath) => {
        const result = runCheck(sceneToSvgPath)
        expect(result.status).toBe(1)
        expect(result.stderr).toContain(
          'xySceneNodeToSVG has a `case "phantomForTest":` branch but no scene-node interface in the xy SceneNode union declares'
        )
        expect(result.stderr).toContain("likely dead code")
      }
    )
  })

  it("restores parity after both simulated drifts (test isolation sanity check)", () => {
    // If the previous tests' restore logic ever leaked, the green pass at
    // the top would have failed. This test reasserts the green state at the
    // end of the file as an explicit ordering guard.
    const result = runCheck()
    expect(result.status, result.stderr).toBe(0)
  })
})
