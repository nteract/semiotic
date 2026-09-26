import React, { useEffect, useRef, useState } from "react"
import { NetworkCustomChart } from "../../dist/network.module.min.js"
import {
  flextreeLayout,
  dagreLayout
} from "../../dist/semiotic-recipes.module.min.js"

const nodes = [
  {
    id: "root",
    label: "Root",
    x: -100,
    y: -100,
    width: 100,
    height: 40,
    data: { label: "Nested" }
  },
  { id: "leaf", label: "Leaf", x: 100, y: 100, width: 100, height: 80 }
]
const edges = [{ source: "root", target: "leaf", label: "Root to Leaf" }]
const margin = { left: 20, right: 20, top: 20, bottom: 20 }
const config = { labelAccessor: (datum) => datum.label }

function Chart({ name, layout, width, push }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!push) return
    ref.current.clear()
    ref.current.pushMany(edges)
    for (const node of nodes) ref.current.update(node.id, () => node)
  }, [push])
  return (
    <section data-testid={name}>
      <NetworkCustomChart
        ref={ref}
        nodes={push ? undefined : nodes}
        edges={push ? undefined : edges}
        layout={layout}
        layoutConfig={config}
        width={width}
        height={280}
        margin={margin}
        title={`${name} tree`}
        description="Externally positioned nodes with negative coordinates."
        tooltip={(datum) => (
          <div>
            {datum.label}
            {datum.id === "root" ? ` (${datum.data.label})` : ""}
          </div>
        )}
      />
    </section>
  )
}

export default function PositionedNetworks() {
  const [width, setWidth] = useState(500)
  const push = new URLSearchParams(location.search).get("input") === "push"
  return (
    <main>
      <button onClick={() => setWidth(280)}>Resize charts</button>
      <Chart
        name="flextree"
        layout={flextreeLayout}
        width={width}
        push={push}
      />
      <Chart name="dagre" layout={dagreLayout} width={width} push={push} />
    </main>
  )
}
