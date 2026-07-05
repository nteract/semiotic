import type { Datum } from "./datumTypes"
import { resolveResponsiveRules } from "./responsiveRules"

/**
 * auditMobileVisualization - static mobile-readiness triage for Semiotic chart
 * configurations.
 *
 * This is deliberately conservative: it does not inspect the DOM, resolved CSS,
 * measured labels, rendered annotation boxes, or real input behavior. It flags
 * risks that can be inferred from config/data and routes the rest to manual
 * mobile review. Treat it like auditAccessibility: useful before render, useful
 * for agents, not a certification.
 */

export type MobileAuditStatus = "pass" | "warn" | "manual" | "not-applicable"

export type MobileAuditCategory =
  | "layout"
  | "density"
  | "interaction"
  | "annotation"
  | "semantics"

export type MobileAuditImpact = "high" | "medium" | "low"

export interface MobileVisualizationFinding {
  /** Stable id, e.g. "layout.fixed-desktop-size". */
  id: string
  category: MobileAuditCategory
  status: MobileAuditStatus
  impact: MobileAuditImpact
  message: string
  fix?: string
}

export interface MobileVisualizationAuditResult {
  component: string
  viewportWidth: number
  /** True when no high-impact warning is present. */
  ok: boolean
  summary: {
    highRisk: number
    warnings: number
    manual: number
    passes: number
  }
  findings: MobileVisualizationFinding[]
  reference: string
}

export interface AuditMobileVisualizationOptions {
  /**
   * Width to audit against. Defaults to 390px, a common modern phone CSS
   * viewport width. Run multiple widths in CI for stronger coverage.
   */
  viewportWidth?: number
  /**
   * Minimum acceptable pointer target. WCAG 2.2 Target Size (Minimum) is 24px;
   * 44px is the comfortable phone target used here by default.
   */
  targetSize?: number
  /**
   * Whether the chart is wrapped in a container that can provide summary text,
   * controls, caption, download/copy affordances, or a details panel.
   */
  inChartContainer?: boolean
}

export interface MobileVisualizationInteractionContract {
  primary?: string
  alternatives?: string[]
  hoverFallback?: string
  targetSize?: number
}

export interface MobileVisualizationLabelContract {
  strategy?: string
  minFontSize?: number
}

export interface MobileVisualizationCustomContract {
  dataBearingSceneNodes?: boolean
  stableIds?: boolean
  navigationGranularity?: string
}

export interface MobileVisualizationContract {
  strategy?: string
  responsive?: boolean
  supportsResponsiveLayout?: boolean
  breakpoints?: number[]
  minViewportWidth?: number
  maxMarks?: number
  maxAnnotations?: number
  minimumHitTarget?: number
  summary?: boolean | string
  interaction?: MobileVisualizationInteractionContract
  labels?: MobileVisualizationLabelContract
  custom?: MobileVisualizationCustomContract
}

const REFERENCE =
  "Mobile visualization audit: informed by MobileVisFixer, mobile exploratory interaction research, small-multiple mobile studies, responsive visualization grammars, constraint-based breakpoints, and WCAG 2.2 input modalities."

const XY_CHARTS = new Set([
  "LineChart",
  "AreaChart",
  "DifferenceChart",
  "StackedAreaChart",
  "Scatterplot",
  "ConnectedScatterplot",
  "BubbleChart",
  "QuadrantChart",
  "MultiAxisLineChart",
  "CandlestickChart",
  "Heatmap",
  "MinimapChart",
  "RealtimeLineChart",
  "RealtimeHeatmap",
])

const ORDINAL_CHARTS = new Set([
  "BarChart",
  "StackedBarChart",
  "GroupedBarChart",
  "SwarmPlot",
  "BoxPlot",
  "Histogram",
  "ViolinPlot",
  "DotPlot",
  "RidgelinePlot",
  "FunnelChart",
  "LikertChart",
  "SwimlaneChart",
])

const POINT_RADIUS_PROPS: Record<string, string[]> = {
  Scatterplot: ["pointRadius", "hoverRadius"],
  BubbleChart: ["pointRadius", "hoverRadius"],
  ConnectedScatterplot: ["pointRadius", "hoverRadius"],
  QuadrantChart: ["pointRadius", "hoverRadius"],
  SwarmPlot: ["pointRadius", "hoverRadius"],
  DotPlot: ["dotRadius", "hoverRadius"],
}

function isObject(value: unknown): value is Datum {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function mobileContract(props: Datum): MobileVisualizationContract | null {
  const capability = isObject(props.capability) ? props.capability : null
  const recipe = isObject(props.recipe) ? props.recipe : null
  const candidates = [
    props.mobileSemantics,
    props.mobileVisualization,
    props.mobile,
    capability?.mobile,
    recipe?.mobile,
  ]
  for (const candidate of candidates) {
    if (isObject(candidate)) return candidate as MobileVisualizationContract
  }
  return null
}

function isCustomish(component: string, props: Datum): boolean {
  return (
    component.includes("CustomChart") ||
    component.includes("Custom") ||
    props.recipeId != null ||
    props.mobileSemantics != null
  )
}

function numericTuple(value: unknown): [number, number] | null {
  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  ) {
    return [value[0], value[1]]
  }
  return null
}

function chartSize(props: Datum): [number, number] | null {
  return (
    numericTuple(props.size) ||
    numericTuple(isObject(props.frameProps) ? props.frameProps.size : undefined) ||
    (typeof props.width === "number" && typeof props.height === "number"
      ? [props.width, props.height]
      : null)
  )
}

function hasResponsiveTransformHint(props: Datum): boolean {
  const contract = mobileContract(props)
  return (
    props.responsive === true ||
    props.mobile === true ||
    contract?.responsive === true ||
    contract?.supportsResponsiveLayout === true ||
    Array.isArray(contract?.breakpoints) ||
    typeof contract?.minViewportWidth === "number" ||
    contract?.strategy === "responsive" ||
    contract?.strategy === "small-multiples" ||
    contract?.strategy === "summary-cards" ||
    props.mobileLayout != null ||
    props.responsiveRules != null ||
    props.density === "mobile-readable"
  )
}

function hasAlternativeControls(props: Datum): boolean {
  const contract = mobileContract(props)
  const mobileInteraction = isObject(props.mobileInteraction) ? props.mobileInteraction : null
  return (
    props.controls != null ||
    props.mobileControls != null ||
    props.alternativeControls === true ||
    props.selection != null ||
    props.onClick != null ||
    props.onSelect != null ||
    props.mobileInteraction === true ||
    mobileInteraction?.tapToSelect === true ||
    mobileInteraction?.tapToLockTooltip === true ||
    (Array.isArray(contract?.interaction?.alternatives) && contract.interaction.alternatives.length > 0) ||
    contract?.interaction?.primary === "tap" ||
    contract?.interaction?.primary === "button" ||
    isNonEmptyString(contract?.interaction?.hoverFallback)
  )
}

function hasComplexGestureAlternative(props: Datum, actions: string[]): boolean {
  const contract = mobileContract(props)
  const mobileInteraction = isObject(props.mobileInteraction) ? props.mobileInteraction : null
  const standardControls = mobileInteraction?.standardControls
  const semanticAlternatives =
    Array.isArray(contract?.interaction?.alternatives) &&
    contract.interaction.alternatives.length > 0
  const explicitControls =
    props.controls != null ||
    props.mobileControls != null ||
    props.alternativeControls === true ||
    semanticAlternatives

  if (explicitControls) return true
  if (standardControls === true || standardControls === "all") return true
  return actions.every((action) => {
    if (action === "brush") {
      return Array.isArray(standardControls)
        ? standardControls.includes("brush")
        : standardControls === "brush"
    }
    if (action === "pan/zoom") {
      return Array.isArray(standardControls)
        ? standardControls.includes("zoom")
        : standardControls === "zoom"
    }
    if (action === "legend filtering") {
      return Array.isArray(standardControls)
        ? standardControls.includes("legend")
        : standardControls === "legend"
    }
    return false
  })
}

function hasHoverOnlyDetail(props: Datum): boolean {
  const frameProps = isObject(props.frameProps) ? props.frameProps : {}
  const hasTooltip =
    props.enableHover === true ||
    props.tooltipContent != null ||
    props.tooltip != null ||
    frameProps.tooltipContent != null ||
    frameProps.enableHover === true
  return hasTooltip && !hasAlternativeControls(props)
}

function countDataRows(props: Datum): number {
  const candidates = [
    props.data,
    props.points,
    props.lines,
    props.nodes,
    props.edges,
    props.areas,
    isObject(props.frameProps) ? props.frameProps.data : undefined,
  ]
  let total = 0
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue
    total += candidate.length
  }
  return total
}

function explicitTickCount(props: Datum): number | null {
  const values = [
    props.tickValues,
    props.xTickValues,
    props.yTickValues,
    props.rTickValues,
    props.oTickValues,
  ]
  let total = 0
  for (const value of values) {
    if (Array.isArray(value)) total += value.length
  }
  return total > 0 ? total : null
}

function minimumPointerTarget(component: string, props: Datum): number | null {
  const radiusProps = POINT_RADIUS_PROPS[component]
  if (!radiusProps) return null

  let largestRadius: number | null = radiusProps.includes("hoverRadius") ? 30 : null
  for (const prop of radiusProps) {
    const value = props[prop]
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      largestRadius = largestRadius == null ? value : Math.max(largestRadius, value)
    }
  }
  return largestRadius == null ? null : largestRadius * 2
}

function pushPass(findings: MobileVisualizationFinding[], finding: Omit<MobileVisualizationFinding, "status">) {
  findings.push({ ...finding, status: "pass" })
}

function pushWarn(findings: MobileVisualizationFinding[], finding: Omit<MobileVisualizationFinding, "status">) {
  findings.push({ ...finding, status: "warn" })
}

function pushManual(findings: MobileVisualizationFinding[], finding: Omit<MobileVisualizationFinding, "status">) {
  findings.push({ ...finding, status: "manual" })
}

/**
 * Audit a Semiotic chart config for likely mobile visualization problems.
 * Pure, SSR-safe, no DOM.
 */
export function auditMobileVisualization(
  component: string,
  props: Datum = {},
  options: AuditMobileVisualizationOptions = {}
): MobileVisualizationAuditResult {
  const viewportWidth = options.viewportWidth ?? 390
  const targetSize = options.targetSize ?? 44
  const initialSize = chartSize(props)
  const responsiveResult = resolveResponsiveRules(props, {
    width: viewportWidth,
    height: initialSize?.[1],
  })
  props = responsiveResult.props
  const findings: MobileVisualizationFinding[] = []
  const size = chartSize(props)
  const contract = mobileContract(props)
  const customish = isCustomish(component, props)
  const responsiveHint = hasResponsiveTransformHint(props)
  const inContainer = options.inChartContainer === true
  const hasTextSummary =
    isNonEmptyString(props.title) ||
    isNonEmptyString(props.summary) ||
    isNonEmptyString(props.description) ||
    contract?.summary === true ||
    isNonEmptyString(contract?.summary)

  if (responsiveResult.matches.length > 0) {
    pushPass(findings, {
      id: "layout.responsive-rule-applied",
      category: "layout",
      impact: "medium",
      message: `${responsiveResult.matches.length} responsive rule(s) applied for the ${viewportWidth}px mobile audit.`,
    })
  }

  if (size) {
    const [width, height] = size
    if (width > viewportWidth && !responsiveHint) {
      pushWarn(findings, {
        id: "layout.fixed-desktop-size",
        category: "layout",
        impact: "high",
        message: `Chart size is ${width}px wide against a ${viewportWidth}px mobile viewport with no responsive/mobile transform hint.`,
        fix: "Use responsive sizing, responsiveRules/mobileLayout, or an explicit mobile variant that preserves the task instead of clipping the desktop chart.",
      })
    } else {
      pushPass(findings, {
        id: "layout.fixed-desktop-size",
        category: "layout",
        impact: "high",
        message: "No fixed desktop-width overflow risk is visible from the config.",
      })
    }

    if (
      typeof contract?.minViewportWidth === "number" &&
      contract.minViewportWidth > viewportWidth
    ) {
      pushWarn(findings, {
        id: "layout.mobile-min-width",
        category: "layout",
        impact: "high",
        message: `The declared mobile contract supports ${contract.minViewportWidth}px minimum, wider than the audited ${viewportWidth}px viewport.`,
        fix: "Add a narrower breakpoint, summary-card fallback, or explicit horizontal-scroll affordance with a non-visual equivalent.",
      })
    }

    const aspect = width / Math.max(1, height)
    if (viewportWidth <= 430 && aspect > 2.4 && component !== "BigNumber") {
      pushWarn(findings, {
        id: "layout.wide-aspect-ratio",
        category: "layout",
        impact: "medium",
        message: `Chart aspect ratio is ${aspect.toFixed(1)}:1, which tends to compress phone charts vertically.`,
        fix: "Prefer stacked sections, small multiples, cards plus a sparkline, or a taller mobile-specific chart ratio.",
      })
    }

    if (height < 160 && component !== "BigNumber") {
      pushWarn(findings, {
        id: "layout.too-short-for-reading",
        category: "layout",
        impact: "medium",
        message: `Chart height is ${height}px; most phone charts need enough vertical room for marks plus readable labels.`,
        fix: "Reserve more vertical space, remove nonessential axes, or switch to a card/sparkline pattern with external labels.",
      })
    }
  } else {
    pushManual(findings, {
      id: "layout.unknown-size",
      category: "layout",
      impact: "medium",
      message: "No explicit size is available to audit. This may be responsive, but static mobile overflow cannot be checked.",
      fix: "Audit rendered widths at 320, 360, 390, and 430px, or pass size/responsiveRules metadata into the config.",
    })
  }

  const rows = countDataRows(props)
  if (rows > 0) {
    const rowBudget = typeof contract?.maxMarks === "number"
      ? contract.maxMarks
      : XY_CHARTS.has(component)
        ? viewportWidth * 1.25
        : ORDINAL_CHARTS.has(component)
          ? Math.max(8, Math.floor(viewportWidth / 34))
          : viewportWidth
    if (rows > rowBudget) {
      pushWarn(findings, {
        id: "density.mark-budget",
        category: "density",
        impact: XY_CHARTS.has(component) ? "medium" : "high",
        message: `${rows} data item(s) exceed the rough mobile density budget for ${component} at ${viewportWidth}px.`,
        fix: "Aggregate, filter, facet into small multiples, switch to a summary-card plus detail view, or use progressive disclosure.",
      })
    } else {
      pushPass(findings, {
        id: "density.mark-budget",
        category: "density",
        impact: "medium",
        message: `${rows} data item(s) are within the rough mobile density budget for this component.`,
      })
    }
  }

  const tickCount = explicitTickCount(props)
  const axesShown = props.showAxes !== false && props.axis !== false
  if (axesShown && tickCount != null) {
    const tickBudget = Math.max(3, Math.floor(viewportWidth / 58))
    if (tickCount > tickBudget) {
      pushWarn(findings, {
        id: "density.explicit-tick-count",
        category: "density",
        impact: "medium",
        message: `${tickCount} explicit tick(s) exceed a phone-friendly budget of about ${tickBudget} at ${viewportWidth}px.`,
        fix: "Use adaptive ticks, fewer tickValues, direct labels, or move exact values into a tap-accessible detail panel.",
      })
    }
  } else if (axesShown && (XY_CHARTS.has(component) || ORDINAL_CHARTS.has(component))) {
    pushManual(findings, {
      id: "density.axis-label-collision",
      category: "density",
      impact: "medium",
      message: "Axes are enabled, but label collision depends on rendered tick text and cannot be checked statically.",
      fix: "Verify tick labels at phone widths or provide explicit mobile tick density.",
    })
  }

  if (hasHoverOnlyDetail(props)) {
    pushWarn(findings, {
      id: "interaction.hover-only-detail",
      category: "interaction",
      impact: "high",
      message: "The chart exposes tooltip/hover detail without an obvious tap, selection, or control alternative.",
      fix: "Enable tap-to-select, a persistent details panel, visible segment buttons, or another non-hover path for the same information.",
    })
  } else {
    pushPass(findings, {
      id: "interaction.hover-only-detail",
      category: "interaction",
      impact: "high",
      message: "No hover-only detail path is visible from the config.",
    })
  }

  const pointerTarget = minimumPointerTarget(component, props)
  const mobileInteraction = isObject(props.mobileInteraction) ? props.mobileInteraction : null
  const declaredPointerTarget =
    typeof mobileInteraction?.targetSize === "number"
      ? mobileInteraction.targetSize
      : props.mobileInteraction === true
        ? 44
        : typeof contract?.minimumHitTarget === "number"
          ? contract.minimumHitTarget
          : typeof contract?.interaction?.targetSize === "number"
            ? contract.interaction.targetSize
            : null
  const effectivePointerTarget = pointerTarget ?? declaredPointerTarget
  if (effectivePointerTarget != null) {
    if (effectivePointerTarget < 24) {
      pushWarn(findings, {
        id: "interaction.target-size-minimum",
        category: "interaction",
        impact: "high",
        message: `Small interactive marks expose an estimated ${effectivePointerTarget}px pointer target, below WCAG's 24px minimum.`,
        fix: "Increase mark radius/hoverRadius, add tap snapping to nearest datum, or provide larger external controls.",
      })
    } else if (effectivePointerTarget < targetSize) {
      pushWarn(findings, {
        id: "interaction.target-size-comfort",
        category: "interaction",
        impact: "medium",
        message: `Pointer target is about ${effectivePointerTarget}px, above 24px but below the ${targetSize}px comfortable phone target.`,
        fix: "Use hoverRadius/tapRadius near 44px while keeping the visible mark small if needed.",
      })
    } else {
      pushPass(findings, {
        id: "interaction.target-size-comfort",
        category: "interaction",
        impact: "medium",
        message: `Pointer target is about ${effectivePointerTarget}px, meeting the configured ${targetSize}px target.`,
      })
    }
  }

  const complexActions: string[] = []
  if (props.brush != null || props.onBrush != null) complexActions.push("brush")
  if (props.zoomable === true) complexActions.push("pan/zoom")
  if (props.legendInteraction === "isolate" || props.legendInteraction === "highlight") {
    complexActions.push("legend filtering")
  }
  if (complexActions.length > 0 && !hasComplexGestureAlternative(props, complexActions)) {
    pushWarn(findings, {
      id: "interaction.complex-gesture-alternative",
      category: "interaction",
      impact: "high",
      message: `Mobile-hostile complex interaction detected: ${complexActions.join(", ")} without standard control alternatives.`,
      fix: "Pair gestures with buttons, range inputs, chips, or a details panel that works with touch and keyboard.",
    })
  }

  const usesLegend =
    props.showLegend !== false &&
    props.legend !== false &&
    (
      props.showLegend === true ||
      props.legend === true ||
      props.colorBy != null ||
      props.groupBy != null ||
      props.lineBy != null ||
      props.areaBy != null ||
      props.stackBy != null
    )
  const directLabel =
    props.directLabel === true ||
    props.showLabels === true ||
    props.labelStrategy === "direct" ||
    props.labelStrategy === "direct-end" ||
    contract?.labels?.strategy === "direct" ||
    contract?.labels?.strategy === "inline" ||
    contract?.labels?.strategy === "external"
  if (usesLegend && !directLabel && viewportWidth <= 430) {
    pushWarn(findings, {
      id: "semantics.legend-over-direct-labels",
      category: "semantics",
      impact: "medium",
      message: "The chart appears to rely on a legend instead of direct labels at phone width.",
      fix: "Prefer direct end labels, inline labels, or a compact chip selector so readers do not bounce between plot and legend.",
    })
  }

  const annotations = Array.isArray(props.annotations)
    ? props.annotations.filter((annotation): annotation is Datum => isObject(annotation))
    : []
  const maxAnnotations = typeof contract?.maxAnnotations === "number" ? contract.maxAnnotations : 3
  if (annotations.length > maxAnnotations && viewportWidth <= 430) {
    pushWarn(findings, {
      id: "annotation.mobile-density",
      category: "annotation",
      impact: "medium",
      message: `${annotations.length} annotation(s) compete for phone plot space.`,
      fix: "Assign annotation priority, collapse secondary notes into a callout list, or provide shorter mobileText.",
    })
  }
  if (annotations.length > 0) {
    const missingMobileText = annotations.filter((annotation) =>
      !isNonEmptyString(annotation.mobileText) &&
      !isNonEmptyString(annotation.shortText) &&
      !isNonEmptyString(annotation.label)
    )
    if (missingMobileText.length > 0) {
      pushManual(findings, {
        id: "annotation.mobile-copy",
        category: "annotation",
        impact: "low",
        message: `${missingMobileText.length} annotation(s) lack explicit short/mobile copy.`,
        fix: "Add mobileText or shortText for notes that need to survive narrow layouts.",
      })
    }
  }

  if (!responsiveHint && component !== "BigNumber") {
    pushManual(findings, {
      id: "layout.no-responsive-transform",
      category: "layout",
      impact: "low",
      message: "No explicit responsive transformation hint is present.",
      fix: "Declare responsiveRules/mobileLayout or a density/label strategy so the mobile version is a designed transformation, not an accidental resize.",
    })
  }

  if (customish) {
    if (contract) {
      pushPass(findings, {
        id: "semantics.custom-mobile-contract",
        category: "semantics",
        impact: "medium",
        message: "Custom chart/recipe provides a mobileSemantics/mobile contract, so the audit can inspect its authored phone behavior.",
      })
      if (contract.custom?.dataBearingSceneNodes === false) {
        pushWarn(findings, {
          id: "semantics.custom-data-bearing-scene",
          category: "semantics",
          impact: "medium",
          message: "Custom mobile contract says emitted scene nodes are not data-bearing.",
          fix: "Preserve datum references, semantic roles, or accessible-table fields so intelligence, navigation, and tap details can recover the chart's meaning.",
        })
      } else if (contract.custom?.dataBearingSceneNodes !== true) {
        pushManual(findings, {
          id: "semantics.custom-data-bearing-scene",
          category: "semantics",
          impact: "low",
          message: "Custom chart mobile contract does not state whether scene nodes are data-bearing.",
          fix: "Set mobile.custom.dataBearingSceneNodes and mobile.custom.navigationGranularity for custom layouts and interoperability adapters.",
        })
      }
    } else {
      pushManual(findings, {
        id: "semantics.custom-mobile-contract",
        category: "semantics",
        impact: "medium",
        message: "Custom chart layout is opaque to static mobile analysis because no mobileSemantics/mobile contract is present.",
        fix: "Declare mobileSemantics with strategy, breakpoints, mark budgets, touch target size, interaction alternatives, and custom scene semantics.",
      })
    }
  }

  if (!hasTextSummary && !inContainer) {
    pushWarn(findings, {
      id: "semantics.no-mobile-summary",
      category: "semantics",
      impact: "medium",
      message: "No title, summary, description, or ChartContainer context is visible from the config.",
      fix: "Add title/summary text or wrap in ChartContainer so the small-screen reader gets the task before the chart.",
    })
  }

  const warnings = findings.filter((finding) => finding.status === "warn")
  const summary = {
    highRisk: warnings.filter((finding) => finding.impact === "high").length,
    warnings: warnings.length,
    manual: findings.filter((finding) => finding.status === "manual").length,
    passes: findings.filter((finding) => finding.status === "pass").length,
  }

  return {
    component,
    viewportWidth,
    ok: summary.highRisk === 0,
    summary,
    findings,
    reference: REFERENCE,
  }
}

const STATUS_LABEL: Record<MobileAuditStatus, string> = {
  pass: "PASS",
  warn: "WARN",
  manual: "MANUAL",
  "not-applicable": "N/A",
}

const CATEGORY_ORDER: MobileAuditCategory[] = [
  "layout",
  "density",
  "interaction",
  "annotation",
  "semantics",
]

/** Render a mobile visualization audit result as a plain-text report. */
export function formatMobileVisualizationAudit(result: MobileVisualizationAuditResult): string {
  const lines: string[] = []
  const s = result.summary
  const verdict = result.ok
    ? `no high-risk mobile blockers at ${result.viewportWidth}px`
    : `${s.highRisk} high-risk mobile issue(s) at ${result.viewportWidth}px`
  lines.push(`${result.ok ? "PASS" : "WARN"} ${result.component}: mobile visualization audit`)
  lines.push(`  ${verdict} - ${s.warnings} warning(s) - ${s.manual} manual check(s)`)

  for (const category of CATEGORY_ORDER) {
    const group = result.findings.filter((finding) => finding.category === category && finding.status !== "not-applicable")
    if (group.length === 0) continue
    lines.push("")
    lines.push(`  ${category.toUpperCase()}`)
    for (const finding of group) {
      lines.push(`    ${STATUS_LABEL[finding.status]} [${finding.impact}] ${finding.id}: ${finding.message}`)
      if (finding.fix && (finding.status === "warn" || finding.status === "manual")) {
        lines.push(`        -> ${finding.fix}`)
      }
    }
  }

  lines.push("")
  lines.push(`  Ref: ${result.reference}`)
  return lines.join("\n")
}

export function mobileVisualizationCaveats(): string[] {
  return [
    "Static audit only: rendered label collision, CSS-resolved type size, and actual touch behavior still require viewport testing.",
    "Use multiple widths, usually 320, 360, 390, 430, and 768 CSS pixels.",
    "A mobile pass means no high-risk static warnings, not that the chart is perceptually or ergonomically optimal.",
  ]
}
