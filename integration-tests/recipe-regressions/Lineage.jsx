import React, { useEffect, useRef, useState } from "react"
import { NetworkCustomChart } from "../../dist/network.module.min.js"
import { lineageDagLayout } from "../../dist/semiotic-recipes.module.min.js"

const nodes = [
  { id: "a", x: -1, y: 0, label: "Source", data: { label: "Nested" } },
  { id: "b", x: 0, y: 1, label: "Process" },
  { id: "c", x: 1, y: 2, label: "Sink" },
  { id: "d", x: -1, y: 2, label: "Feedback" }
]
const edges = [
  { source: "a", target: "b", label: "Source to process" },
  { source: "b", target: "c", label: "Process to sink" },
  { source: "c", target: "d", label: "Return loop" },
  { source: "a", target: "a", label: "Source loop" }
]
const margin = { left: 20, right: 20, top: 40, bottom: 20 }

export default function Lineage() {
  const [width, setWidth] = useState(660)
  const ref = useRef(null)
  const params = new URLSearchParams(location.search)
  const push = params.get("input") === "push"
  useEffect(() => {
    window.lineageScene = () => ref.current.getCustomLayout()
    if (!push) return
    ref.current.pushMany(edges)
    for (const node of nodes) ref.current.update(node.id, () => node)
  }, [push])
  return (
    <main>
      <button onClick={() => setWidth(360)}>Resize chart</button>
      <section data-testid="lineage">
        <NetworkCustomChart
          ref={ref}
          nodes={push ? undefined : nodes}
          edges={push ? undefined : edges}
          layout={lineageDagLayout}
          width={width}
          height={340}
          margin={margin}
          title="Directed lineage"
          description="Negative layers, uncentered rows and inferred cycles."
          tooltip={(datum) => (
            <div>
              {datum.label}
              {datum.id === "a" ? ` (${datum.data.label})` : ""}
            </div>
          )}
        />
      </section>
    </main>
  )
}
