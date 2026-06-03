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

export interface ChartReaderGrounding {
  component: string
  /** Layered L1–L3 description ({ text, levels }). */
  description: DescribeChartResult
  /** Communicative act + L4 sentence, when an act could be resolved. */
  intent?: ChartReaderGroundingIntent
  /** Structured navigation tree (chart → axes/series → datum). Omitted when `includeStructure: false`. */
  structure?: NavTreeNode
  /** L1–L4 joined into one prose blob an LLM can read directly. */
  text: string
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

  const text = [description.text, intent?.sentence].filter(Boolean).join(" ")

  return { component, description, intent, structure, text }
}
