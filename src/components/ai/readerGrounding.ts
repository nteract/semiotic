import type { Datum } from "../charts/shared/datumTypes"
import {
  describeChart,
  resolveCommunicativeAct,
  type DescribeChartResult,
  type DescribeLevel,
  type DescribeCapabilityContext,
  type CommunicativeAct,
} from "./describeChart"
import { buildNavigationTree, type NavTreeNode } from "./navigationTree"
import type { ChartCapability, ChartFamily } from "./chartCapabilityTypes"
import type { IntentId } from "./intents"
import type { AudienceProfile } from "./audienceProfile"

/**
 * buildReaderGrounding — the single payload an AI agent reads to interpret a
 * chart faithfully, without seeing the pixels. It composes the three reception
 * artifacts the accessibility layer already builds:
 *
 *   • {@link describeChart} L1–L3 — encoding, statistics, and trend.
 *   • the L4 *communicative act* — what the chart is asking the reader to do
 *     (the intent metadata that lives in each `*.capability.ts`).
 *   • {@link buildNavigationTree} — the structured chart → axes/series → datum
 *     tree the agent (or a screen reader) traverses.
 *
 * It's the reader-side complement to the author-side capability descriptor: the
 * descriptor says how a chart *should* be used; this says how a given chart
 * instance *reads*. Position it as the documented "render evidence" an LLM
 * consumes — the non-visual reader and the AI reader are the same consumer.
 *
 * Pure and SSR-safe (the capability/audience inputs are type-only).
 */

export interface ChartReaderGroundingOptions {
  /**
   * Intent context powering the L4 communicative-act sentence — a chart's
   * capability descriptor or a resolved {@link DescribeCapabilityContext}
   * (e.g. a `Suggestion`'s `{ family, intentScores }`). Optional: without it
   * the act is inferred from the component's family, best-effort.
   */
  capability?: ChartCapability | DescribeCapabilityContext
  /** Audience profile — tunes the L4 sentence for reception (low familiarity → orienting nudge). */
  audience?: AudienceProfile
  /** Locale for number formatting. Default "en". */
  locale?: string
  /** Levels for the prose description. Default ["l1","l2","l3"] (L4 is carried in `intent`). */
  levels?: DescribeLevel[]
  /** Cap navigation-tree leaves per branch. Forwarded to buildNavigationTree (default 200). */
  maxLeaves?: number
  /** Skip the navigation structure (e.g. to save tokens). Default false. */
  includeStructure?: boolean
  /**
   * Include physics runtime grounding for StreamPhysicsFrame/physics HOCs.
   * Default: auto-detect from physics chart props. Pass false to omit, true to
   * force extraction from props, or an object to supply snapshot/evidence rows.
   */
  physics?: boolean | PhysicsReaderGroundingInput
}

export interface ChartReaderGroundingIntent {
  /** The communicative act the chart performs. */
  act: CommunicativeAct
  /** The L4 illocutionary sentence ("This is an alerting chart; …"). */
  sentence: string
  /** Chart family, when known from the supplied context. */
  family?: ChartFamily
  /** Resolved per-intent scores, when the caller passed them (not from a raw descriptor). */
  intentScores?: Partial<Record<IntentId, number>>
}

export interface PhysicsReaderGroundingAggregate {
  id?: string
  label: string
  count: number
  secondary?: number
  secondaryLabel?: string
  observed?: number
}

export interface PhysicsReaderGroundingAggregates {
  rows: PhysicsReaderGroundingAggregate[]
  totalCount: number
  populatedCount: number
  leader?: PhysicsReaderGroundingAggregate
}

export interface PhysicsReaderGroundingSimulation {
  state?: string
  settled?: boolean
  elapsedSeconds?: number
  paused?: boolean
  visible?: boolean
  seed?: number
  gravity?: { x: number; y: number }
  fixedDt?: number
  timeScale?: number
  maxSubsteps?: number
  liveBodies?: number
  sleepingBodies?: number
  queued?: number
  bodyLimit?: number
  eviction?: string
}

export interface PhysicsReaderGroundingGeometry {
  colliders?: number
  sensors?: number
  springs?: number
  activeSensorPairs?: number
}

export interface PhysicsReaderGroundingSediment {
  bins: number
  count: number
  total?: number
  leader?: {
    id?: string
    label: string
    count: number
    total?: number
  }
}

export interface PhysicsReaderGroundingInput {
  /** PhysicsPipelineSnapshot or a structurally equivalent object. */
  snapshot?: unknown
  /** PhysicsSettledEvidence or a structurally equivalent object. */
  evidence?: unknown
  /** PhysicsPipelineConfig or equivalent runtime config. */
  config?: unknown
  /** Settled projection rows / evidence bin counts. */
  projectionRows?: readonly unknown[]
  /** Alias for projectionRows when callers already name the rows aggregates. */
  aggregates?: readonly unknown[]
  /** Physics sediment bin snapshots. */
  sediment?: readonly unknown[]
  /** Precomputed sediment totals, if available. */
  sedimentTotals?: unknown
}

export interface PhysicsReaderGrounding {
  simulation: PhysicsReaderGroundingSimulation
  geometry?: PhysicsReaderGroundingGeometry
  aggregates?: PhysicsReaderGroundingAggregates
  sediment?: PhysicsReaderGroundingSediment
  /** Compact prose appended to `ChartReaderGrounding.text`. */
  text: string
}

export interface ChartReaderGrounding {
  component: string
  /** Layered L1–L3 description ({ text, levels }). */
  description: DescribeChartResult
  /** Communicative act + L4 sentence, when an act could be resolved. */
  intent?: ChartReaderGroundingIntent
  /** Structured navigation tree (chart → axes/series → datum). Omitted when `includeStructure: false`. */
  structure?: NavTreeNode
  /** Physics-specific runtime grounding for simulation charts. */
  physics?: PhysicsReaderGrounding
  /** L1–L4 joined into one prose blob an LLM can read directly. */
  text: string
}

const PHYSICS_COMPONENTS = new Set([
  "StreamPhysicsFrame",
  "EventDropChart",
  "GaltonBoardChart",
  "PhysicsPileChart",
  "CollisionSwarmChart",
  "NetworkHOPsChart",
  "PhysicalFlowChart",
  "PhysicsCustomChart",
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function record(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

function finite(value: unknown): number | undefined {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN
  return Number.isFinite(n) ? n : undefined
}

function finiteInteger(value: unknown): number | undefined {
  const n = finite(value)
  return n == null ? undefined : Math.max(0, Math.floor(n))
}

function firstRecord(...values: unknown[]): Record<string, unknown> | undefined {
  return values.map(record).find(Boolean)
}

function firstArray(...values: unknown[]): readonly unknown[] | undefined {
  return values.find(Array.isArray) as readonly unknown[] | undefined
}

function compactObject<T extends Record<string, unknown>>(value: T): Partial<T> {
  const result: Partial<T> = {}
  for (const [key, entry] of Object.entries(value) as Array<[keyof T, T[keyof T]]>) {
    if (entry !== undefined) result[key] = entry
  }
  return result
}

function plural(count: number | undefined, noun: string): string {
  if (count !== 1 && noun === "body") return "bodies"
  return count === 1 ? noun : `${noun}s`
}

function formatRuntimeNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000)
}

function physicsProjectionRowsFromProps(
  props: Datum,
  physicsProps: Record<string, unknown> | undefined,
  input: Record<string, unknown> | undefined,
  evidence: Record<string, unknown> | undefined
): readonly unknown[] | undefined {
  const settled = record(props.settledProjection)
  const physicsSettled = record(physicsProps?.settledProjection)
  return firstArray(
    input?.projectionRows,
    input?.aggregates,
    props.settledProjectionRows,
    props.projectionRows,
    settled?.rows,
    physicsProps?.settledProjectionRows,
    physicsProps?.projectionRows,
    physicsSettled?.rows,
    evidence?.binCounts
  )
}

function normalizePhysicsAggregates(rows: readonly unknown[] | undefined): PhysicsReaderGroundingAggregates | undefined {
  if (!rows || rows.length === 0) return undefined
  const normalized = rows
    .map((row, index): PhysicsReaderGroundingAggregate | undefined => {
      const d = record(row)
      if (!d) return undefined
      const count = finite(d.count ?? d.value ?? d.total ?? d.bodies ?? d.events)
      if (count == null) return undefined
      const label = String(d.label ?? d.id ?? d.name ?? `container ${index + 1}`)
      const id = d.id == null ? undefined : String(d.id)
      const secondary = finite(d.secondary ?? d.secondaryCount)
      const observed = finite(d.observed ?? d.observedCount)
      return compactObject({
        id,
        label,
        count,
        secondary,
        secondaryLabel: typeof d.secondaryLabel === "string" ? d.secondaryLabel : undefined,
        observed,
      }) as PhysicsReaderGroundingAggregate
    })
    .filter((row): row is PhysicsReaderGroundingAggregate => row != null)
  if (normalized.length === 0) return undefined
  const totalCount = normalized.reduce((sum, row) => sum + row.count, 0)
  const populatedCount = normalized.filter((row) => row.count > 0).length
  const leader = normalized.slice().sort((a, b) => b.count - a.count)[0]
  return {
    rows: normalized,
    totalCount,
    populatedCount,
    ...(leader ? { leader } : {}),
  }
}

function normalizeSediment(
  sedimentRows: readonly unknown[] | undefined,
  totals: Record<string, unknown> | undefined
): PhysicsReaderGroundingSediment | undefined {
  type SedimentRow = { id?: string; label: string; count: number; total?: number }
  const rows = sedimentRows
    ?.map((row, index): SedimentRow | undefined => {
      const d = record(row)
      if (!d) return undefined
      const count = finite(d.count) ?? 0
      const total = finite(d.total)
      const normalized: SedimentRow = {
        label: String(d.label ?? d.id ?? `sediment ${index + 1}`),
        count,
      }
      if (d.id != null) normalized.id = String(d.id)
      if (total != null) normalized.total = total
      return normalized
    })
    .filter((row): row is SedimentRow => row != null)

  const bins = finiteInteger(totals?.bins) ?? rows?.length ?? 0
  const count = finite(totals?.count) ?? rows?.reduce((sum, row) => sum + row.count, 0) ?? 0
  const total = finite(totals?.total) ?? rows?.reduce((sum, row) => sum + (row.total ?? 0), 0)
  const leader = rows?.slice().sort((a, b) => b.count - a.count)[0]
  if (bins === 0 && count === 0 && !total) return undefined
  return {
    bins,
    count,
    ...(total != null && total > 0 ? { total } : {}),
    ...(leader ? { leader } : {}),
  }
}

function looksLikePhysicsSnapshot(value: unknown): value is Record<string, unknown> {
  const snapshot = record(value)
  return !!snapshot && (isRecord(snapshot.world) || "simulationState" in snapshot || "liveBodyOrder" in snapshot)
}

function countSleepingBodies(bodies: readonly unknown[] | undefined): number | undefined {
  if (!bodies) return undefined
  return bodies.filter((body) => record(body)?.sleeping === true).length
}

function countSensors(
  colliders: readonly unknown[] | undefined,
  config: Record<string, unknown> | undefined,
  world: Record<string, unknown> | undefined
): number | undefined {
  const colliderSensors = colliders?.filter((collider) => record(collider)?.sensor === true).length
  const observation = record(config?.observation)
  const configuredSensors = record(observation?.sensors)
  const activeSensors = firstArray(world?.activeSensors)
  return Math.max(
    colliderSensors ?? 0,
    configuredSensors ? Object.keys(configuredSensors).length : 0,
    activeSensors?.length ?? 0
  ) || undefined
}

function buildPhysicsGroundingText(physics: Omit<PhysicsReaderGrounding, "text">): string {
  const parts: string[] = []
  const sim = physics.simulation
  const state = sim.state ?? (sim.settled ? "settled" : undefined)
  const simulationParts = [
    state,
    sim.liveBodies != null
      ? `${sim.liveBodies} live ${plural(sim.liveBodies, "body")}`
      : undefined,
    sim.sleepingBodies != null
      ? `${sim.sleepingBodies} sleeping`
      : undefined,
    sim.queued != null
      ? `${sim.queued} queued`
      : undefined,
    sim.seed != null
      ? `seed ${formatRuntimeNumber(sim.seed)}`
      : undefined,
    sim.gravity
      ? `gravity (${formatRuntimeNumber(sim.gravity.x)}, ${formatRuntimeNumber(sim.gravity.y)})`
      : undefined,
    sim.fixedDt != null
      ? `fixed step ${formatRuntimeNumber(sim.fixedDt)}s`
      : undefined,
    sim.timeScale != null
      ? `${formatRuntimeNumber(sim.timeScale)}x time`
      : undefined,
  ].filter(Boolean)
  if (simulationParts.length > 0) {
    parts.push(`Physics simulation: ${simulationParts.join("; ")}.`)
  }

  const geometry = physics.geometry
  if (geometry) {
    const geometryParts = [
      geometry.colliders != null ? `${geometry.colliders} ${plural(geometry.colliders, "collider")}` : undefined,
      geometry.sensors != null ? `${geometry.sensors} ${plural(geometry.sensors, "sensor")}` : undefined,
      geometry.springs != null ? `${geometry.springs} ${plural(geometry.springs, "spring")}` : undefined,
      geometry.activeSensorPairs != null
        ? `${geometry.activeSensorPairs} active sensor ${plural(geometry.activeSensorPairs, "pair")}`
        : undefined,
    ].filter(Boolean)
    if (geometryParts.length > 0) parts.push(`Physics geometry: ${geometryParts.join("; ")}.`)
  }

  const aggregates = physics.aggregates
  if (aggregates) {
    const leader = aggregates.leader
    const leaderText = leader
      ? ` Largest is ${leader.label} with ${formatRuntimeNumber(leader.count)}.`
      : ""
    parts.push(
      `Physics aggregates: ${formatRuntimeNumber(aggregates.totalCount)} settled ${plural(aggregates.totalCount, "body")} across ${aggregates.rows.length} ${plural(aggregates.rows.length, "container")}; ${aggregates.populatedCount} populated.${leaderText}`
    )
  }

  const sediment = physics.sediment
  if (sediment) {
    const totalText = sediment.total != null ? `, value total ${formatRuntimeNumber(sediment.total)}` : ""
    const leaderText = sediment.leader
      ? `; largest sediment bin is ${sediment.leader.label} with ${formatRuntimeNumber(sediment.leader.count)}`
      : ""
    parts.push(
      `Physics sediment: ${sediment.count} retained ${plural(sediment.count, "body")} in ${sediment.bins} ${plural(sediment.bins, "bin")}${totalText}${leaderText}.`
    )
  }

  return parts.join(" ")
}

function buildPhysicsGrounding(
  component: string,
  props: Datum,
  option: ChartReaderGroundingOptions["physics"]
): PhysicsReaderGrounding | undefined {
  if (option === false) return undefined
  const input = isRecord(option) ? option : undefined
  const physicsProps = record(props.physics)
  const snapshot = firstRecord(
    input?.snapshot,
    physicsProps?.snapshot,
    props.physicsSnapshot,
    looksLikePhysicsSnapshot(props.snapshot) ? props.snapshot : undefined
  )
  const evidence = firstRecord(
    input?.evidence,
    physicsProps?.evidence,
    props.physicsEvidence,
    props.settledEvidence
  )
  const config = firstRecord(
    input?.config,
    physicsProps?.config,
    snapshot?.config,
    props.config
  )
  const world = firstRecord(record(snapshot?.world), record(physicsProps?.world))
  const kernel = firstRecord(record(config?.kernel), record(world?.options))
  const bodies = firstArray(world?.bodies)
  const colliders = firstArray(world?.colliders, config?.colliders)
  const queue = firstArray(snapshot?.queue, physicsProps?.queue)
  const liveBodyOrder = firstArray(snapshot?.liveBodyOrder)
  const springs = firstArray(world?.springs)
  const activeSensorPairs = firstArray(snapshot?.activeSensorPairs)

  const aggregates = normalizePhysicsAggregates(
    physicsProjectionRowsFromProps(props, physicsProps, input, evidence)
  )
  const sediment = normalizeSediment(
    firstArray(input?.sediment, physicsProps?.sediment, snapshot?.sediment),
    firstRecord(input?.sedimentTotals, physicsProps?.sedimentTotals)
  )

  const liveBodies =
    liveBodyOrder?.length ??
    bodies?.length ??
    finiteInteger(evidence?.bodyCount)
  const sleepingBodies =
    countSleepingBodies(bodies) ??
    finiteInteger(evidence?.sleepingCount)
  const queued = queue?.length
  const state = typeof snapshot?.simulationState === "string"
    ? snapshot.simulationState
    : undefined
  const settled =
    typeof evidence?.settled === "boolean"
      ? evidence.settled
      : state
        ? state === "settled"
        : liveBodies != null || sleepingBodies != null || queued != null
          ? liveBodies != null &&
            sleepingBodies === liveBodies &&
            (queued ?? 0) === 0
          : undefined
  const gravityRecord = record(kernel?.gravity)
  const gravityX = finite(gravityRecord?.x)
  const gravityY = finite(gravityRecord?.y)
  const simulation = compactObject({
    state,
    settled,
    elapsedSeconds: finite(snapshot?.elapsedSeconds),
    paused: typeof snapshot?.paused === "boolean" ? snapshot.paused : undefined,
    visible: typeof snapshot?.visible === "boolean" ? snapshot.visible : undefined,
    seed: finite(kernel?.seed),
    gravity:
      gravityX != null && gravityY != null
        ? { x: gravityX, y: gravityY }
        : undefined,
    fixedDt: finite(config?.fixedDt ?? kernel?.fixedDt),
    timeScale: finite(config?.timeScale),
    maxSubsteps: finiteInteger(config?.maxSubsteps),
    liveBodies,
    sleepingBodies,
    queued,
    bodyLimit: finite(config?.bodyLimit),
    eviction: typeof config?.eviction === "string" ? config.eviction : undefined,
  }) as PhysicsReaderGroundingSimulation

  const geometry = compactObject({
    colliders: colliders?.length,
    sensors: countSensors(colliders, config, world),
    springs: springs?.length,
    activeSensorPairs: activeSensorPairs?.length,
  }) as PhysicsReaderGroundingGeometry

  const hasGeometry = Object.keys(geometry).length > 0
  const isPhysicsComponent = PHYSICS_COMPONENTS.has(component)
  const hasRuntimeSignal =
    Object.keys(simulation).length > 0 ||
    hasGeometry ||
    !!aggregates ||
    !!sediment
  if (!hasRuntimeSignal || (!isPhysicsComponent && option == null)) return undefined

  const physicsBase = {
    simulation,
    ...(hasGeometry ? { geometry } : {}),
    ...(aggregates ? { aggregates } : {}),
    ...(sediment ? { sediment } : {}),
  }
  const text = buildPhysicsGroundingText(physicsBase)
  return {
    ...physicsBase,
    text,
  }
}

/** Best-effort family/intentScores for the payload, without re-deriving misleading static scores. */
function contextMeta(
  cap: ChartCapability | DescribeCapabilityContext | undefined
): { family?: ChartFamily; intentScores?: Partial<Record<IntentId, number>> } {
  if (!cap) return {}
  // A full ChartCapability's primary intents are often function scorers we
  // can't evaluate here; surface only the family rather than misleading
  // leftover static scores. A resolved context carries trustworthy scores.
  if ("fits" in cap || "buildProps" in cap) {
    return { family: (cap as ChartCapability).family }
  }
  const ctx = cap as DescribeCapabilityContext
  return { family: ctx.family, intentScores: ctx.intentScores }
}

/**
 * Build the combined reader-grounding payload for a chart config. See the
 * module docstring; pass a `capability` (or a resolved context) for the most
 * precise L4 act, an `audience` for reception tuning.
 */
export function buildReaderGrounding(
  component: string,
  props: Datum,
  options: ChartReaderGroundingOptions = {}
): ChartReaderGrounding {
  const { capability, audience, locale } = options
  const levels = options.levels ?? ["l1", "l2", "l3"]
  const includeStructure = options.includeStructure !== false

  // Single describeChart pass: when an act resolves, request L4 alongside the
  // L1–L3 levels so the O(n) stats/formatting runs once, not twice. capability
  // and audience only influence L4, so the L1–L3 output is unchanged.
  const act = resolveCommunicativeAct(component, capability)
  const requested: DescribeLevel[] = act ? [...levels, "l4"] : levels
  const full = describeChart(component, props, { levels: requested, locale, capability, audience })

  // Split the single result back into the L1–L3 description and the L4 sentence.
  const { l4: l4Sentence, ...l13Levels } = full.levels
  // Re-join just the L1–L3 levels (canonical order; undefined levels drop out),
  // so `description.text` excludes the L4 sentence carried in `intent`.
  const l13Text = (["l1", "l2", "l3"] as const).map((l) => full.levels[l]).filter(Boolean).join(" ")
  const description: DescribeChartResult = {
    levels: l13Levels,
    // An author-placed annotation is intent in its purest form, so it leads the
    // grounding prose ahead of L1–L3 — the agent reader must not silently lose
    // the provenance-aware annotation summary describeChart surfaced.
    text: full.annotations ? `${full.annotations} ${l13Text}`.trim() : l13Text,
    ...(full.annotations ? { annotations: full.annotations } : {}),
  }

  let intent: ChartReaderGroundingIntent | undefined
  if (act && l4Sentence) {
    const meta = contextMeta(capability)
    intent = { act, sentence: l4Sentence, family: meta.family, intentScores: meta.intentScores }
  }

  const structure = includeStructure
    ? buildNavigationTree(component, props, { maxLeaves: options.maxLeaves, locale })
    : undefined

  const physics = buildPhysicsGrounding(component, props, options.physics)

  const text = [description.text, intent?.sentence, physics?.text].filter(Boolean).join(" ")

  return { component, description, intent, structure, physics, text }
}
