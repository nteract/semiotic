/** Experimental, browser-independent Network Resolution analysis and evidence. */
export {
  projectNodeResolutionStrip,
  projectEdgeWitnessGlyph,
  compareResolutionPolicies
} from "./recipes/atlas/resolution/glyphs"
// Experimental Network Resolution sidecar (schema 0.1).
export { prepareNetworkResolution } from "./recipes/atlas/resolution/prepare"
export {
  projectResolutionView,
  defaultResolutionView,
  resolutionRowOrder
} from "./recipes/atlas/resolution/project"
export type {
  ResolutionProjection,
  ResolutionMark
} from "./recipes/atlas/resolution/project"
export {
  getEdgeHistory,
  getCycleLedger,
  explainGroup,
  listBoundaryEdges,
  expandSourceSet
} from "./recipes/atlas/resolution/queries"
export {
  traceComponentPort,
  projectComponentCutaway
} from "./recipes/atlas/resolution/ports"
export { getEdgeAlternative } from "./recipes/atlas/resolution/witnesses"
export { exportResolutionEvidence } from "./recipes/atlas/resolution/evidence"
export { resolutionSelectionFields } from "./recipes/atlas/resolution/selection"
export {
  createResolutionRequest,
  handleResolutionRequest,
  beginResolutionRequest,
  cancelResolutionRequest,
  publishResolutionResponse
} from "./recipes/atlas/resolution/worker"
export type {
  ResolutionWorkerRequest,
  ResolutionWorkerResponse,
  ResolutionPublication
} from "./recipes/atlas/resolution/worker"
export type {
  PreparedNetworkResolution,
  ResolutionSpec,
  ResolutionBindings,
  ResolutionPage,
  ResolutionGroup,
  ResolutionViewSpec,
  EdgeHistory,
  PortPathQuery,
  PortPathResult,
  EdgeSemantics,
  PrepareResult as PrepareResolutionResult,
  CanonicalSelection as CanonicalResolutionSelection,
  SemanticTarget as ResolutionSemanticTarget
} from "./recipes/atlas/resolution/types"
