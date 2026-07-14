/**
 * Read-only Chart Clinic inspection contract.
 *
 * This is intentionally an inspection surface, not an authoring or repair
 * loop. It composes the existing validation, diagnostic, serializable-config,
 * render-evidence, and revision contracts into one deterministic report that
 * a docs page, CLI, MCP tool, or application can present without mutating the
 * caller's chart props or store.
 */
import type { Datum } from "../charts/shared/datumTypes"
import type { ChartCategory } from "../charts/shared/chartSpecs"
import type { Diagnosis } from "../charts/shared/diagnoseConfig"
import type { ValidationResult } from "../charts/shared/validateProps"
import type { ChartConfig } from "../export/chartConfig"
import type { RenderEvidence } from "../server/renderEvidence"
import type { RevisionSet } from "../stream/pipelineUpdateContract"
import { CHART_CLINIC_METADATA } from "./chartClinicMetadata.generated"
import { prepareChart, type RenderFn } from "./generativeChart"

/**
 * Inspection is a reproducible projection, not an authored export. The
 * timestamp in a ChartConfig is meaningful when a user saves a config but is
 * volatile noise in an identical read-only Clinic report.
 */
export type ChartClinicConfig = Omit<ChartConfig, "createdAt">

export interface ChartClinicRevisionInput {
  /** Latest revision snapshot reported by a retained chart/store host. */
  readonly revisions: RevisionSet
  /** Optional snapshot that a host says it has already consumed. */
  readonly consumed?: Partial<RevisionSet>
}

export interface ChartClinicInput {
  readonly component: string
  readonly props?: Datum
  /** Omit this for a static configuration with no retained runtime host. */
  readonly revision?: ChartClinicRevisionInput
}

export interface ChartClinicOptions {
  /**
   * Optional static renderer. Supplying it attaches SVG-derived evidence; it
   * never changes the inspected configuration and render failures are exposed
   * as a stable code rather than rethrowing arbitrary error text.
   */
  readonly render?: RenderFn
}

export interface ChartClinicSceneSummary {
  readonly status: RenderEvidence["status"]
  readonly frameType: RenderEvidence["frameType"]
  readonly markCount: number
  readonly markCountByType: Readonly<Record<string, number>>
  readonly xDomain?: readonly [number, number]
  readonly yDomain?: readonly [number, number]
  readonly categories?: readonly string[]
  readonly nodeCount?: number
  readonly edgeCount?: number
}

export interface ChartClinicRevisionStatus {
  readonly state: "not-observed" | "fully-consumed" | "pending-consumption"
  readonly revisions?: RevisionSet
  readonly consumed?: Partial<RevisionSet>
  /** Revision counters newer than the supplied consumption snapshot. */
  readonly pending: readonly (keyof RevisionSet)[]
}

export interface ChartClinicBundleGuidance {
  readonly category?: ChartCategory
  /** Prefer the pilot's explicit module when available, otherwise a family facade. */
  readonly recommendedImport?: string
  readonly serverImport?: "semiotic/server"
  readonly docsRoute?: string
  readonly note: string
}

export interface ChartClinicReport {
  readonly mode: "read-only"
  readonly component: string
  /** A serializable configuration projected from the inspected props. */
  readonly normalizedConfig?: ChartClinicConfig
  readonly validation: ValidationResult
  readonly diagnostics: readonly Diagnosis[]
  readonly evidence?: RenderEvidence
  readonly scene?: ChartClinicSceneSummary
  readonly revisions: ChartClinicRevisionStatus
  readonly bundle: ChartClinicBundleGuidance
  /** Stable reasons; arbitrary renderer exception messages are never copied here. */
  readonly reasons: readonly string[]
  readonly ok: boolean
}

function bundleGuidance(component: string): ChartClinicBundleGuidance {
  const metadata = CHART_CLINIC_METADATA[component]
  if (!metadata) {
    return {
      note: "Unknown chart component: no package or server guidance can be determined.",
    }
  }

  return {
    category: metadata.category,
    recommendedImport: metadata.recommendedImport,
    ...(metadata.serverImport ? { serverImport: metadata.serverImport } : {}),
    ...(metadata.docsRoute ? { docsRoute: metadata.docsRoute } : {}),
    note: metadata.pilot
      ? "This chart is in the ChartDefinition pilot. Its module and server support are explicit; existing family facades remain compatible."
      : "Use the family facade today. Granular chart modules are a later package-boundary migration, so this recommendation does not claim a smaller per-chart bundle.",
  }
}

function revisionStatus(input?: ChartClinicRevisionInput): ChartClinicRevisionStatus {
  if (!input) return { state: "not-observed", pending: [] }

  const pending = (Object.keys(input.revisions) as Array<keyof RevisionSet>).filter(
    (key) => input.revisions[key] > (input.consumed?.[key] ?? 0),
  )
  return {
    state: pending.length === 0 ? "fully-consumed" : "pending-consumption",
    revisions: { ...input.revisions },
    ...(input.consumed ? { consumed: { ...input.consumed } } : {}),
    pending,
  }
}

function sceneSummary(evidence: RenderEvidence): ChartClinicSceneSummary {
  return {
    status: evidence.status,
    frameType: evidence.frameType,
    markCount: evidence.markCount,
    markCountByType: { ...evidence.markCountByType },
    ...(evidence.xDomain ? { xDomain: [...evidence.xDomain] as [number, number] } : {}),
    ...(evidence.yDomain ? { yDomain: [...evidence.yDomain] as [number, number] } : {}),
    ...(evidence.categories ? { categories: [...evidence.categories] } : {}),
    ...(evidence.nodeCount !== undefined ? { nodeCount: evidence.nodeCount } : {}),
    ...(evidence.edgeCount !== undefined ? { edgeCount: evidence.edgeCount } : {}),
  }
}

function deterministicConfig(config: ChartConfig): ChartClinicConfig {
  const { createdAt: _createdAt, ...projection } = config
  return projection
}

/**
 * Inspect a chart proposal without changing it. Automatic repair is explicitly
 * disabled even when data is present; the beta reports diagnostics and bundle
 * guidance only. Pass a renderer when the caller can safely obtain static SVG
 * evidence in its own runtime.
 */
export function inspectChart(
  input: ChartClinicInput,
  options: ChartClinicOptions = {},
): ChartClinicReport {
  const prepared = prepareChart(
    { component: input.component, props: input.props ?? {} },
    { repair: false },
  )
  const reasons = [...prepared.reasons]
  let evidence: RenderEvidence | undefined

  // Never render structurally invalid/error-diagnostic configurations. The
  // report remains useful and a browser UI cannot be crashed by malformed JSON.
  if (options.render && prepared.ok) {
    try {
      const output = options.render(input.component, input.props ?? {})
      evidence = output.evidence
      if (evidence.empty) {
        reasons.push("EMPTY_SCENE: the renderer produced no data marks.")
      }
      for (const warning of evidence.warnings) {
        if (!reasons.includes(warning)) reasons.push(warning)
      }
    } catch {
      reasons.push("RENDER_FAILED: static evidence could not be produced for this configuration.")
    }
  }

  const ok = prepared.ok && !evidence?.empty && !reasons.some((reason) => reason.startsWith("RENDER_FAILED"))
  return {
    mode: "read-only",
    component: input.component,
    ...(prepared.config ? { normalizedConfig: deterministicConfig(prepared.config) } : {}),
    validation: prepared.validation,
    diagnostics: prepared.diagnostics,
    ...(evidence ? { evidence, scene: sceneSummary(evidence) } : {}),
    revisions: revisionStatus(input.revision),
    bundle: bundleGuidance(input.component),
    reasons: ok ? [] : reasons,
    ok,
  }
}
