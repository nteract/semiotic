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
const composedNodes = nodes.map(({ id, label, data }) => ({ id, label, data }))
const compose = (layout) => (ctx) => {
  for (const node of ctx.nodes) {
    const geometry = nodes.find((d) => d.id === node.id)
    Object.assign(node, {
      x: geometry.x,
      y: geometry.y,
      width: geometry.width,
      height: geometry.height
    })
  }
  for (const edge of ctx.edges)
    edge.points = [
      { x: -100, y: -80 },
      { x: -100, y: 60 },
      { x: 100, y: 60 }
    ]
  return layout(ctx)
}
const composedFlextree = compose(flextreeLayout)
const composedDagre = compose(dagreLayout)

function Chart({ name, layout, width, push, composed }) {
  const ref = useRef(null)
  const inputNodes = composed ? composedNodes : nodes
  useEffect(() => {
    if (!push) return
    ref.current.clear()
    ref.current.pushMany(edges)
    for (const node of inputNodes) ref.current.update(node.id, () => node)
  }, [push, inputNodes])
  return (
    <section data-testid={name}>
      <NetworkCustomChart
        ref={ref}
        nodes={push ? undefined : inputNodes}
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
  const composed =
    new URLSearchParams(location.search).get("geometry") === "wrapper"
  return (
    <main>
      <button onClick={() => setWidth(280)}>Resize charts</button>
      <Chart
        name="flextree"
        layout={composed ? composedFlextree : flextreeLayout}
        width={width}
        push={push}
        composed={composed}
      />
      <Chart
        name="dagre"
        layout={composed ? composedDagre : dagreLayout}
        width={width}
        push={push}
        composed={composed}
      />
    </main>
  )
}
