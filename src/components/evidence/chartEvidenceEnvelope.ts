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
import type { RenderEvidence } from "../server/renderEvidence"

export const CHART_EVIDENCE_ENVELOPE_VERSION = 1 as const

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
  sceneHash?: string
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
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "null"
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`
  }
  if (value instanceof Date) return JSON.stringify(value)
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(
        ([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`
      )
    return `{${entries.join(",")}}`
  }
  return JSON.stringify(value)
}

/**
 * Stable SHA-256 over key-sorted JSON.

 * This dependency-free implementation keeps the evidence entry browser,
 * edge, Node, and RSC compatible. Input is UTF-8 encoded and processed in
 * standard 512-bit blocks.
 */
export function stableEvidenceHash(value: unknown): string {
  return sha256Hex(stableStringify(value))
}

function sha256Hex(message: string): string {
  const k = SHA256_K
  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19
  ]
  const bytes = Array.from(new TextEncoder().encode(message))
  const bitLength = bytes.length * 8
  bytes.push(0x80)
  while (bytes.length % 64 !== 56) bytes.push(0)
  const high = Math.floor(bitLength / 4294967296)
  const low = bitLength >>> 0
  bytes.push(
    (high >>> 24) & 255,
    (high >>> 16) & 255,
    (high >>> 8) & 255,
    high & 255,
    (low >>> 24) & 255,
    (low >>> 16) & 255,
    (low >>> 8) & 255,
    low & 255
  )
  const words: number[] = []
  for (let index = 0; index < bytes.length; index += 4) {
    words.push(
      ((bytes[index]! << 24) |
        (bytes[index + 1]! << 16) |
        (bytes[index + 2]! << 8) |
        bytes[index + 3]!) >>>
        0
    )
  }
  for (let chunk = 0; chunk < words.length; chunk += 16) {
    const w = [...words.slice(chunk, chunk + 16)]
    for (let index = 16; index < 64; index += 1) {
      const s0 =
        rotr(w[index - 15]!, 7) ^
        rotr(w[index - 15]!, 18) ^
        (w[index - 15]! >>> 3)
      const s1 =
        rotr(w[index - 2]!, 17) ^
        rotr(w[index - 2]!, 19) ^
        (w[index - 2]! >>> 10)
      w[index] = (w[index - 16]! + s0 + w[index - 7]! + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, hh] = h
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotr(e!, 6) ^ rotr(e!, 11) ^ rotr(e!, 25)
      const ch = (e! & f!) ^ (~e! & g!)
      const temp1 = (hh! + s1 + ch + k[index]! + w[index]!) >>> 0
      const s0 = rotr(a!, 2) ^ rotr(a!, 13) ^ rotr(a!, 22)
      const maj = (a! & b!) ^ (a! & c!) ^ (b! & c!)
      const temp2 = (s0 + maj) >>> 0
      hh = g
      g = f
      f = e
      e = (d! + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }
    const next = [a, b, c, d, e, f, g, hh]
    for (let index = 0; index < 8; index += 1) {
      h[index] = (h[index]! + next[index]!) >>> 0
    }
  }
  return h.map((word) => word.toString(16).padStart(8, "0")).join("")
}

const rotr = (value: number, count: number): number =>
  ((value >>> count) | (value << (32 - count))) >>> 0

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
] as const

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

/**
 * Remove raw row/network/hierarchy/geo payloads from a data profile before
 * placing it in a portable envelope. Shape and aggregate evidence remain;
 * caller-owned source records do not.
 */
const PRIVATE_PROFILE_KEYS = new Set([
  "data",
  "rawInput",
  "sample",
  "numericFields",
  "network",
  "hierarchy",
  "geo",
  "topValues",
  "distinctValues"
])

function redactProfileForEnvelope(profile: unknown): unknown {
  if (Array.isArray(profile)) return profile.map(redactProfileForEnvelope)
  if (!profile || typeof profile !== "object") return profile
  const output: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(
    profile as Record<string, unknown>
  )) {
    if (value === undefined || PRIVATE_PROFILE_KEYS.has(key)) continue
    output[key] = redactProfileForEnvelope(value)
  }
  return output
}

/** Recursively remove raw source records from a navigation tree. */
function redactNavigationTree(tree: unknown): unknown {
  if (Array.isArray(tree)) return tree.map(redactNavigationTree)
  if (!tree || typeof tree !== "object") return tree
  const output = { ...(tree as Record<string, unknown>) }
  delete output.datum
  if (Array.isArray(output.children)) {
    output.children = output.children.map(redactNavigationTree)
  }
  return output
}

/**
 * Normalize the chart's primary source records across supported data shapes.
 * Used for count and integrity hashing only; records are never stored.
 */
function normalizeSourceRecords(
  component: string,
  props: Record<string, unknown>
): ReadonlyArray<unknown> {
  if (Array.isArray(props.data)) return props.data
  if (
    component === "ForceDirectedGraph" ||
    component === "SankeyDiagram" ||
    component === "ProcessSankey" ||
    component === "ChordDiagram"
  ) {
    return [
      ...(Array.isArray(props.nodes) ? props.nodes : []),
      ...(Array.isArray(props.edges) ? props.edges : [])
    ]
  }
  if (component === "ChoroplethMap") {
    if (Array.isArray(props.areas)) return props.areas
    if (
      props.areas &&
      typeof props.areas === "object" &&
      Array.isArray((props.areas as Record<string, unknown>).features)
    ) {
      return (props.areas as { features: unknown[] }).features
    }
    return typeof props.areas === "string"
      ? [{ geographyReference: props.areas }]
      : []
  }
  if (component === "ProportionalSymbolMap") {
    return Array.isArray(props.points) ? props.points : []
  }
  if (component === "FlowMap") {
    return [
      ...(Array.isArray(props.nodes) ? props.nodes : []),
      ...(Array.isArray(props.flows) ? props.flows : [])
    ]
  }
  if (component === "DistanceCartogram") {
    return [
      ...(Array.isArray(props.points) ? props.points : []),
      ...(Array.isArray(props.lines) ? props.lines : [])
    ]
  }
  if (
    component === "TreeDiagram" ||
    component === "Treemap" ||
    component === "CirclePack" ||
    component === "OrbitDiagram"
  ) {
    return props.data && typeof props.data === "object" ? [props.data] : []
  }
  if (component === "BigNumber" || component === "GaugeChart") {
    const value = props.value
    return value === undefined ? [] : [{ value }]
  }
  return []
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
  const access =
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
  if (access.navigation.tree) {
    access.navigation.tree = redactNavigationTree(
      access.navigation.tree
    ) as never
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
      sceneHash: options.ssrEvidence
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
    }
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
    !Array.isArray(limits.unsupportedClaims) ||
    !limits.privacyScope ||
    typeof limits.privacyScope !== "object"
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
