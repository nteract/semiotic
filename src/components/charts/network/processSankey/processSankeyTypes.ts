// Canonical ProcessSankey public types. algorithm.ts re-exports these.

export interface ProcessSankeyNode {
  id: string
  /** Optional layout bond. Nodes with the same non-empty group occupy a
   * contiguous, zero-gutter slot block while remaining distinct bands. */
  group?: string
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
  /** Optional: time at which this unit of mass actually "arrived" at
   *  the SOURCE node (e.g., the hospital admit time for an ER patient
   *  whose transfer to ICU happens later at `startTime`). Purely a
   *  rendering hint — the layout/mass profile is unchanged. The
   *  renderer cuts a rectangular slot out of the source node's band
   *  from the node's left edge up to the scaled `systemInTime`, with
   *  height equal to this edge's ribbon thickness. Edges without
   *  `systemInTime` are drawn as-is. Result: a staircase profile on
   *  the source side as units enter the system one by one.
   *  Default: undefined. */
  systemInTime?: number
  /** Optional: time at which this unit of mass leaves the TARGET node
   *  (e.g., the discharge time for a patient who arrived at the ward
   *  at `endTime`). Symmetric to `systemInTime`: the renderer cuts a
   *  rectangular slot out of the target node's band from the scaled
   *  `systemOutTime` to the node's right edge, with height equal to
   *  this edge's ribbon thickness. Layout/mass profile unchanged.
   *  Default: undefined. */
  systemOutTime?: number
}

export type ProcessSankeyIssueSeverity = "fatal" | "warn"

export interface ProcessSankeyIssue {
  kind: string
  /** Fatal issues block layout; warnings still allow rendering. @default inferred by kind */
  severity?: ProcessSankeyIssueSeverity
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
  /** Mass-space offset of the boundary between the two stacking sides.
   * Synthetic side transfers move this boundary so they can rebalance the
   * bookkeeping without translating the visible node band. */
  boundaryOffset?: number
}

export type AttachmentSide = "top" | "bot"
export type AttachmentKind = "in" | "out"

export interface ProcessSankeyAttachment {
  side: AttachmentSide
  time: number
  sideMassBefore: number
  sideMassAfter: number
  kind: AttachmentKind
  value: number
  /** Boundary offset at the instant this ribbon attaches. */
  boundaryOffset?: number
}

export interface ProcessSankeyNodeData {
  samples: ProcessSankeySample[]
  peak: number
  topPeak: number
  botPeak: number
  localAttachments: Map<string, ProcessSankeyAttachment>
}

export interface ProcessSankeySlotPeak {
  topPeak: number
  botPeak: number
}

export interface ProcessSankeySlotOccupant {
  id: string
  /** End of the occupied band window used for temporal row reuse. */
  end: number
}

export interface ProcessSankeySlot {
  peak: ProcessSankeySlotPeak
  occupants: ProcessSankeySlotOccupant[]
  /** Shared node-group key for this reusable row, when bonded. */
  group?: string
}

export interface ProcessSankeyLaneLifetime {
  start: number | null
  end: number | null
}

export interface ProcessSankeySideRecord {
  sourceSide?: AttachmentSide
  targetSide?: AttachmentSide
}

export interface ProcessSankeyLayout {
  nodeData: Record<string, ProcessSankeyNodeData>
  sides: Map<string, ProcessSankeySideRecord>
  valueScale: number
  padding: number
  compressedPadding: boolean
  centerlines: Record<string, number>
  laneLifetime: Record<string, ProcessSankeyLaneLifetime>
  slots: ProcessSankeySlot[]
  slotByNode: Record<string, number>
  crossingsBefore: number | null
  crossingsAfter: number | null
  lengthBefore: number | null
  lengthAfter: number | null
  /** Complete quality measurement for the initial packed slot order. */
  layoutQualityBefore: ProcessSankeyLayoutQuality
  /** Complete quality measurement for the selected order and placement. */
  layoutQuality: ProcessSankeyLayoutQuality
}

export interface ProcessSankeyLayoutQuality {
  crossings: number
  /** Edge value × slot-index distance. */
  weightedLength: number
  /** Edge value × rendered centerline distance in pixels. */
  pixelLength: number
  /** Value-weighted coverage of intermediate lane bands by ribbons. */
  transitOcclusion: number
  /** Fraction of plot height occupied by the outer band envelope. */
  verticalUtilization: number
}

/** Control-point placement along a ribbon: prefer source, target, or midpoint. */
export type ProcessSankeyRibbonLane = "source" | "target" | "both"

export interface ProcessSankeyOptions {
  plotH: number
  pairing?: "value" | "temporal"
  packing?: "off" | "reuse"
  laneOrder?: "insertion" | "crossing-min" | "inside-out" | "crossing-min+inside-out"
  lifetimeMode?: "full" | "half"
  /** Cap band inflation in pixels per value unit. Unset preserves the legacy
   * fill-the-plot scale. */
  maxValueScale?: number
  /** Optional slack-aware coordinate assignment. @default "stack" */
  lanePlacement?: "stack" | "hug"
  /** Pixels between adjacent slots in the same node group. @default 0 */
  groupPadding?: number
  /** Renderer control-point placement, used by authored-window transit quality. */
  ribbonLane?: ProcessSankeyRibbonLane
  /** Visible time extent, used to crop transit quality to rendered ribbons. */
  domain?: [number, number]
}

export interface ProcessSankeyEdgeIndex {
  incoming: Record<string, ProcessSankeyEdge[]>
  outgoing: Record<string, ProcessSankeyEdge[]>
}
