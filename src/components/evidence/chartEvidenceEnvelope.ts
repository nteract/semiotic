/**
 * ChartEvidenceEnvelope@1 — a portable provenance, access, render, meaning,
 * modality-check, audit, and limits ledger.
 *
 * The envelope composes existing Semiotic payloads. It does not replace them:
 * the Chart Access Contract becomes its reader-facing `access` section, render
 * evidence becomes its `render.evidence`, and reader grounding becomes
 * `meaning.grounding`. Model-authored observations are always attributed and
 * never promoted above deterministic evidence.
 */
import {
  CHART_ACCESS_CONTRACT_VERSION,
  createChartAccessContract,
  type ChartAccessContract,
  type StreamStatusInput
} from "../access/chartAccessContract"
import {
  buildReaderGrounding,
  type ChartReaderGrounding
} from "../ai/readerGrounding"
import { profileData } from "../ai/profileData"
import type { Datum } from "../charts/shared/datumTypes"
import {
  serializeArtifactContract,
  type PortableArtifactContract,
  type SerializedArtifactContract
} from "../artifact/serialization"
import {
  compareArtifactIdentity,
  type ArtifactIdentityBinding
} from "../artifact/identity"
import {
  ARTIFACT_CONTRACT_VERSION,
  type ArtifactContract
} from "../artifact/types"
import type { RenderEvidence } from "../server/renderEvidence"
import { stableEvidenceHash } from "./stableJsonHash"
import {
  normalizeSourceRecords,
  redactNavigationTree,
  redactProfileForEnvelope
} from "./evidenceEnvelopeInput"
import {
  validateEnvelopeAccessibilityAudit,
  validateEnvelopeArtifactAttachment,
  validateEnvelopeSceneHash
} from "./evidenceEnvelopeValidation"
export { stableEvidenceHash } from "./stableJsonHash"

export const CHART_EVIDENCE_ENVELOPE_VERSION = 1 as const
const ARTIFACT_TRANSFER_BINDING_VERSION = 2 as const
const LEGACY_ARTIFACT_TRANSFER_BINDING_VERSION = 1 as const

export interface EnvelopeChartSection {
  component: string
  surfaceVersion: string
  chartId?: string
}

export interface EnvelopeInputSection {
  source?: string
  rowCount: number
  profile: unknown
  hash?: string
}

export interface EnvelopeTransformOperation {
  operation: string
  options?: Record<string, unknown>
}

export interface EnvelopeTransformSection {
  operations: EnvelopeTransformOperation[]
  hash?: string
}

export interface EnvelopeRenderSection {
  mode: "svg" | "canvas" | "png" | "not-rendered"
  /** Version 2 identifies rendered SVG and coordinates; unversioned legacy hashes count marks only. */
  sceneHash?: string
  sceneHashVersion?: 2
  /** SHA-256 of markCountByType only; this does not identify rendered geometry. */
  markInventoryHash?: string
  imageHash?: string
  marksIntended?: number
  marksObserved?: number
  parity?: "match" | "mismatch" | "unknown"
  evidence?: RenderEvidence
}

export type EnvelopeAccessSection = ChartAccessContract

export interface EnvelopeMeaningClaim {
  claim: string
  evidenceIds?: string[]
  confidence?: number
  model?: string
  supported?: boolean
}

export interface EnvelopeMeaningSection {
  grounding: ChartReaderGrounding
  communicativeAct?: string
  claims?: EnvelopeMeaningClaim[]
}

export interface ModalityObservation {
  id: string
  channel: string
  finding: string
  severity?: "info" | "warning" | "error"
  model?: string
  confidence?: number
  evidenceRefs?: string[]
}

export interface ModalityConflict {
  id: string
  structuredFinding?: string
  visualFinding?: string
  resolution?: "structured" | "visual" | "human-review" | "unresolved"
  note?: string
}

export interface EnvelopeModalityChecks {
  structured: { observations: ModalityObservation[]; model: null }
  vision: { observations: ModalityObservation[]; model?: string }
  tandem: {
    agreements: ModalityObservation[]
    conflicts: ModalityConflict[]
    model?: string
  }
}

export interface EnvelopeAuditSection {
  accessibility?: unknown
  design?: unknown
  dataPitfalls?: unknown
  scorecard?: unknown
  humanReview?: {
    status: "not-run" | "passed" | "failed" | "manual-gap"
    protocol?: string
    browserMatrix?: string[]
    notes?: string[]
  }
}

export interface EnvelopeLimitsSection {
  uncertaintyShown?: boolean
  knownGaps: string[]
  unsupportedClaims: string[]
  privacyScope: Record<string, string[]>
}

export interface EvidenceEnvelopeOptions {
  surfaceVersion?: string
  chartId?: string
  sourceId?: string
  transformOperations?: EnvelopeTransformOperation[]
  ssrEvidence?: RenderEvidence
  accessContract?: ChartAccessContract
  streamStatus?: StreamStatusInput | Array<StreamStatusInput>
  streamHistoryLimit?: number
  inChartContainer?: boolean
  privacyScope?: Record<string, string[]>
  claims?: EnvelopeMeaningClaim[]
  modalityChecks?: Partial<EnvelopeModalityChecks>
  audits?: Omit<EnvelopeAuditSection, "accessibility">
  knownGaps?: string[]
  unsupportedClaims?: string[]
  uncertaintyShown?: boolean
  /** Optional interpretation contract preserved beside render evidence. */
  artifactContract?: PortableArtifactContract
}

export interface ChartEvidenceEnvelope {
  schemaVersion: typeof CHART_EVIDENCE_ENVELOPE_VERSION
  chart: EnvelopeChartSection
  input: EnvelopeInputSection
  transform: EnvelopeTransformSection
  render: EnvelopeRenderSection
  access: EnvelopeAccessSection
  meaning: EnvelopeMeaningSection
  modalityChecks: EnvelopeModalityChecks
  audit: EnvelopeAuditSection
  limits: EnvelopeLimitsSection
  artifact?: SerializedArtifactContract & {
    transferBindingVersion:
      | typeof LEGACY_ARTIFACT_TRANSFER_BINDING_VERSION
      | typeof ARTIFACT_TRANSFER_BINDING_VERSION
    transferFingerprint: string
    identityBinding?: ArtifactIdentityBinding
  }
}

type EnvelopeArtifactSection = NonNullable<ChartEvidenceEnvelope["artifact"]>

function artifactTransferFingerprint(
  artifact: SerializedArtifactContract & {
    transferBindingVersion?: 1 | 2
    identityBinding?: ArtifactIdentityBinding
  }
): string {
  const transferBindingVersion =
    artifact.transferBindingVersion ?? ARTIFACT_TRANSFER_BINDING_VERSION
  return stableEvidenceHash({
    kind: "semiotic.chart-evidence.artifact-transfer",
    envelopeVersion: CHART_EVIDENCE_ENVELOPE_VERSION,
    transferBindingVersion,
    contract: artifact.contract ?? null,
    transfer: artifact.transfer,
    ...(transferBindingVersion === ARTIFACT_TRANSFER_BINDING_VERSION
      ? { identityBinding: artifact.identityBinding ?? null }
      : {})
  })
}

function bindArtifactTransfer(
  artifact: SerializedArtifactContract,
  identityBinding: ArtifactIdentityBinding
): EnvelopeArtifactSection {
  const bound = { ...artifact, identityBinding }
  return {
    ...bound,
    transferBindingVersion: ARTIFACT_TRANSFER_BINDING_VERSION,
    transferFingerprint: artifactTransferFingerprint(bound)
  }
}

function artifactIdentityBinding(
  artifact: SerializedArtifactContract,
  component: string,
  props: Datum
): ArtifactIdentityBinding {
  return artifact.contract?.contractVersion === ARTIFACT_CONTRACT_VERSION &&
    artifact.transfer.status !== "invalid"
    ? compareArtifactIdentity(
        artifact.contract as ArtifactContract,
        props,
        component
      )
    : {
        status: "unknown",
        mismatchPaths: [],
        unknownPaths: ["artifactContract"]
      }
}

function countIntendedMarks(
  props: Record<string, unknown>
): number | undefined {
  const rows = props.data
  if (!Array.isArray(rows)) return undefined
  return rows.length
}

function observedMarkCount(evidence?: RenderEvidence): number | undefined {
  return evidence?.markCount
}

function inferRenderParity(input: {
  intended?: number
  observed?: number
  evidence?: RenderEvidence
}): "match" | "mismatch" | "unknown" {
  if (
    typeof input.intended !== "number" ||
    typeof input.observed !== "number"
  ) {
    return "unknown"
  }
  if (input.observed === 0 && input.intended > 0) return "mismatch"
  if (input.evidence?.status === "empty" && input.intended > 0)
    return "mismatch"
  return input.observed === input.intended ? "match" : "unknown"
}

/** Assemble a versioned evidence envelope from existing Semiotic payloads. */
export function toEvidenceEnvelope(
  component: string,
  props: Record<string, unknown>,
  options: EvidenceEnvelopeOptions = {}
): ChartEvidenceEnvelope {
  const rows = normalizeSourceRecords(component, props)
  const profile = profileData(rows as ReadonlyArray<Datum>, {
    rawInput: props
  })
  const inputHash = stableEvidenceHash({
    component,
    rowCount: rows.length,
    records: rows
  })
  const portableProfile = redactProfileForEnvelope(profile)
  const grounding = buildReaderGrounding(component, props as Datum)
  if (grounding.structure) {
    const redacted = redactNavigationTree(
      grounding.structure
    ) as ChartReaderGrounding["structure"]
    grounding.structure = redacted
  }
  const sourceAccess =
    options.accessContract ??
    createChartAccessContract({
      component,
      props,
      options: {
        navigable: false,
        inChartContainer: options.inChartContainer === true,
        streamStatus: options.streamStatus,
        streamHistoryLimit: options.streamHistoryLimit,
        ssrEvidence: options.ssrEvidence
      }
    })
  const access = {
    ...sourceAccess,
    navigation: {
      ...sourceAccess.navigation,
      ...(sourceAccess.navigation.tree
        ? { tree: redactNavigationTree(sourceAccess.navigation.tree) as NonNullable<ChartAccessContract["navigation"]["tree"]> }
        : {})
    }
  }
  const intendedMarks = countIntendedMarks(props)
  const observedMarks = observedMarkCount(options.ssrEvidence)
  const parity = inferRenderParity({
    intended: intendedMarks,
    observed: observedMarks,
    evidence: options.ssrEvidence
  })
  const modalityChecks = options.modalityChecks ?? {}
  const vision = modalityChecks.vision ?? { observations: [] }
  const tandem = modalityChecks.tandem ?? {
    agreements: [],
    conflicts: []
  }
  const transformOperations = options.transformOperations ?? []
  const attachedContract = options.artifactContract ?? options.ssrEvidence?.artifactContract
  const serializedArtifact = attachedContract
    ? serializeArtifactContract(attachedContract, {
        excludeEvidenceSamples: true
      })
    : undefined
  const artifact = serializedArtifact
    ? bindArtifactTransfer(
        serializedArtifact,
        artifactIdentityBinding(serializedArtifact, component, props)
      )
    : undefined

  return {
    schemaVersion: CHART_EVIDENCE_ENVELOPE_VERSION,
    chart: {
      component,
      surfaceVersion:
        options.surfaceVersion ?? String(CHART_EVIDENCE_ENVELOPE_VERSION),
      ...(options.chartId ? { chartId: options.chartId } : {})
    },
    input: {
      ...(options.sourceId ? { source: options.sourceId } : {}),
      rowCount: rows.length,
      profile: portableProfile,
      hash: inputHash
    },
    transform: {
      operations: transformOperations,
      hash: stableEvidenceHash(transformOperations)
    },
    render: {
      mode: options.ssrEvidence ? "svg" : "not-rendered",
      ...(options.ssrEvidence?.sceneHashVersion === 2 && options.ssrEvidence.sceneHash
        ? { sceneHash: options.ssrEvidence.sceneHash, sceneHashVersion: 2 as const }
        : {}),
      markInventoryHash: options.ssrEvidence
        ? stableEvidenceHash(options.ssrEvidence.markCountByType)
        : undefined,
      imageHash: undefined,
      marksIntended: intendedMarks,
      marksObserved: observedMarks,
      parity,
      ...(options.ssrEvidence ? { evidence: options.ssrEvidence } : {})
    },
    access,
    meaning: {
      grounding,
      ...(grounding.intent?.act
        ? { communicativeAct: grounding.intent.act }
        : {}),
      ...(options.claims ? { claims: options.claims } : {})
    },
    modalityChecks: {
      structured: {
        observations: modalityChecks.structured?.observations ?? [],
        model: null
      },
      vision: {
        observations: vision.observations ?? [],
        ...(vision.model ? { model: vision.model } : {})
      },
      tandem: {
        agreements: tandem.agreements ?? [],
        conflicts: tandem.conflicts ?? [],
        ...(tandem.model ? { model: tandem.model } : {})
      }
    },
    audit: {
      accessibility: access.evidence.audit,
      ...options.audits
    },
    limits: {
      uncertaintyShown: options.uncertaintyShown,
      knownGaps: options.knownGaps ?? [],
      unsupportedClaims: options.unsupportedClaims ?? [],
      privacyScope: options.privacyScope ?? {
        semantic: ["field names", "aggregates", "bounded navigation"],
        renderedSvg: ["visual geometry", "labels", "no raw rows by default"],
        dashboardScreenshot: ["everything visible; treat as broad disclosure"]
      }
    },
    ...(artifact ? { artifact } : {})
  }
}

/** Validate and restore an envelope without silently trusting malformed input. */
export function fromEvidenceEnvelope(value: unknown): ChartEvidenceEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Evidence envelope must be an object")
  }
  const envelope = value as Partial<ChartEvidenceEnvelope>
  if (envelope.schemaVersion !== CHART_EVIDENCE_ENVELOPE_VERSION) {
    throw new TypeError(
      `Unsupported evidence envelope schemaVersion: ${String(envelope.schemaVersion)}`
    )
  }
  for (const section of [
    "chart",
    "input",
    "transform",
    "render",
    "access",
    "meaning",
    "modalityChecks",
    "audit",
    "limits"
  ] as const) {
    if (!envelope[section] || typeof envelope[section] !== "object") {
      throw new TypeError(`Evidence envelope is missing section: ${section}`)
    }
  }
  if (envelope.access?.schemaVersion !== CHART_ACCESS_CONTRACT_VERSION) {
    throw new TypeError("Evidence envelope has an incompatible access contract")
  }
  const access = envelope.access as ChartAccessContract
  for (const section of [
    "text",
    "keyboard",
    "navigation",
    "table",
    "mediaPreferences",
    "streamStatus",
    "ssr",
    "evidence"
  ] as const) {
    if (!access[section] || typeof access[section] !== "object") {
      throw new TypeError(
        `Evidence envelope access section is missing: ${section}`
      )
    }
  }
  if (typeof access.table.enabled !== "boolean") {
    throw new TypeError("Evidence envelope access table state must be boolean")
  }
  validateEnvelopeAccessibilityAudit(
    envelope.audit?.accessibility,
    "audit.accessibility"
  )
  validateEnvelopeAccessibilityAudit(
    access.evidence.audit,
    "access.evidence.audit"
  )
  const chart = envelope.chart as ChartEvidenceEnvelope["chart"]
  const input = envelope.input as ChartEvidenceEnvelope["input"]
  const transform = envelope.transform as ChartEvidenceEnvelope["transform"]
  const render = envelope.render as ChartEvidenceEnvelope["render"]
  const meaning = envelope.meaning as ChartEvidenceEnvelope["meaning"]
  if (!meaning.grounding || typeof meaning.grounding !== "object") {
    throw new TypeError("Evidence envelope meaning requires reader grounding")
  }
  if (!chart.component || typeof chart.component !== "string") {
    throw new TypeError("Evidence envelope chart requires a component string")
  }
  if (!Number.isSafeInteger(input.rowCount) || input.rowCount < 0) {
    throw new TypeError(
      "Evidence envelope input requires non-negative rowCount"
    )
  }
  if (!Array.isArray(transform.operations)) {
    throw new TypeError("Evidence envelope transform requires operations array")
  }
  if (!["svg", "canvas", "png", "not-rendered"].includes(render.mode)) {
    throw new TypeError("Evidence envelope render requires mode")
  }
  validateEnvelopeSceneHash(render)
  validateEnvelopeArtifactAttachment({
    contract: render.evidence?.artifactContract,
    transfer: render.evidence?.artifactTransfer,
    binding: render.evidence?.artifactBinding
  }, "render.evidence.artifact")
  const modality =
    envelope.modalityChecks as ChartEvidenceEnvelope["modalityChecks"]
  for (const section of ["structured", "vision", "tandem"] as const) {
    if (!modality[section] || typeof modality[section] !== "object") {
      throw new TypeError(
        `Evidence envelope modalityChecks is missing: ${section}`
      )
    }
  }
  for (const section of ["structured", "vision"] as const) {
    if (!Array.isArray(modality[section].observations)) {
      throw new TypeError(
        `Evidence envelope ${section} observations must be an array`
      )
    }
  }
  for (const section of ["structured", "vision"] as const) {
    for (const observation of modality[section].observations) {
      if (
        !observation ||
        typeof observation !== "object" ||
        typeof observation.id !== "string" ||
        typeof observation.finding !== "string"
      ) {
        throw new TypeError(
          `Evidence envelope ${section} observations require string id and finding`
        )
      }
    }
  }
  if (
    !Array.isArray(modality.tandem.agreements) ||
    !Array.isArray(modality.tandem.conflicts)
  ) {
    throw new TypeError(
      "Evidence envelope tandem agreements and conflicts must be arrays"
    )
  }
  if (envelope.artifact !== undefined) {
    if (
      !envelope.artifact ||
      typeof envelope.artifact !== "object" ||
      !envelope.artifact.transfer ||
      typeof envelope.artifact.transfer !== "object"
    ) {
      throw new TypeError(
        "Evidence envelope artifact requires a transfer report"
      )
    }
    const artifact = envelope.artifact as EnvelopeArtifactSection
    validateEnvelopeArtifactAttachment({
      contract: artifact.contract,
      transfer: artifact.transfer,
      binding: artifact.identityBinding
    }, "artifact")
    const currentBinding =
      artifact.transferBindingVersion === ARTIFACT_TRANSFER_BINDING_VERSION
    if (
      (currentBinding && artifact.identityBinding === undefined) ||
      (!currentBinding && artifact.identityBinding !== undefined)
    ) {
      throw new TypeError(
        "Evidence envelope artifact has an invalid identity binding"
      )
    }
    if (
      ![
        LEGACY_ARTIFACT_TRANSFER_BINDING_VERSION,
        ARTIFACT_TRANSFER_BINDING_VERSION
      ].includes(artifact.transferBindingVersion) ||
      typeof artifact.transferFingerprint !== "string"
    ) {
      throw new TypeError(
        "Evidence envelope artifact requires a supported transfer binding"
      )
    }
    const expectedTransferFingerprint = artifactTransferFingerprint(artifact)
    if (artifact.transferFingerprint !== expectedTransferFingerprint) {
      throw new TypeError(
        "Evidence envelope artifact transfer fingerprint does not match its payload"
      )
    }
  }
  for (const conflict of modality.tandem.conflicts) {
    if (
      !conflict ||
      typeof conflict !== "object" ||
      typeof conflict.id !== "string" ||
      conflict.id.length === 0
    ) {
      throw new TypeError(
        "Evidence envelope tandem conflict requires a non-empty id"
      )
    }
  }
  if (!Array.isArray(modality.tandem.agreements)) {
    throw new TypeError("Evidence envelope tandem agreements must be an array")
  }
  for (const agreement of modality.tandem.agreements) {
    if (
      !agreement ||
      typeof agreement !== "object" ||
      typeof agreement.id !== "string" ||
      typeof agreement.finding !== "string"
    ) {
      throw new TypeError(
        "Evidence envelope tandem agreements require string id and finding"
      )
    }
  }
  const limits = envelope.limits as ChartEvidenceEnvelope["limits"]
  if (
    !Array.isArray(limits.knownGaps) ||
    !limits.knownGaps.every((gap) => typeof gap === "string") ||
    !Array.isArray(limits.unsupportedClaims) ||
    !limits.unsupportedClaims.every((claim) => typeof claim === "string") ||
    !limits.privacyScope ||
    typeof limits.privacyScope !== "object" ||
    Array.isArray(limits.privacyScope) ||
    !Object.values(limits.privacyScope).every(
      (scope) => Array.isArray(scope) && scope.every((value) => typeof value === "string")
    )
  ) {
    throw new TypeError(
      "Evidence envelope limits require arrays and privacy scope"
    )
  }
  if (
    render.marksObserved !== undefined &&
    (!Number.isSafeInteger(render.marksObserved) || render.marksObserved < 0)
  ) {
    throw new TypeError(
      "Evidence envelope marksObserved must be a non-negative safe integer"
    )
  }
  if (meaning.claims !== undefined) {
    if (!Array.isArray(meaning.claims)) {
      throw new TypeError("Evidence envelope claims must be an array")
    }
    for (const claim of meaning.claims) {
      if (
        !claim ||
        typeof claim !== "object" ||
        typeof claim.claim !== "string"
      ) {
        throw new TypeError("Evidence envelope claims require a claim string")
      }
      if (
        claim.confidence !== undefined &&
        (typeof claim.confidence !== "number" ||
          !Number.isFinite(claim.confidence))
      ) {
        throw new TypeError("Evidence envelope claim confidence must be finite")
      }
    }
  }
  if (
    transform.operations.some(
      (operation) => !operation || typeof operation.operation !== "string"
    )
  ) {
    throw new TypeError(
      "Evidence envelope transform operations require operation strings"
    )
  }
  if (
    render.marksIntended !== undefined &&
    (!Number.isSafeInteger(render.marksIntended) || render.marksIntended < 0)
  ) {
    throw new TypeError(
      "Evidence envelope marksIntended must be a non-negative safe integer"
    )
  }
  return value as ChartEvidenceEnvelope
}
