import type { Datum } from "../charts/shared/datumTypes"
import type {
  EvaluateChartOptions,
  EvaluateChartResult
} from "../ai/evaluateChart"
import type { ArtifactPolicyException, ArtifactPolicyInput } from "./policies"
import type {
  RepresentationCandidate,
  RepresentationRecommendation
} from "./representation"
import type { ClaimAudit } from "./claims"
import type { TemporalAudit } from "./temporal"
import type { ArtifactContractValidation } from "./contract"
import type { ArtifactContract, ObligationResult } from "./types"

export interface RepairProposal {
  id: string
  category?: "identity" | "configuration" | "contract"
  path?: string
  action: string
  reason: string
  changesClaim: boolean
}

export interface EvaluateArtifactOptions extends EvaluateChartOptions {
  data?: ReadonlyArray<Datum>
  policy?: ArtifactPolicyInput
  exceptions?: ReadonlyArray<ArtifactPolicyException>
  now?: string
  recommendRepresentation?: boolean
}

export interface ArtifactEvaluation {
  /** Conditional results retain open work and are not publication approval. */
  status: "acceptable" | "conditional" | "refuse"
  policy: {
    id: string
    version: string
    appliedExceptions: ArtifactPolicyException[]
    rejectedExceptions: ArtifactPolicyException[]
  }
  validation: {
    artifact: ArtifactContractValidation
    chart: EvaluateChartResult["validation"]
  }
  data: EvaluateChartResult["data"]
  claims: ClaimAudit
  temporal: TemporalAudit
  accessibility: EvaluateChartResult["accessibility"]
  design: EvaluateChartResult["deception"]
  render?: EvaluateChartResult["evidence"]
  obligations: ObligationResult[]
  recommendation?: RepresentationRecommendation
  alternatives: RepresentationCandidate[]
  repairs: RepairProposal[]
  manualChecks: string[]
}

export interface ArtifactRepairLedgerEntry {
  id: string
  /** Distinguishes render/configuration work from contract and identity work. */
  category?: "identity" | "configuration" | "contract"
  path: string
  action: string
  reason: string
  applied: boolean
  changesClaim: boolean
  /** Ranked replacement from the deterministic chart-fit repair engine. */
  suggestedComponent?: string
  suggestedVariant?: string
}

export interface RepairArtifactOptions extends EvaluateArtifactOptions {
  /**
   * Fill absent identity fields only; never overwrite an existing binding.
   * Mismatches require an explicit revision and claim reassessment.
   * Defaults to proposal-only.
   */
  applySafeIdentityRepairs?: boolean
}

export interface ArtifactRepairResult {
  status: "unchanged" | "repaired" | "requires-input"
  component: string
  props: Datum
  contract: ArtifactContract
  before: ArtifactEvaluation
  after: ArtifactEvaluation
  ledger: ArtifactRepairLedgerEntry[]
}
