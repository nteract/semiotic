import { createElement } from "react"
import { LineChart } from "semiotic"
import { ForceDirectedGraph } from "semiotic/network"
import { StreamPhysicsFrame } from "semiotic/physics"
import {
  forceLayoutAsync,
  type ForceLayoutAsyncOptions,
} from "semiotic/recipes"

type Node = { id: string; group: string }
type Edge = { source: string; target: string }

const nodes: Node[] = [
  { id: "source", group: "core" },
  { id: "target", group: "leaf" },
]
const edges: Edge[] = [{ source: "source", target: "target" }]

const forceOptions = {
  execution: "worker",
  iterations: 2,
} satisfies ForceLayoutAsyncOptions

const workerLayout: Promise<Record<string, { x: number; y: number }>> =
  forceLayoutAsync(nodes, edges, forceOptions)

const lineChart = createElement(LineChart, {
  data: [
    { month: "Jan", revenue: 12 },
    { month: "Feb", revenue: 18 },
  ],
  xAccessor: "month",
  yAccessor: "revenue",
})

const networkChart = createElement(ForceDirectedGraph<Node, Edge>, {
  nodes,
  edges,
  layoutExecution: "worker",
})

const physicsChart = createElement(StreamPhysicsFrame, {
  initialSpawns: [
    { id: "ball", x: 0, y: 0, shape: { type: "circle", radius: 3 } },
  ],
  simulationExecution: "worker",
})

export { lineChart, networkChart, physicsChart, workerLayout }
