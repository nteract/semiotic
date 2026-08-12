/** Run: node --test scripts/check-capabilities.test.mjs */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"
import { sourceWiresPushHandle } from "./lib/capabilitySourceChecks.mjs"

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptsDir, "..")
const realtimeDir = resolve(repoRoot, "src/components/charts/realtime")

const sharedRealtimeHelperFixture = `
  import { useRealtimeFrameHandle } from "./realtimeChartRuntime"
  export function RealtimeFixture(props, ref) {
    const frameRef = useRef(null)
    useRealtimeFrameHandle(ref, frameRef)
    return <StreamXYFrame ref={frameRef} {...props} />
  }
`

describe("check-capabilities push-handle detection", () => {
  it("recognizes an invoked shared realtime handle without treating its import as wiring", () => {
    assert.equal(sourceWiresPushHandle(sharedRealtimeHelperFixture), true)
    assert.equal(
      sourceWiresPushHandle(
        'import { useRealtimeFrameHandle } from "./realtimeChartRuntime"'
      ),
      false
    )
    assert.equal(
      sourceWiresPushHandle("useRealtimeFrameHandleFactory(ref)"),
      false
    )
  })

  it("recognizes typed bespoke React handles", () => {
    assert.equal(
      sourceWiresPushHandle(
        "useImperativeHandle<RealtimeFrameHandle, RealtimeLineChartHandle>(ref, factory)"
      ),
      true
    )
  })

  it("recognizes every realtime HOC and verifies the shared bridge is imperative", () => {
    for (const chart of [
      "RealtimeLineChart",
      "RealtimeHistogram",
      "RealtimeSwarmChart",
      "RealtimeWaterfallChart",
      "RealtimeHeatmap"
    ]) {
      const source = readFileSync(resolve(realtimeDir, `${chart}.tsx`), "utf8")
      assert.equal(
        sourceWiresPushHandle(source),
        true,
        `${chart} must wire its ref handle`
      )
    }

    const runtime = readFileSync(
      resolve(realtimeDir, "realtimeChartRuntime.ts"),
      "utf8"
    )
    assert.match(runtime, /export function useRealtimeFrameHandle\s*\(/)
    assert.match(runtime, /React\.useImperativeHandle\s*\(/)
  })
})
