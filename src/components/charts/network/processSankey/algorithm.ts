// Process Sankey layout algorithm — public barrel.
//
// Types live in processSankeyTypes; validation, mass simulation, band paths,
// and multi-pass orchestration are separate modules. This file re-exports the
// public surface so existing `from "./algorithm"` imports stay stable.

export type {
  ProcessSankeyNode,
  ProcessSankeyEdge,
  ProcessSankeyIssueSeverity,
  ProcessSankeyIssue,
  ProcessSankeySample,
  AttachmentSide,
  AttachmentKind,
  ProcessSankeyAttachment,
  ProcessSankeyNodeData,
  ProcessSankeySlotPeak,
  ProcessSankeySlotOccupant,
  ProcessSankeySlot,
  ProcessSankeyLaneLifetime,
  ProcessSankeySideRecord,
  ProcessSankeyLayout,
  ProcessSankeyLayoutQuality,
  ProcessSankeyRibbonLane,
  ProcessSankeyOptions,
  ProcessSankeyEdgeIndex,
} from "./processSankeyTypes"

export {
  processSankeyIssueSeverity,
  partitionProcessSankeyIssues,
  validateProcessSankey,
  formatProcessSankeyIssue,
  resolveProcessSankeyValidationPolicy,
  applyProcessSankeyValidationPolicy,
  PROCESS_SANKEY_VALIDATION_POLICY,
} from "./validation"
export type {
  ProcessSankeyUsageMode,
  ProcessSankeyValidationPolicy,
} from "./validation"

export {
  buildEdgeIndex,
  assignSides,
  computeNode,
  assignSameSlotHandoffSides,
  collectEndpointPositions,
  hasResolvableAttachmentTies,
  rebalanceOutgoingSides,
} from "./massSimulation"
export type { ProcessSankeyEndpointPositions } from "./massSimulation"

export {
  clampTime,
  clampSamples,
  attachmentYRange,
  buildBandPath,
  buildBandCutoutsForNode,
} from "./bandPaths"
export type { BandGradientStub } from "./bandPaths"

export { computeLaneLayout, computeProcessSankeyLayout } from "./layoutOrchestrator"

export { countCrossings, totalEdgeLength } from "./ordering"

export {
  diagnoseProcessSankeyLayout,
  diagnoseProcessSankeyProps,
  explainProcessSankeyLayout,
  PROCESS_SANKEY_QUALITY_THRESHOLDS,
} from "./layoutQualityProduct"
