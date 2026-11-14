import * as React from "react"
import { createRoot } from "react-dom/client"
import { ZoomableNetworkCustomChart } from "semiotic/network/zoom"
import type { ZoomableNetworkCustomChartHandle } from "semiotic/network/zoom"
import { packedClusterMatrix } from "semiotic/recipes"

declare global {
  interface Window {
    packedMatrixHandle: ZoomableNetworkCustomChartHandle | null
  }
}
const nodes = Array.from({ length: 120 }, (_, i) => ({
  id: `satellite-${i}`,
  column: i < 60 ? "A" : "B",
  row: i < 60 ? "one" : "two",
  size: i === 7 ? "n/a" : (i % 8) + 1
}))
const params = new URLSearchParams(location.search)
const pushed = params.has("push")
const config = {
  columnOrder: ["B"],
  rowOrder: ["two"],
  sizeAccessor: "size",
  rowMode:
    params.get("rows") === "stacked"
      ? ("stacked" as const)
      : ("banded" as const)
}

function Fixture() {
  const [width, setWidth] = React.useState(600)
  React.useEffect(() => {
    if (!pushed) return
    const handle = window.packedMatrixHandle!
    // Network push mode ingests edges, then enriches their endpoint records.
    handle.pushMany(
      nodes
        .slice(1)
        .map((node, i) => ({ source: nodes[i].id, target: node.id }))
    )
    let index = 0
    handle.update(
      nodes.map((node) => node.id),
      () => nodes[index++]
    )
  }, [])
  return (
    <>
      <button onClick={() => setWidth(360)}>Resize matrix</button>
      <ZoomableNetworkCustomChart
        ref={(handle) => {
          window.packedMatrixHandle = handle
        }}
        nodes={pushed ? undefined : nodes}
        edges={pushed ? undefined : []}
        layout={packedClusterMatrix}
        layoutConfig={config}
        width={width}
        height={400}
        margin={{ left: 20, right: 20, top: 40, bottom: 20 }}
        animate={false}
        frameProps={{
          renderAs: params.get("renderer") === "svg" ? "svg" : "canvas"
        }}
        tooltip={(d) => (
          <span>
            {String(d.id)}: {String(d.column)} / {String(d.row)}; size{" "}
            {String(d.size)}
          </span>
        )}
        title="Satellite matrix"
        description="120 satellites across two regions and orbits."
        accessibleTable={false}
      />
    </>
  )
}
createRoot(document.getElementById("root")!).render(<Fixture />)
