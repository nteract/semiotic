import React from "react"
import { createRoot } from "react-dom/client"
import { forceLayoutAsync } from "semiotic/recipes/core"
import { loadOptionalPhysicsPeer } from "semiotic/physics/matter"

// Model an application loading chart families on demand. This also exercises
// the consumer's own lazy chunks in addition to Semiotic's internal chunks.
const LineChart = React.lazy(() =>
  import("semiotic/xy").then(({ LineChart }) => ({ default: LineChart }))
)
const BarChart = React.lazy(() =>
  import("semiotic/ordinal").then(({ BarChart }) => ({ default: BarChart }))
)
const ProcessSankey = React.lazy(() =>
  import("semiotic/network").then(({ ProcessSankey }) => ({
    default: ProcessSankey
  }))
)
const UnitPileChart = React.lazy(() =>
  import("semiotic/physics").then(({ UnitPileChart }) => ({
    default: UnitPileChart
  }))
)

// The browser harness observes actual Worker messages independently. A
// successful synchronous fallback must not satisfy the worker checks.
declare global {
  interface Window {
    __semioticConsumer: { force: boolean; peer: boolean; error?: string }
  }
}
window.__semioticConsumer = { force: false, peer: false }
const data = [
  { x: 0, y: 2 },
  { x: 1, y: 5 },
  { x: 2, y: 3 }
]
const nodes = [
  { id: "source", category: "Person" },
  { id: "target", category: "Team" }
]
const edges = [
  { source: "source", target: "target", value: 3, startTime: 2, endTime: 8 }
]

createRoot(document.getElementById("root")!).render(
  <React.Suspense fallback={<p>Loading charts</p>}>
    <main>
      <section id="line">
        <LineChart
          data={data}
          xAccessor="x"
          yAccessor="y"
          width={400}
          height={240}
          title="Consumer line"
          description="Three observations"
          summary="Values rise then fall"
          accessibleTable
        />
      </section>
      <section id="bar">
        <BarChart
          data={[
            { category: "A", value: 3 },
            { category: "B", value: 5 }
          ]}
          categoryAccessor="category"
          valueAccessor="value"
          width={400}
          height={240}
          title="Consumer bars"
          description="Two categories"
          summary="B exceeds A"
          accessibleTable
        />
      </section>
      <section id="sankey">
        <ProcessSankey
          nodes={nodes}
          edges={edges}
          domain={[0, 10]}
          width={400}
          height={240}
          layoutExecution="worker"
          title="Consumer process"
          description="One transfer"
          summary="Source transfers three units to target"
          accessibleTable
        />
      </section>
      <section id="physics">
        <UnitPileChart
          data={[{ category: "A", value: 4 }]}
          size={[400, 240]}
          categoryAccessor="category"
          valueAccessor="value"
          unitValue={1}
          title="Consumer physics"
          description="Four units"
          summary="A contains four units"
          accessibleTable
          frameProps={{ simulationExecution: "worker" }}
        />
      </section>
    </main>
  </React.Suspense>
)

forceLayoutAsync(nodes, edges, { execution: "worker", iterations: 2, seed: 1 })
  .then((positions) => {
    if (
      !Number.isFinite(positions.source?.x) ||
      !Number.isFinite(positions.target?.y)
    ) {
      throw new Error("Force worker returned invalid positions")
    }
    window.__semioticConsumer.force = true
  })
  .catch((error: Error) => {
    window.__semioticConsumer.error = error.message
  })

// Prove the generic runtime loader survives consumer compilation instead of
// being replaced with webpack's empty dynamic-import context.
loadOptionalPhysicsPeer({
  engine: "fixture",
  importPath: "fixture",
  installCommand: "fixture",
  packageName: "data:text/javascript,export const consumerProbe = 42"
})
  .then((module) => {
    if ((module as { consumerProbe?: number }).consumerProbe !== 42)
      throw new Error("Runtime import was rewritten")
    window.__semioticConsumer.peer = true
  })
  .catch((error: Error) => {
    window.__semioticConsumer.error = error.message
  })
