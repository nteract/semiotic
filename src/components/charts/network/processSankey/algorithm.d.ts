// Type declarations for the Process Sankey layout algorithm.

export interface ProcessSankeyNode {
  id: string
  /** Optional explicit lifetime bound [start, end]. Lifetime is
   *  `min(xExtent[0], earliestEdge)` to `max(xExtent[1], latestEdge)`. */
  xExtent?: [number, number]
}

export interface ProcessSankeyEdge {
  id: string
  source: string
  target: string
  value: number
  startTime: number
  endTime: number
}

export interface ProcessSankeyIssue {
  kind: string
  id?: string
  source?: string
  target?: string
  endpoint?: string
  nodeId?: string
}

export interface ProcessSankeySample {
  t: number
  topMass: number
  botMass: number
}

export interface ProcessSankeyAttachment {
  side: "top" | "bot"
  time: number
  sideMassBefore: number
  sideMassAfter: number
  kind: "in" | "out"
  value: number
}

export interface ProcessSankeyNodeData {
  samples: ProcessSankeySample[]
  peak: number
  topPeak: number
  botPeak: number
  localAttachments: Map<string, ProcessSankeyAttachment>
}

export interface ProcessSankeyLayout {
  nodeData: Record<string, ProcessSankeyNodeData>
  sides: Map<string, { sourceSide?: "top" | "bot"; targetSide?: "top" | "bot" }>
  valueScale: number
  padding: number
  compressedPadding: boolean
  centerlines: Record<string, number>
  laneLifetime: Record<string, { start: number | null; end: number | null }>
  slots: Array<{ peak: { topPeak: number; botPeak: number }; occupants: Array<{ id: string; end: number }> }>
  slotByNode: Record<string, number>
  crossingsBefore: number | null
  crossingsAfter: number | null
  lengthBefore: number | null
  lengthAfter: number | null
}

export interface ProcessSankeyOptions {
  plotH: number
  pairing?: "value" | "temporal"
  packing?: "off" | "reuse"
  laneOrder?: "insertion" | "crossing-min" | "inside-out" | "crossing-min+inside-out"
  lifetimeMode?: "full" | "half"
}

export function validateProcessSankey(
  nodes: ProcessSankeyNode[],
  edges: ProcessSankeyEdge[],
  domain: [number, number]
): ProcessSankeyIssue[]

export function formatProcessSankeyIssue(issue: ProcessSankeyIssue): string

export function computeProcessSankeyLayout(
  nodes: ProcessSankeyNode[],
  edges: ProcessSankeyEdge[],
  opts: ProcessSankeyOptions
): ProcessSankeyLayout

export function buildBandPath(
  samples: ProcessSankeySample[],
  cl: number,
  S: number,
  xScale: (t: number) => number,
  domain?: [number, number] | null
): string | null

export function buildRibbonPath(
  srcAtt: ProcessSankeyAttachment,
  srcCl: number,
  tgtAtt: ProcessSankeyAttachment,
  tgtCl: number,
  S: number,
  xScale: (t: number) => number,
  lane?: "source" | "target" | "both",
  domain?: [number, number] | null
): string

export function clampSamples(
  samples: ProcessSankeySample[],
  domain?: [number, number] | null
): ProcessSankeySample[]

export function clampTime(t: number, domain?: [number, number] | null): number

export function buildEdgeIndex(
  nodes: ProcessSankeyNode[],
  edges: ProcessSankeyEdge[]
): { incoming: Record<string, ProcessSankeyEdge[]>; outgoing: Record<string, ProcessSankeyEdge[]> }
