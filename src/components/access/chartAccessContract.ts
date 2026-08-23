/**
 * ChartAccessContract@1 — a stable, inspectable inventory of the access
 * behavior a chart exposes. It composes existing Semiotic systems rather than
 * replacing them: authored text, generated grounding, navigation, tables,
 * media preferences, stream status, SSR parity, render evidence, and audit.
 */
import { describeChart, type DescribeChartResult } from "../ai/describeChart"
import {
  buildNavigationTree,
  type NavTreeNode,
} from "../ai/navigationTree"
import {
  auditAccessibility,
  type AccessibilityAuditResult,
} from "../charts/shared/auditAccessibility"
import type { RenderEvidence } from "../server/renderEvidence"
import type { StreamStatus } from "../charts/shared/useStreamStatus"

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
  markNavigation: "built-in" | "not-applicable"
  legendInteraction: "built-in" | "not-applicable"
  focusRing: "built-in"
}

export interface ChartAccessContractNavigation {
  supported: boolean
  composition: "chart-container"
  tree?: NavTreeNode
  note?: string
}

export interface ChartAccessContractMediaPreferences {
  reducedMotion: "built-in"
  forcedColors: "css-custom-properties"
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

export type StreamStatusInput = Pick<AccessStatusRecord, "status" | "lastPushTime">

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

/**
 * Components for which `buildNavigationTree()` constructs a structured tree.
 * Mirrors the family sets dispatched by the navigation builder so capability
 * reporting cannot drift from the actual implementation.
 */
const NAVIGATION_SUPPORTED = new Set([
  "ForceDirectedGraph", "SankeyDiagram", "ProcessSankey", "ChordDiagram",
  "TreeDiagram", "Treemap", "CirclePack", "OrbitDiagram",
  "ChoroplethMap", "ProportionalSymbolMap", "FlowMap", "DistanceCartogram",
  "LineChart", "AreaChart", "StackedAreaChart", "DifferenceChart",
  "Scatterplot", "BubbleChart", "ConnectedScatterplot", "QuadrantChart",
  "MultiAxisLineChart", "MinimapChart",
  "BarChart", "StackedBarChart", "GroupedBarChart", "DotPlot",
  "PieChart", "DonutChart", "FunnelChart",
  "Histogram", "BoxPlot", "ViolinPlot", "RidgelinePlot", "SwarmPlot",
])
const TABLE_UNSUPPORTED = new Set(["BigNumber"])

function supportsAccessibleTable(component: string, props: Record<string, unknown>): boolean {
  if (TABLE_UNSUPPORTED.has(component)) return false
  return props.accessibleTable !== false
}
const DEFAULT_STREAM_HISTORY_LIMIT = 5

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function normalizeStatusHistory(
  input: ChartAccessContractInput["options"],
): AccessStatusRecord[] {
  const raw = input?.streamStatus
  if (!raw) return []
  const records = (Array.isArray(raw) ? raw : [raw]).filter(
    (record): record is AccessStatusRecord =>
      !!record && typeof record.status === "string"
  )
  return records.slice(-(input?.streamHistoryLimit ?? DEFAULT_STREAM_HISTORY_LIMIT))
}

function describeStatusHistory(history: AccessStatusRecord[]): string | undefined {
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

/** Build a stable access inventory for a chart configuration. */
export function createChartAccessContract({
  component,
  props,
  options = {},
}: ChartAccessContractInput): ChartAccessContract {
  const realtime = options.realtime ?? component === "RealtimeLineChart"
  const description = describeChart(component, props as never, {
    ...(options.locale ? { locale: options.locale } : {}),
  })
  const navigationSupported = NAVIGATION_SUPPORTED.has(component)
  const tree = navigationSupported && options.navigable !== false
    ? buildNavigationTree(component, props as never, {
        ...(options.locale ? { locale: options.locale } : {}),
      })
    : undefined
  const audit = auditAccessibility(component, props as never, {
    inChartContainer: options.inChartContainer === true,
    describe: options.describe === true || hasText(props.summary),
    navigable:
      options.navigable !== false &&
      (navigationSupported || options.navigable === true),
  })
  const history = realtime
    ? normalizeStatusHistory(options)
    : []

  return {
    schemaVersion: CHART_ACCESS_CONTRACT_VERSION,
    component,
    text: {
      ...(hasText(props.title) ? { title: props.title } : {}),
      ...(hasText(props.description) ? { description: props.description } : {}),
      ...(hasText(props.summary) ? { summary: props.summary } : {}),
      accessibleTable: supportsAccessibleTable(component, props),
    },
    keyboard: {
      markNavigation: "built-in",
      legendInteraction: props.showLegend === false
        ? "not-applicable"
        : "built-in",
      focusRing: "built-in",
    },
    navigation: {
      supported: navigationSupported,
      composition: "chart-container",
      ...(tree ? { tree } : undefined),
      ...(!tree
        ? {
            note:
              "Structured datum navigation is composed through ChartContainer. Realtime charts currently provide table access and bounded status history rather than a point-by-point tree.",
          }
        : {}),
    },
    table: {
      enabled: supportsAccessibleTable(component, props),
      source: "scene",
      pagination: "built-in",
    },
    mediaPreferences: {
      reducedMotion: "built-in",
      forcedColors: "css-custom-properties",
      note:
        "Runtime detection is available through useReducedMotion and useHighContrast; canvas styling uses CSS custom properties so forced-colors changes cascade.",
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
          note:
            "Hosts may expose this bounded, non-visible description to screen readers or agents. Do not render it in visible UI.",
        }
      : {
          supported: false,
          note: "Static chart; no push-ingest lifecycle.",
        },
    ssr: realtime
      ? {
          supported: false,
          note:
            "Live push charts intentionally omit static SSR; capture a bounded-window static twin before claiming server evidence.",
        }
      : {
          supported: true,
          evidence: options.ssrEvidence,
          note:
            "Supply renderChartWithEvidence output to attach non-empty scene proof.",
        },
    evidence: {
      audit,
      description,
    },
  }
}
