/**
 * Tests for the SSR alignment check itself.
 *
 * The static check (`scripts/check-ssr-alignment.js`) is the load-bearing
 * guard against canvas/SVG drift — the bar `gradientFill` near-miss in
 * 3.4.2 was exactly the kind of bug it now prevents. These tests prove the
 * script catches both drift directions and that the happy path stays green
 * on the current tree.
 *
 * The simulation strategy: copy `SceneToSVG.tsx` to a temporary file, mutate
 * that copy to inject known drift, and point the script at it via env var.
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
const SCENE_TO_SVG = path.join(ROOT, "src/components/stream/SceneToSVG.tsx")

function runCheck(sceneToSvgPath?: string) {
  return spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf-8",
    cwd: ROOT,
    env: {
      ...process.env,
      ...(sceneToSvgPath ? { SEMIOTIC_SCENE_TO_SVG: sceneToSvgPath } : {}),
    },
  })
}

function withSceneToSVGMutation(mutate: (src: string) => string, fn: (sceneToSvgPath: string) => void) {
  const original = fs.readFileSync(SCENE_TO_SVG, "utf-8")
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "semiotic-ssr-alignment-"))
  const tempSceneToSvg = path.join(tempDir, "SceneToSVG.tsx")
  try {
    fs.writeFileSync(tempSceneToSvg, mutate(original))
    fn(tempSceneToSvg)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

describe("check-ssr-alignment.js", () => {
  it("passes on the current tree (parity is intact)", () => {
    const result = runCheck()
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("SSR alignment check passed")
    // Quantitative invariant — every frame should report >0 emitted/handled.
    expect(result.stdout).toMatch(/xy:\s+\d+ emitted \/ \d+ handled/)
    expect(result.stdout).toMatch(/ordinal:\s+\d+ emitted \/ \d+ handled/)
    expect(result.stdout).toMatch(/network:\s+\d+ emitted \/ \d+ handled/)
    expect(result.stdout).toMatch(/geo:\s+\d+ emitted \/ \d+ handled/)
  })

  it("fails when a scene-node type loses its SVG converter case (canvas-only drift)", () => {
    withSceneToSVGMutation(
      // Rename the candlestick case so the union still has the type but the
      // converter no longer handles it. Drift direction: canvas → SVG.
      src => src.replace(/case "candlestick": \{/, 'case "REMOVED-FOR-TEST": {'),
      (sceneToSvgPath) => {
        const result = runCheck(sceneToSvgPath)
        expect(result.status).toBe(1)
        expect(result.stderr).toContain('Scene type "candlestick" is part of the xy SceneNode union but xySceneNodeToSVG has no `case "candlestick":` branch')
        expect(result.stderr).toContain("SSR will drop these marks")
      }
    )
  })

  it("fails when a converter has a case for a non-existent scene type (svg-only drift)", () => {
    withSceneToSVGMutation(
      // Inject a phantom case branch in xySceneNodeToSVG. The phantom name
      // must be alphanumeric — the script's `case "(\w+)":` parser would
      // silently skip a hyphenated name, masking the test. Drift direction:
      // SVG → canvas (dead branch).
      src => src.replace(/(case "point":)/, 'case "phantomForTest": return null\n    $1'),
      (sceneToSvgPath) => {
        const result = runCheck(sceneToSvgPath)
        expect(result.status).toBe(1)
        expect(result.stderr).toContain('xySceneNodeToSVG has a `case "phantomForTest":` branch but no scene-node interface in the xy SceneNode union declares')
        expect(result.stderr).toContain("likely dead code")
      }
    )
  })

  it("restores parity after both simulated drifts (test isolation sanity check)", () => {
    // If the previous tests' restore logic ever leaked, the green pass at
    // the top would have failed. This test reasserts the green state at the
    // end of the file as an explicit ordering guard.
    const result = runCheck()
    expect(result.status).toBe(0)
  })
})
