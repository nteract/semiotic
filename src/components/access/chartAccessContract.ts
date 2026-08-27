/**
 * ChartAccessContract@1 — a stable, inspectable inventory of the access
 * behavior a chart exposes. It composes existing Semiotic systems rather than
 * replacing them: authored text, generated grounding, navigation, tables,
 * media preferences, stream status, SSR parity, render evidence, and audit.
 */
import { describeChart, type DescribeChartResult } from "../ai/describeChart"
import {
  buildNavigationTree,
  supportsStructuredNavigation,
  type NavTreeNode
} from "../ai/navigationTree"
import {
  auditAccessibility,
  type AccessibilityAuditResult
} from "../charts/shared/auditAccessibility"
import type { RenderEvidence } from "../server/renderEvidence"
import type { StreamStatus } from "../charts/shared/useStreamStatus"
import {
  CHART_ACCESS_CAPABILITIES,
  type GeneratedChartAccessCapabilities,
  type GeneratedMarkNavigation
} from "./chartAccessCapabilities.generated"

export const CHART_ACCESS_CONTRACT_VERSION = 1 as const

export interface AccessStatusRecord {
  status: StreamStatus
  lastPushTime: number | null
}

export interface ChartAccessContractText {
  title?: string
  description?: string
  summary?: string
  accessibleTable: boolean
}

export interface ChartAccessContractKeyboard {
  markNavigation: GeneratedMarkNavigation | "unsupported"
  legendInteraction:
    "built-in" | "not-enabled" | "not-applicable" | "unsupported"
  focusRing: GeneratedMarkNavigation | "unsupported"
}

export interface ChartAccessContractNavigation {
  supported: boolean
  composition: "chart-container"
  tree?: NavTreeNode
  note?: string
}

export interface ChartAccessContractMediaPreferences {
  reducedMotion: "built-in" | "unknown"
  forcedColors: "css-custom-properties" | "unknown"
  note: string
}

export interface ChartAccessContractStreamStatus {
  supported: boolean
  status?: StreamStatus
  lastPushTime?: number | null
  history?: AccessStatusRecord[]
  historyLimit?: number
  accessibleDescription?: string
  note?: string
}

export interface ChartAccessContractSsr {
  supported: boolean
  evidence?: RenderEvidence
  note?: string
}

export interface ChartAccessContractEvidence {
  audit: AccessibilityAuditResult
  description: DescribeChartResult
}

export type StreamStatusInput = Pick<
  AccessStatusRecord,
  "status" | "lastPushTime"
>

export interface ChartAccessContractInput {
  component: string
  props: Record<string, unknown>
  options?: {
    locale?: string
    inChartContainer?: boolean
    describe?: boolean
    navigable?: boolean
    streamStatus?: StreamStatusInput | Array<StreamStatusInput>
    streamHistoryLimit?: number
    ssrEvidence?: RenderEvidence
    realtime?: boolean
  }
}

export interface ChartAccessContract {
  schemaVersion: typeof CHART_ACCESS_CONTRACT_VERSION
  component: string
  text: ChartAccessContractText
  keyboard: ChartAccessContractKeyboard
  navigation: ChartAccessContractNavigation
  table: {
    enabled: boolean
    source: "scene"
    pagination: "built-in"
  }
  mediaPreferences: ChartAccessContractMediaPreferences
  streamStatus: ChartAccessContractStreamStatus
  ssr: ChartAccessContractSsr
  evidence: ChartAccessContractEvidence
}

function supportsAccessibleTable(
  capabilities: GeneratedChartAccessCapabilities | undefined,
  props: Record<string, unknown>
): boolean {
  return (
    capabilities?.supportsAccessibleTable === true &&
    props.accessibleTable !== false
  )
}
const DEFAULT_STREAM_HISTORY_LIMIT = 5

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function normalizeStatusHistory(
  input: ChartAccessContractInput["options"]
): AccessStatusRecord[] {
  const raw = input?.streamStatus
  if (!raw) return []
  const records = (Array.isArray(raw) ? raw : [raw]).filter(
    (record): record is AccessStatusRecord =>
      !!record && typeof record.status === "string"
  )
  return records.slice(
    -(input?.streamHistoryLimit ?? DEFAULT_STREAM_HISTORY_LIMIT)
  )
}

function describeStatusHistory(
  history: AccessStatusRecord[]
): string | undefined {
  if (history.length === 0) return undefined
  const phrases = history.map((record) => {
    if (record.status === "idle") return "no data received"
    if (record.status === "active") return "receiving data"
    return "not receiving new data"
  })
  const unique = [...new Set(phrases)]
  const sequence = unique.length === 1 ? unique[0] : phrases.join(", then ")
  return `Last ${history.length} stream ${history.length === 1 ? "status" : "statuses"}: ${sequence}.`
}

function legendInteraction(
  capabilities: GeneratedChartAccessCapabilities | undefined,
  props: Record<string, unknown>
): ChartAccessContractKeyboard["legendInteraction"] {
  if (!capabilities) return "unsupported"
  if (!capabilities.supportsLegend || props.showLegend === false) {
    return "not-applicable"
  }
  const legendRequested =
    props.showLegend === true ||
    props.legend != null ||
    ["colorBy", "lineBy", "areaBy", "stackBy", "groupBy"].some(
      (prop) => props[prop] != null
    )
  if (!legendRequested) return "not-applicable"
  return props.legendInteraction === "isolate" ||
    props.legendInteraction === "highlight"
    ? "built-in"
    : "not-enabled"
}

function markNavigation(
  capabilities: GeneratedChartAccessCapabilities | undefined,
  navigationSupported: boolean
): ChartAccessContractKeyboard["markNavigation"] {
  if (!capabilities) return "unsupported"
  if (
    capabilities.markNavigation === "delegated" ||
    capabilities.markNavigation === "not-applicable"
  ) {
    return capabilities.markNavigation
  }
  return navigationSupported ? "built-in" : "unsupported"
}

/** Build a stable access inventory for a chart configuration. */
export function createChartAccessContract({
  component,
  props,
  options = {}
}: ChartAccessContractInput): ChartAccessContract {
  const capabilities = CHART_ACCESS_CAPABILITIES[component]
  const realtime = capabilities
    ? capabilities.realtime
    : options.realtime === true
  const description = describeChart(component, props as never, {
    ...(options.locale ? { locale: options.locale } : {})
  })
  const runtimeNavigationSupported = supportsStructuredNavigation(
    component,
    props as never
  )
  const navigationSupported =
    runtimeNavigationSupported || capabilities?.recipeNavigation === true
  const tree =
    runtimeNavigationSupported && options.navigable !== false
      ? buildNavigationTree(component, props as never, {
          ...(options.locale ? { locale: options.locale } : {})
        })
      : undefined
  const audit = auditAccessibility(component, props as never, {
    inChartContainer: options.inChartContainer === true,
    describe: options.describe === true || hasText(props.summary),
    navigable: options.navigable !== false && navigationSupported
  })
  const history = realtime ? normalizeStatusHistory(options) : []
  const resolvedMarkNavigation = markNavigation(
    capabilities,
    navigationSupported
  )

  return {
    schemaVersion: CHART_ACCESS_CONTRACT_VERSION,
    component,
    text: {
      ...(hasText(props.title) ? { title: props.title } : {}),
      ...(hasText(props.description) ? { description: props.description } : {}),
      ...(hasText(props.summary) ? { summary: props.summary } : {}),
      accessibleTable: supportsAccessibleTable(capabilities, props)
    },
    keyboard: {
      markNavigation: resolvedMarkNavigation,
      legendInteraction: legendInteraction(capabilities, props),
      focusRing: resolvedMarkNavigation
    },
    navigation: {
      supported: navigationSupported,
      composition: "chart-container",
      ...(tree ? { tree } : undefined),
      ...(!tree
        ? {
            note: navigationSupported
              ? runtimeNavigationSupported
                ? "Structured datum navigation is available through ChartContainer; enable its navigable option to materialize the tree."
                : "Structured datum navigation is declared for this built-in recipe; load its recipe manifest through semiotic/ai before materializing the tree."
              : "No datum-level structured navigation is registered for this chart. Exact-value table access may still be available."
          }
        : {})
    },
    table: {
      enabled: supportsAccessibleTable(capabilities, props),
      source: "scene",
      pagination: "built-in"
    },
    mediaPreferences: {
      reducedMotion: capabilities ? "built-in" : "unknown",
      forcedColors: capabilities ? "css-custom-properties" : "unknown",
      note: capabilities
        ? "Runtime detection is available through useReducedMotion and useHighContrast; canvas styling uses CSS custom properties so forced-colors changes cascade."
        : "No generated runtime capability record exists for this component; media-preference support is unknown."
    },
    streamStatus: realtime
      ? {
          supported: true,
          status: history.at(-1)?.status ?? "idle",
          lastPushTime: history.at(-1)?.lastPushTime ?? null,
          history,
          historyLimit:
            options.streamHistoryLimit ?? DEFAULT_STREAM_HISTORY_LIMIT,
          ...(describeStatusHistory(history)
            ? { accessibleDescription: describeStatusHistory(history) }
            : {}),
          note: "Hosts may expose this bounded, non-visible description to screen readers or agents. Do not render it in visible UI."
        }
      : {
          supported: false,
          note: "Static chart; no push-ingest lifecycle."
        },
    ssr:
      capabilities?.supportsSSR === true
        ? {
            supported: true,
            evidence: options.ssrEvidence,
            note: options.ssrEvidence
              ? "Server rendering is registered and attached render evidence records the observed scene."
              : "Server rendering is registered; supply renderChartWithEvidence output before claiming a non-empty scene."
          }
        : {
            supported: false,
            ...(options.ssrEvidence ? { evidence: options.ssrEvidence } : {}),
            note: realtime
              ? "Live push charts intentionally omit static SSR; capture a supported bounded-window static twin before claiming server evidence."
              : capabilities
                ? "The chart capability registry does not expose this component through renderChart; do not claim server evidence for the HOC surface."
                : "No generated capability record exists for this component; SSR support is unknown and therefore reported as unsupported."
          },
    evidence: {
      audit,
      description
    }
  }
}
