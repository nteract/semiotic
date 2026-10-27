/** Portable compositional graph and layout DTOs. Coordinates are world or owner-local, never camera transformed. */
export type ID = string
export type JSONValue =
  null | boolean | number | string | JSONValue[] | { [key: string]: JSONValue }
export type Point = Readonly<{ x: number; y: number }>
export type Rect = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>
export type Side = "north" | "east" | "south" | "west"
export type FlowDirection = "LR" | "RL" | "TB" | "BT"
export type PortDirection = "in" | "out" | "inout"

export type LocalEndpointRef =
  | Readonly<{ kind: "node"; portId?: ID }>
  | Readonly<{ kind: "part"; partId: ID; portId?: ID }>
export interface EndpointRef {
  readonly nodeId: ID
  readonly endpoint: LocalEndpointRef
}
export interface Evidence {
  readonly basis:
    "declared" | "observed" | "inferred" | "illustrative" | "unknown"
  readonly precision: "exact" | "conservative" | "unknown"
  readonly runId?: ID
  readonly snapshotId?: ID
  readonly referenceIds?: readonly ID[]
}
export interface Port {
  readonly id: ID
  readonly direction: PortDirection
  readonly label?: string
  readonly channel?: string
  readonly valueType?: string // Opaque to the core; adapters validate compatibility.
}
export interface Part {
  readonly id: ID // Unique within its owner node, including nested parts.
  readonly parentPartId?: ID
  readonly kind?: string // field, record, cell, argument, metric, socket, etc.
  readonly label?: string
  readonly ports?: readonly Port[]
  readonly data?: JSONValue
}
export interface CompositionalNode {
  readonly id: ID
  // Default: explicit when an interface/transfers are declared; otherwise atomic.
  // Atomic permits whole-object traversal, NEVER wildcard expansion to its parts.
  readonly tracePolicy?: "atomic" | "explicit" | "opaque"
  readonly parentId?: ID // Node containment, never an implicit dependency edge.
  readonly kind?: string
  readonly label?: string
  readonly ports?: readonly Port[]
  readonly parts?: readonly Part[]
  readonly data?: JSONValue
}
export interface Connection {
  readonly id: ID // Required and graph-unique, including exact endpoint duplicates.
  readonly source: ID // Owner node IDs preserve existing source/target conventions.
  readonly target: ID
  readonly sourceEndpoint?: LocalEndpointRef // Omission means the whole source node.
  readonly targetEndpoint?: LocalEndpointRef
  readonly kind?: string // Domain-specific semantics; defaults to "unspecified".
  readonly evidence?: Evidence
  readonly data?: JSONValue
}
export interface Transfer {
  readonly id: ID // Graph-unique in the transfer namespace.
  readonly nodeId: ID
  readonly sources: readonly LocalEndpointRef[] // Nonempty.
  readonly target: LocalEndpointRef // ONE output: no accidental Cartesian product.
  readonly combination: "identity" | "all" | "any" | "unspecified"
  readonly kind?: string
  readonly evidence?: Evidence
}
export interface CompositionalGraph {
  readonly schemaVersion: "semiotic.compositional-graph.v0.1"
  readonly graphId: ID
  readonly revision: ID
  readonly nodes: readonly CompositionalNode[]
  readonly edges: readonly Connection[]
  readonly transfers?: readonly Transfer[]
}

export type OrderPolicy =
  | Readonly<{ mode: "fixed"; ids: readonly ID[] }>
  | Readonly<{ mode: "optimize"; initialIds: readonly ID[] }>
  | Readonly<{
      mode: "within-groups"
      groups: readonly Readonly<{
        id: ID
        ids: readonly ID[]
        fixed?: boolean
      }>[]
    }>
export type PartLayout =
  | Readonly<{
      kind: "rows"
      order: OrderPolicy
      headerHeight: number
      padding: Readonly<{
        top: number
        right: number
        bottom: number
        left: number
      }>
      rowGap: number
      defaultRowHeight: number
      rowHeights?: readonly Readonly<{ partId: ID; height: number }>[]
    }>
  | Readonly<{ kind: "custom"; geometryKey: ID }>
export interface NodePresentation {
  readonly nodeId: ID
  readonly mode: "composite" | "exploded" | "wires" | "summary"
  readonly footprint: "stable" | "reflow"
  readonly partLayout?: PartLayout
  readonly rendererId?: ID
  readonly showContainer?: boolean
}
export type AnchorBinding =
  | Readonly<{ kind: "part-side"; partId: ID; side: Side; fraction?: number }>
  | Readonly<{ kind: "node-side"; side: Side; fraction?: number }>
  | Readonly<{ kind: "named-mark"; markId: ID; anchorName: ID }>
  | Readonly<{ kind: "point"; point: Point; normal: Point }>
  | Readonly<{ kind: "slot"; groupId: ID; slotId: ID; side: Side }>
export interface EndpointAnchorSpec {
  readonly ref: EndpointRef
  readonly use: "source" | "target"
  readonly binding: AnchorBinding
  readonly constraint: "fixed-position" | "fixed-order" | "fixed-side" | "free"
}
export interface NodeConstraint {
  readonly nodeId: ID
  readonly rank?: number
  readonly position?: Point
  readonly pin?: "x" | "y" | "both"
}
export interface EdgeLayoutHint {
  readonly edgeId: ID
  /** Same-owner connections default to none; auto explicitly routes them. */
  readonly route?: "auto" | "none"
  readonly priority?: number // Nonnegative, finite; not data magnitude.
  readonly laneId?: ID // Authored continuity preference, not inferred lineage.
  readonly alignment?: "auto" | "prefer" | "none" // Soft perpendicular-axis alignment.
  readonly bundleGroup?: ID
}
export interface PortOrderConstraint {
  readonly nodeId: ID
  readonly partId?: ID // Omitted for ports on the node interface itself.
  readonly side: Side
  readonly use: "source" | "target"
  readonly order: OrderPolicy // IDs refer to ports within this interface, not parts.
}
export interface BoundaryExposure {
  readonly id: ID
  readonly containerNodeId: ID
  readonly inner: EndpointRef
  readonly use: "source" | "target"
  readonly binding: AnchorBinding // In the container's local coordinates.
}
export interface CompositionalView {
  readonly revision: ID
  readonly direction: FlowDirection
  readonly nodes: readonly NodePresentation[]
  readonly anchors?: readonly EndpointAnchorSpec[]
  readonly portOrders?: readonly PortOrderConstraint[]
  readonly constraints?: readonly NodeConstraint[]
  readonly edgeHints?: readonly EdgeLayoutHint[]
  readonly boundaryExposures?: readonly BoundaryExposure[]
}

export interface MeasuredPart {
  readonly partId: ID
  readonly rect: Rect // In the immediate OWNER NODE's coordinates, not its parent part.
}
export interface MeasuredMarkAnchor {
  readonly markId: ID
  readonly anchorName: ID
  readonly point: Point
  readonly normal: Point
}
export interface MeasuredSlotAnchor {
  readonly groupId: ID
  readonly slotId: ID
  readonly point: Point
  readonly normal: Point
}
export interface NodeMeasure {
  readonly nodeId: ID
  readonly width: number
  readonly height: number
  readonly parts: readonly MeasuredPart[]
  readonly markAnchors?: readonly MeasuredMarkAnchor[]
  readonly slotAnchors?: readonly MeasuredSlotAnchor[]
  readonly actualPartOrder?: readonly ID[]
  // Node-local, explicitly permitted terminal corridors for interior mark anchors.
  readonly routingChannels?: readonly Rect[]
  readonly obstacleRects?: readonly Rect[]
}
export interface GeometrySnapshot {
  readonly revision: ID
  readonly basis: "authored" | "measured" | "estimated"
  readonly nodes: readonly NodeMeasure[]
}
export interface Diagnostic {
  readonly code: string
  readonly severity: "info" | "warning" | "error"
  readonly message: string
  readonly nodeIds?: readonly ID[]
  readonly edgeIds?: readonly ID[]
  readonly endpointRefs?: readonly EndpointRef[]
  readonly constraintIds?: readonly ID[]
}
export interface PreparedCompositionalGraph {
  readonly schemaVersion: "semiotic.prepared-compositional-graph.v0.1"
  readonly graph: CompositionalGraph
  readonly semanticHash: string
  readonly diagnostics: readonly Diagnostic[]
  // Runtime adjacency indexes are deliberately NOT part of this portable DTO.
}
export interface LayoutOptions {
  readonly mode: "route-only" | "optimize"
  readonly topology: "strict-dag" | "feedback"
  readonly routing: "orthogonal" | "polyline" | "smooth" | "terminals" | "bump"
  readonly bundles: "none" | "parallel" | "overview"
  readonly rankGap: number
  readonly nodeGap: number
  readonly laneGap: number
  readonly terminalStub: number
  readonly obstaclePadding: number
  readonly maxSweeps: number
  readonly seed: number
  readonly weights?: Readonly<{
    crossings?: number
    alignment?: number
    length?: number
    bends?: number
    congestion?: number
    displacement?: number
    reorder?: number
  }>
}
export interface LayoutRequest {
  readonly requestId: ID
  readonly prepared: PreparedCompositionalGraph
  readonly view: CompositionalView
  readonly geometry: GeometrySnapshot
  readonly options: LayoutOptions
  readonly previous?: SolvedCompositionalLayout
}
export interface PlacedPart {
  /** Clipped by an explicit internal row viewport; accessible identity is retained. */
  readonly clipped?: boolean
  readonly partId: ID
  readonly semantic: EndpointRef
  readonly rect: Rect // Local to its placed display node, after any permitted reordering.
}
export interface PlacedNode {
  readonly id: ID // Projection/layout identity, not necessarily a semantic node ID.
  readonly semantic: EndpointRef
  readonly rect: Rect // World/plot coordinates before camera/margins.
  readonly partOrder?: readonly ID[]
  readonly parts?: readonly PlacedPart[]
  readonly markAnchors?: readonly MeasuredMarkAnchor[]
  readonly slotAnchors?: readonly MeasuredSlotAnchor[]
}
export interface TerminalGeometry {
  readonly edgeId: ID
  readonly end: "source" | "target"
  readonly semantic: EndpointRef
  readonly displayNodeId: ID
  readonly anchor: Point
  readonly escape: Point
  readonly normal: Point
  readonly precision: "exact" | "proxy"
  readonly exposureId?: ID
}
export type PathCommand =
  | Readonly<{ kind: "M" | "L"; point: Point }>
  | Readonly<{ kind: "C"; control1: Point; control2: Point; point: Point }>
export interface PathSection {
  readonly id: ID
  readonly points: readonly Point[] // At least two; authoritative routing skeleton.
  // Optional final smooth geometry: the SAME commands drive paint, picking and bounds.
  // Omitted or empty commands use the authoritative points skeleton.
  readonly commands?: readonly PathCommand[]
  readonly bounds: Rect // Includes actual final geometry, including cubic control envelopes.
}
export interface RoutedConnection {
  /** Preserved by local scroll projection; absent on legacy engine results. */
  readonly routing?: LayoutOptions["routing"] | "none"
  readonly edgeId: ID
  readonly source: TerminalGeometry
  readonly target: TerminalGeometry
  readonly sections: readonly PathSection[]
  readonly bounds: Rect
  readonly feedback: boolean
}
export interface BundleGeometry {
  readonly id: ID
  readonly kind: "parallel" | "overview"
  readonly memberEdgeIds: readonly ID[] // Exact members of this visible mark.
  readonly selectedMemberEdgeIds?: readonly ID[]
  readonly path: readonly PathSection[]
  readonly count: number
  readonly countStatus: "exact" | "at-least"
  readonly semanticKind: string // Do not merge dependency roles silently.
}
export interface LayoutMetrics {
  readonly crossings: number
  /** Length of undeclared shared routing segments, excluding common terminal stubs. */
  readonly channelCongestion: number
  readonly alignmentError: number
  readonly totalRouteLength: number
  readonly bendCount: number
  readonly nodeDisplacement: number
  readonly reorderedParts: number
  readonly hardConstraintViolations: number
  readonly routedEdgeCount: number
  readonly omittedEdgeCount: number
  readonly completedSweeps: number
}
export interface SolvedCompositionalLayout {
  readonly schemaVersion: "semiotic.compositional-layout.v0.1"
  readonly requestId: ID
  readonly semanticHash: string
  readonly graphRevision: ID
  readonly viewRevision: ID
  readonly geometryRevision: ID
  readonly engineId: ID
  readonly engineVersion: string
  readonly optionsHash: string
  readonly status: "complete" | "degraded" | "infeasible"
  readonly nodes: readonly PlacedNode[]
  readonly edges: readonly RoutedConnection[]
  readonly bundles: readonly BundleGeometry[]
  readonly bounds: Rect
  readonly metrics: LayoutMetrics
  readonly diagnostics: readonly Diagnostic[]
}
export interface EngineCapabilities {
  readonly fixedPositions: boolean
  readonly fixedPortPositions: boolean
  readonly constrainedPartOrder: boolean
  readonly multiedges: boolean
  readonly compoundCrossHierarchy: boolean
  readonly orthogonalRouting: boolean
  /** Optional for compatibility with engines authored before terminal routing. */
  readonly terminalRouting?: boolean
  readonly bumpRouting?: boolean
  readonly deterministicSeed: boolean
}
export interface AsyncLayoutEngine {
  readonly id: ID
  readonly version: string
  readonly capabilities: EngineCapabilities
  layout(
    request: LayoutRequest,
    signal?: AbortSignal
  ): Promise<SolvedCompositionalLayout>
}
export interface TraceRequest {
  readonly start: EndpointRef
  readonly direction: "upstream" | "downstream"
  readonly kinds?: readonly string[]
  readonly maxVisited: number
  readonly maxDepth: number
  readonly boundaryPolicy?: "stop" | "conservative-node" // Default: stop.
}
export interface TraceResult {
  readonly endpoints: readonly EndpointRef[]
  readonly edgeIds: readonly ID[]
  readonly transferIds: readonly ID[]
  readonly completeness: "complete" | "partial" | "unknown"
  readonly boundaryRefs: readonly EndpointRef[]
  readonly diagnostics: readonly Diagnostic[]
}
export interface GraphPatch {
  readonly baseRevision: ID
  readonly revision: ID
  readonly upsertNodes?: readonly CompositionalNode[]
  readonly removeNodeIds?: readonly ID[]
  readonly upsertEdges?: readonly Connection[]
  readonly removeEdgeIds?: readonly ID[]
  readonly upsertTransfers?: readonly Transfer[]
  readonly removeTransferIds?: readonly ID[]
}
