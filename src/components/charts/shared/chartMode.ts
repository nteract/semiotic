import type {
  ChartMode,
  LinkedHoverProp,
  MobileInteractionProp,
  ResolvedMobileInteractionConfig,
} from "./types"
import type { MobileVisualizationContract } from "./auditMobileVisualization"
import { resolveResponsiveRules } from "./responsiveRules"
import type { ResponsiveRule } from "./responsiveRules"

export const MOBILE_INTERACTION_TARGET_SIZE = 44
export const MOBILE_INTERACTION_MIN_HIT_RADIUS = 24

export const MOBILE_INTERACTION_DEFAULTS: ResolvedMobileInteractionConfig = {
  enabled: true,
  tapToSelect: true,
  tapToLockTooltip: true,
  clearSelection: "backgroundTap",
  targetSize: MOBILE_INTERACTION_TARGET_SIZE,
  snap: "nearestDatum",
  brushHandleSize: MOBILE_INTERACTION_TARGET_SIZE,
  standardControls: false,
}

export const DISABLED_MOBILE_INTERACTION: ResolvedMobileInteractionConfig = {
  ...MOBILE_INTERACTION_DEFAULTS,
  enabled: false,
  tapToSelect: false,
  tapToLockTooltip: false,
}

export function resolveMobileInteraction(
  input: MobileInteractionProp | undefined,
  context: {
    mode?: ChartMode
    width?: number
    mobileSemantics?: MobileVisualizationContract
  } = {},
): ResolvedMobileInteractionConfig {
  const semanticInteraction = context.mobileSemantics?.interaction
  const semanticTarget =
    typeof semanticInteraction?.targetSize === "number"
      ? semanticInteraction.targetSize
      : typeof context.mobileSemantics?.minimumHitTarget === "number"
        ? context.mobileSemantics.minimumHitTarget
        : undefined
  const inferredMobile = context.mode === "mobile" || (typeof context.width === "number" && context.width <= 480)
  const hasSemanticInteraction = !!semanticInteraction || semanticTarget !== undefined
  const config = input && typeof input === "object" ? input : undefined
  const enabled =
    input !== false &&
    config?.enabled !== false &&
    (input !== undefined || inferredMobile || hasSemanticInteraction)

  if (!enabled) return DISABLED_MOBILE_INTERACTION

  const mobileConfig = config ?? {}
  return {
    enabled: true,
    tapToSelect: mobileConfig.tapToSelect ?? true,
    tapToLockTooltip: mobileConfig.tapToLockTooltip ?? true,
    clearSelection: mobileConfig.clearSelection ?? "backgroundTap",
    targetSize: mobileConfig.targetSize ?? semanticTarget ?? MOBILE_INTERACTION_TARGET_SIZE,
    snap: mobileConfig.snap ?? "nearestDatum",
    brushHandleSize: mobileConfig.brushHandleSize ?? MOBILE_INTERACTION_TARGET_SIZE,
    standardControls: mobileConfig.standardControls ?? false,
  }
}

const MODE_DEFAULTS = {
  primary: {
    width: 600, height: 400,
    showAxes: true, showGrid: false, enableHover: true,
    showLegend: undefined as boolean | undefined,
    showLabels: undefined as boolean | undefined,
    marginDefaults: { top: 50, bottom: 60, left: 70, right: 40 },
  },
  context: {
    width: 400, height: 250,
    showAxes: false, showGrid: false, enableHover: false,
    showLegend: false as boolean | undefined,
    showLabels: false as boolean | undefined,
    marginDefaults: { top: 10, bottom: 10, left: 10, right: 10 },
  },
  sparkline: {
    width: 120, height: 24,
    showAxes: false, showGrid: false, enableHover: false,
    showLegend: false as boolean | undefined,
    showLabels: false as boolean | undefined,
    marginDefaults: { top: 2, bottom: 2, left: 0, right: 0 },
  },
  mobile: {
    width: 390, height: 300,
    showAxes: true, showGrid: false, enableHover: true,
    showLegend: false as boolean | undefined,
    showLabels: true as boolean | undefined,
    marginDefaults: { top: 28, bottom: 42, left: 44, right: 16 },
  },
}

/** Runtime guard for public prop bags where `mode` may be chart-specific. */
export function isChartMode(value: unknown): value is ChartMode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(MODE_DEFAULTS, value)
}

export interface ChartModeInput {
  width?: number
  height?: number
  showAxes?: boolean
  showGrid?: boolean
  enableHover?: boolean
  showLegend?: boolean
  showLabels?: boolean
  showCategoryTicks?: boolean
  orientation?: string
  title?: string
  description?: string
  summary?: string
  accessibleTable?: boolean
  xLabel?: string
  yLabel?: string
  categoryLabel?: string
  valueLabel?: string
  linkedHover?: LinkedHoverProp
  mobileInteraction?: MobileInteractionProp
  mobileSemantics?: MobileVisualizationContract
  responsiveRules?: ResponsiveRule[]
}

export interface ChartModeResult {
  /** Effective mode after responsive rules have been applied. */
  mode: ChartMode
  width: number
  height: number
  showAxes: boolean
  showGrid: boolean
  enableHover: boolean
  showLegend: boolean | undefined
  showLabels: boolean | undefined
  title: string | undefined
  description: string | undefined
  summary: string | undefined
  accessibleTable: boolean | undefined
  xLabel: string | undefined
  yLabel: string | undefined
  categoryLabel: string | undefined
  valueLabel: string | undefined
  marginDefaults: { top: number; bottom: number; left: number; right: number }
  compactMode: boolean
  mobileInteraction: ResolvedMobileInteractionConfig
  mobileSemantics: MobileVisualizationContract | undefined
}

export function resolveChartMode(
  mode: ChartMode | undefined,
  userProps: ChartModeInput,
  primaryDefaults?: { width?: number; height?: number },
): ChartModeResult {
  const baseMode = mode || "primary"
  const baseDefaults = MODE_DEFAULTS[baseMode]
  const baseWidth = (!mode || mode === "primary") && primaryDefaults?.width ? primaryDefaults.width : baseDefaults.width
  const baseHeight = (!mode || mode === "primary") && primaryDefaults?.height ? primaryDefaults.height : baseDefaults.height
  const responsiveBase = { ...userProps, mode } as ChartModeInput & Record<string, unknown>
  const responsiveProps = resolveResponsiveRules(responsiveBase, {
    width: userProps.width ?? baseWidth,
    height: userProps.height ?? baseHeight,
  }).props as ChartModeInput & { mode?: ChartMode }
  const resolvedMode = responsiveProps.mode || mode || "primary"
  const defaults = MODE_DEFAULTS[resolvedMode]
  const suppressLabels = resolvedMode === "context" || resolvedMode === "sparkline"
  const defaultWidth = resolvedMode === "primary" && primaryDefaults?.width ? primaryDefaults.width : defaults.width
  const defaultHeight = resolvedMode === "primary" && primaryDefaults?.height ? primaryDefaults.height : defaults.height
  return {
    mode: resolvedMode,
    width: responsiveProps.width ?? defaultWidth,
    height: responsiveProps.height ?? defaultHeight,
    showAxes: responsiveProps.showAxes ?? defaults.showAxes,
    showGrid: responsiveProps.showGrid ?? defaults.showGrid,
    enableHover: responsiveProps.enableHover ?? (responsiveProps.linkedHover ? true : defaults.enableHover),
    showLegend: responsiveProps.showLegend ?? defaults.showLegend,
    showLabels: responsiveProps.showLabels ?? defaults.showLabels,
    title: suppressLabels ? undefined : responsiveProps.title,
    description: responsiveProps.description,
    summary: responsiveProps.summary,
    accessibleTable: responsiveProps.accessibleTable,
    xLabel: suppressLabels ? undefined : responsiveProps.xLabel,
    yLabel: suppressLabels ? undefined : responsiveProps.yLabel,
    categoryLabel: suppressLabels ? undefined : responsiveProps.categoryLabel,
    valueLabel: suppressLabels ? undefined : responsiveProps.valueLabel,
    marginDefaults: adjustMarginsForCategoryTicks(defaults.marginDefaults, responsiveProps.showCategoryTicks, responsiveProps.orientation),
    compactMode: suppressLabels,
    mobileInteraction: resolveMobileInteraction(responsiveProps.mobileInteraction, {
      mode: resolvedMode,
      width: responsiveProps.width ?? defaultWidth,
      mobileSemantics: responsiveProps.mobileSemantics,
    }),
    mobileSemantics: responsiveProps.mobileSemantics,
  }
}

const AXIS_FREE_MARGIN_DEFAULTS = { top: 10, bottom: 10, left: 10, right: 10 }

/**
 * Axis-free charts keep their established 10px regular-mode inset while
 * adopting the shared context/sparkline margins. Reading `resolved` here is
 * important: responsive rules may have changed the effective chart mode.
 */
export function resolveAxisFreeMarginDefaults(
  resolved: Pick<ChartModeResult, "compactMode" | "marginDefaults">,
): ChartModeResult["marginDefaults"] {
  return resolved.compactMode ? resolved.marginDefaults : AXIS_FREE_MARGIN_DEFAULTS
}

function adjustMarginsForCategoryTicks(
  defaults: { top: number; bottom: number; left: number; right: number },
  showCategoryTicks: boolean | undefined,
  orientation: string | undefined,
): { top: number; bottom: number; left: number; right: number } {
  if (showCategoryTicks !== false) return defaults
  const adjusted = { ...defaults }
  if (orientation === "horizontal") adjusted.left = Math.min(adjusted.left, 15)
  else adjusted.bottom = Math.min(adjusted.bottom, 15)
  return adjusted
}
