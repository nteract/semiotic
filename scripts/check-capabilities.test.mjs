/** Run: node --test scripts/check-capabilities.test.mjs */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"
import {
  sourceWiresPushHandle,
  readCapabilityWiring,
  capabilitySignals
} from "./lib/capabilitySourceChecks.mjs"

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
  it("follows invoked prop mappers without following comments or unused imports", () => {
    const source = `
      import { chartProps as map } from "./exampleChartProps"
      import { otherProps } from "./unusedChartProps"
      // from "./commentedChartProps"
      const props = map(input)
    `
    assert.deepEqual(
      [...readCapabilityWiring(source).modules],
      ["./exampleChartProps"]
    )
  })
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

  it("recognizes the invoked aggregation bridge and verifies its imperative implementation", () => {
    assert.equal(
      sourceWiresPushHandle(
        'import { useRealtimeLineIngestion } from "./useRealtimeLineIngestion"'
      ),
      false
    )
    assert.equal(
      sourceWiresPushHandle(
        'import { useRealtimeLineIngestion } from "./useRealtimeLineIngestion"; useRealtimeLineIngestion(ref, frameRef, windowSize, props)'
      ),
      true
    )
    assert.equal(
      sourceWiresPushHandle("useRealtimeLineIngestionFactory(ref)"),
      false
    )
    const bridge = readFileSync(
      resolve(realtimeDir, "useRealtimeLineIngestion.ts"),
      "utf8"
    )
    assert.equal(sourceWiresPushHandle(bridge), true)
  })

  it("recognizes the size-encoding handle only when it is invoked", () => {
    assert.equal(
      sourceWiresPushHandle(
        'import { useSizeEncoding } from "./useSizeEncoding"'
      ),
      false
    )
    assert.equal(
      sourceWiresPushHandle(
        'import { useSizeEncoding } from "../shared/useSizeEncoding"; useSizeEncoding(ref, frameRef, options)'
      ),
      true
    )
    assert.equal(sourceWiresPushHandle("useSizeEncodingFactory(ref)"), false)
  })

  it("recognizes all five size-encoded charts through their imperative bridge", () => {
    for (const chart of [
      "xy/BubbleChart",
      "xy/QuadrantChart",
      "xy/Scatterplot",
      "ordinal/SwarmPlot",
      "geo/ProportionalSymbolMap"
    ]) {
      const source = readFileSync(
        resolve(repoRoot, `src/components/charts/${chart}.tsx`),
        "utf8"
      )
      assert.equal(sourceWiresPushHandle(source), true, chart)
      assert.equal(
        sourceWiresPushHandle(
          source.replace(/\buseSizeEncoding\s*\(/g, "unwiredSizeEncoding(")
        ),
        false,
        `${chart} must invoke its bridge, not just import it`
      )
    }
    const bridge = readFileSync(
      resolve(repoRoot, "src/components/charts/shared/useSizeEncoding.ts"),
      "utf8"
    )
    assert.equal(sourceWiresPushHandle(bridge), true)
  })

  it("recognizes named and qualified React handle calls, including type arguments", () => {
    for (const callee of ["useImperativeHandle", "React.useImperativeHandle"]) {
      const imports =
        'import * as React from "react"; import { useImperativeHandle } from "react";'
      assert.equal(
        sourceWiresPushHandle(`${imports} ${callee}(ref, factory)`),
        true
      )
      assert.equal(
        sourceWiresPushHandle(
          `${imports} ${callee}<RealtimeFrameHandle, RealtimeLineChartHandle>(ref, factory)`
        ),
        true
      )
      assert.equal(sourceWiresPushHandle(`const handle = ${callee}`), false)
      assert.equal(sourceWiresPushHandle(`${callee}Factory(ref)`), false)
    }
    assert.equal(
      sourceWiresPushHandle('import { useImperativeHandle } from "react"'),
      false
    )
    assert.equal(sourceWiresPushHandle('import * as React from "react"'), false)
  })

  it("recognizes the source-model physics bridge only when it is invoked", () => {
    assert.equal(
      sourceWiresPushHandle(
        'import { usePhysicsChartData } from "./usePhysicsChartData"'
      ),
      false
    )
    for (const chart of [
      "GaltonBoardChart",
      "UnitPileChart",
      "CollisionSwarmChart"
    ]) {
      const source = readFileSync(
        resolve(repoRoot, `src/components/charts/physics/${chart}.tsx`),
        "utf8"
      )
      assert.equal(sourceWiresPushHandle(source), true)
    }
    const bridge = readFileSync(
      resolve(repoRoot, "src/components/charts/physics/usePhysicsChartData.ts"),
      "utf8"
    )
    assert.equal(sourceWiresPushHandle(bridge), true)
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
    assert.match(
      runtime,
      /export function useRealtimeFrameHandle(?:<[^>]+>)?\s*\(/
    )
    assert.equal(sourceWiresPushHandle(runtime), true)
  })

  it("resolves aliased imports, React namespaces and nested function types", () => {
    for (const source of [
      'import { useImperativeHandle as expose } from "react"; expose<{ push: (d: Datum) => void }>(ref, factory)',
      'import R from "react"; R.useImperativeHandle(ref, factory)',
      'import * as R from "react"; R["useImperativeHandle"](ref, factory)',
      'import { useSizeEncoding as size } from "../shared/useSizeEncoding"; size(ref, frame, options)',
      'import * as runtime from "./realtimeChartRuntime"; runtime.useRealtimeFrameHandle(ref, frame)'
    ])
      assert.equal(sourceWiresPushHandle(source), true, source)
  })

  it("rejects documentation, declarations, type-only imports and shadowed or unrelated bindings", () => {
    for (const source of [
      "// useImperativeHandle(ref, factory)",
      "/* useImperativeHandle(ref, factory) */",
      'const docs = "useImperativeHandle(ref, factory)"',
      "const docs = `useImperativeHandle(ref, factory)`",
      "function useImperativeHandle(ref, factory) {}",
      'import type { useImperativeHandle } from "react"; useImperativeHandle(ref, factory)',
      'import { type useImperativeHandle } from "react"; useImperativeHandle(ref, factory)',
      'import type * as React from "react"; React.useImperativeHandle(ref, factory)',
      'import { useImperativeHandle } from "react"; function chart(useImperativeHandle) { useImperativeHandle(ref, factory) }',
      'import * as React from "react"; function chart(React) { React.useImperativeHandle(ref, factory) }',
      "const object = { useImperativeHandle() {} }; object.useImperativeHandle()",
      'import { useImperativeHandle } from "unrelated"; useImperativeHandle(ref, factory)',
      'import { unrelated as useImperativeHandle } from "./runtime"; useImperativeHandle(ref, factory)'
    ])
      assert.equal(sourceWiresPushHandle(source), false, source)
  })

  it("requires calls and rendered wrappers for selection, and actual layout properties", () => {
    const signals = (source) => capabilitySignals(readCapabilityWiring(source))
    assert.deepEqual(
      signals(`
      import { useChartSetup, usePhysicsSelection } from "./hooks"
      import { PhysicsCustomChart } from "./PhysicsCustomChart"
      // useChartSetup(); usePhysicsSelection(); <PhysicsCustomChart layout={layout} />
      const docs = "customNetworkLayout"
      type Options = { customXYLayout: Layout }
    `),
      {
        push: false,
        physicsSelection: false,
        linkedHover: false,
        customLayout: false
      }
    )
    assert.equal(
      signals('import { useChartSetup as setup } from "./hooks"; setup(props)')
        .linkedHover,
      true
    )
    assert.equal(
      signals(
        'import { usePhysicsSelection as select } from "./hooks"; select(props)'
      ).physicsSelection,
      true
    )
    for (const render of [
      "<Chart layout={layout} />",
      "createElement(Chart, {layout})"
    ]) {
      assert.deepEqual(
        signals(
          `import { PhysicsCustomChart as Chart } from "./PhysicsCustomChart"; import {createElement} from "react"; const chart = ${render}`
        ),
        {
          push: false,
          physicsSelection: true,
          linkedHover: true,
          customLayout: true
        }
      )
    }
    assert.equal(
      signals("const props = { customNetworkLayout: layout }").customLayout,
      true
    )
  })
})
