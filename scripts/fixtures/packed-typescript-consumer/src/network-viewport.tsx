import { createRef } from "react"
import {
  NetworkCustomChart,
  StreamNetworkFrame,
  type NetworkViewportProps,
  type NetworkViewportSnapshot
} from "semiotic/network"
import { createLineageDagFit, lineageDagLayout } from "semiotic/recipes"
import { createLineageDagFit as createCoreFit } from "semiotic/recipes/core"

const nodes = [
  { id: "source", x: 0, y: 0 },
  { id: "target", x: 1, y: 0 }
]
const plot = { x: 0, y: 0, width: 600, height: 400 }
const main = createLineageDagFit(nodes, plot)
const mini = createCoreFit(
  nodes,
  { ...plot, width: 60, height: 40 },
  { lod: "dot" }
)
const logical = main.invert(100, 100)
export const minimapPoint = mini.project(logical.layer ?? 0, logical.row)

const scrollContainerRef = createRef<HTMLDivElement>()
const props: NetworkViewportProps = {
  viewport: { scrollContainerRef },
  htmlMarkCulling: { enabled: true, overscan: 0, pinnedIds: ["source"] },
  onViewportChange: (snapshot: NetworkViewportSnapshot) => {
    const mounted: readonly string[] = snapshot.mountedMarkIds
    const y: number | undefined = snapshot.visibleRect?.y
    void [mounted, y]
  }
}

export const chart = (
  <NetworkCustomChart
    nodes={nodes}
    edges={[]}
    layout={lineageDagLayout}
    frameProps={props}
  />
)
export const frame = (
  <StreamNetworkFrame
    chartType="force"
    nodes={nodes}
    edges={[]}
    customNetworkLayout={lineageDagLayout}
    {...props}
  />
)
