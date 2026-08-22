/**
 * semiotic/evidence — portable evidence envelopes and publication gates.
 *
 * Keep this separate from chart family entries: production rendering should
 * not load provenance tooling unless a route asks for it.
 */
export {
  CHART_EVIDENCE_ENVELOPE_VERSION,
  fromEvidenceEnvelope,
  stableEvidenceHash,
  toEvidenceEnvelope,
} from "./evidence/chartEvidenceEnvelope"
export type {
  ChartEvidenceEnvelope,
  EnvelopeAccessSection,
  EnvelopeAuditSection,
  EnvelopeChartSection,
  EnvelopeInputSection,
  EnvelopeLimitsSection,
  EnvelopeMeaningClaim,
  EnvelopeMeaningSection,
  EnvelopeModalityChecks,
  EnvelopeRenderSection,
  EnvelopeTransformOperation,
  EnvelopeTransformSection,
  EvidenceEnvelopeOptions,
  ModalityConflict,
  ModalityObservation,
} from "./evidence/chartEvidenceEnvelope"
export {
  evaluateEvidenceGate,
} from "./evidence/evidenceGate"
export type {
  EvidenceGateFinding,
  EvidenceGateOptions,
  EvidenceGateResult,
  EvidenceGateStatus,
} from "./evidence/evidenceGate"
