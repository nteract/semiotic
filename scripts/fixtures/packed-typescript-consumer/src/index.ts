import { createElement } from "react"
import { LineChart } from "semiotic"
import { ForceDirectedGraph } from "semiotic/network"
import { StreamPhysicsFrame } from "semiotic/physics"
import {
  forceLayoutAsync,
  type ForceLayoutAsyncOptions,
} from "semiotic/recipes"
import {
  allocateCells,
  balanceSnapshotsToFlows,
  type BalancedSnapshotsResult,
} from "semiotic/recipes/core"
import type { UnstableGofishDisplayListDocument } from "semiotic/experimental"
import { resolveResponsiveDimension } from "semiotic/utils/core"
import {
  useResponsiveSize,
  type ResponsiveSizeOptions,
} from "semiotic/utils/react"

// Resolve every concrete package export through NodeNext. This is deliberately
// type-only: the packed smoke already exercises runtime conditions separately,
// while this matrix catches declaration files that leak dev-only dependencies.
type PublicEntryPointSurfaceSmoke = [
  keyof typeof import("semiotic"),
  keyof typeof import("semiotic/ai"),
  keyof typeof import("semiotic/ai/core"),
  keyof typeof import("semiotic/controls"),
  keyof typeof import("semiotic/data"),
  keyof typeof import("semiotic/experimental"),
  keyof typeof import("semiotic/experimental/vacp"),
  keyof typeof import("semiotic/geo"),
  keyof typeof import("semiotic/network"),
  keyof typeof import("semiotic/ordinal"),
  keyof typeof import("semiotic/physics"),
  keyof typeof import("semiotic/physics/matter"),
  keyof typeof import("semiotic/physics/rapier"),
  keyof typeof import("semiotic/realtime"),
  keyof typeof import("semiotic/realtime/core"),
  keyof typeof import("semiotic/realtime/react"),
  keyof typeof import("semiotic/recipes"),
  keyof typeof import("semiotic/recipes/core"),
  keyof typeof import("semiotic/recipes/react"),
  keyof typeof import("semiotic/rough"),
  keyof typeof import("semiotic/server"),
  keyof typeof import("semiotic/server/edge"),
  keyof typeof import("semiotic/server/node"),
  keyof typeof import("semiotic/themes"),
  keyof typeof import("semiotic/themes/core"),
  keyof typeof import("semiotic/themes/react"),
  keyof typeof import("semiotic/utils"),
  keyof typeof import("semiotic/utils/core"),
  keyof typeof import("semiotic/utils/react"),
  keyof typeof import("semiotic/value"),
  keyof typeof import("semiotic/xy"),
]

type _AllPackedEntryPointsResolved = PublicEntryPointSurfaceSmoke

const experimentalGofishDocument: UnstableGofishDisplayListDocument = {
  irVersion: 0,
  ir: "gofish-display-list",
  viewport: { w: 1, h: 1 },
  items: [],
}

const allocated = allocateCells(
  [{ key: "alpha", weight: 1, label: "Alpha" as const }],
  10,
)
const allocationLabel: "Alpha" = allocated[0].label
const snapshotFlows: BalancedSnapshotsResult = balanceSnapshotsToFlows(
  [{ id: "alpha", value: 10 }],
  [{ id: "alpha", value: 10 }],
  {
    beforeId: (datum) => datum.id,
    beforeValue: (datum) => datum.value,
  },
)
const responsiveOptions: ResponsiveSizeOptions = { minWidth: 320, widthStep: 20 }
const responsiveWidth = resolveResponsiveDimension(357, 320, 720, 20)
type ResponsiveSizeHook = typeof useResponsiveSize

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

export {
  allocated,
  allocationLabel,
  experimentalGofishDocument,
  lineChart,
  networkChart,
  physicsChart,
  responsiveOptions,
  responsiveWidth,
  snapshotFlows,
  workerLayout,
}
export type { ResponsiveSizeHook }
